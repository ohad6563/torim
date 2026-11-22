-- ============================================================
-- 0004: free push notifications (Expo push service)
--   * confirmation right after an appointment is booked
--   * reminder the day before (24h) and two hours before
-- Cancelling removes pending reminders; moving an appointment reschedules them.
-- A pg_cron job sends due notifications every minute through pg_net.
-- Run once in the Supabase SQL editor, after 0003. Safe to re-run.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ------------------------------------------------------------
-- Device push tokens (one account can have several devices)
-- ------------------------------------------------------------
create table if not exists public.push_tokens (
  token      text primary key check (token like 'ExponentPushToken[%' or token like 'ExpoPushToken[%'),
  user_id    uuid not null references auth.users (id) on delete cascade,
  platform   text check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
drop policy if exists "own tokens read" on public.push_tokens;
drop policy if exists "own tokens delete" on public.push_tokens;
create policy "own tokens read"   on public.push_tokens for select using (user_id = auth.uid());
create policy "own tokens delete" on public.push_tokens for delete using (user_id = auth.uid());

-- Register this device for the signed-in account (a device moves to whoever signs in on it).
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  insert into push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

-- ------------------------------------------------------------
-- Queue of notifications to send
-- ------------------------------------------------------------
create table if not exists public.notification_queue (
  id             bigserial primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  kind           text not null check (kind in ('confirmation', 'updated', 'day_before', 'two_hours')),
  send_at        timestamptz not null,
  title          text not null,
  body           text not null,
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists notification_queue_due_idx on public.notification_queue (send_at) where sent_at is null;
alter table public.notification_queue enable row level security;  -- no policies: server only

-- "יום ראשון 23.11 בשעה 10:00" in the studio's timezone.
create or replace function public.he_when(p_ts timestamptz, p_tz text)
returns text language sql immutable
as $$
  select 'יום ' || (array['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'])[extract(dow from p_ts at time zone p_tz)::int + 1]
         || ' ' || to_char(p_ts at time zone p_tz, 'FMDD.FMMM') || ' בשעה ' || to_char(p_ts at time zone p_tz, 'HH24:MI');
$$;

-- (Re)build the pending notifications of one appointment.
create or replace function public.schedule_appointment_notifications()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
  v_biz  businesses%rowtype;
  v_when text;
  v_time text;
begin
  -- Pending (unsent) notifications are always rebuilt from scratch.
  delete from notification_queue where appointment_id = new.id and sent_at is null;

  if new.status <> 'booked' or new.starts_at <= now() then return new; end if;
  select user_id into v_user from customers where id = new.customer_id;
  if v_user is null then return new; end if;  -- walk-in customer without the app

  select * into v_biz from businesses where id = new.business_id;
  v_when := he_when(new.starts_at, v_biz.timezone);
  v_time := to_char(new.starts_at at time zone v_biz.timezone, 'HH24:MI');

  if tg_op = 'INSERT' then
    insert into notification_queue (appointment_id, user_id, kind, send_at, title, body)
    values (new.id, v_user, 'confirmation', now(), 'התור נקבע ✓',
            new.service_name || ' · ' || v_when || '. נתראה!');
  elsif new.starts_at is distinct from old.starts_at then
    insert into notification_queue (appointment_id, user_id, kind, send_at, title, body)
    values (new.id, v_user, 'updated', now(), 'התור עודכן',
            'התור ל' || new.service_name || ' הועבר ל' || v_when || '.');
  end if;

  if new.starts_at - interval '24 hours' > now() then
    insert into notification_queue (appointment_id, user_id, kind, send_at, title, body)
    values (new.id, v_user, 'day_before', new.starts_at - interval '24 hours', 'תזכורת לתור מחר',
            'מחר בשעה ' || v_time || ' · ' || new.service_name);
  end if;
  if new.starts_at - interval '2 hours' > now() then
    insert into notification_queue (appointment_id, user_id, kind, send_at, title, body)
    values (new.id, v_user, 'two_hours', new.starts_at - interval '2 hours', 'בעוד שעתיים',
            'בשעה ' || v_time || ' · ' || new.service_name || coalesce(' · ' || v_biz.address, ''));
  end if;
  return new;
exception when others then
  return new;  -- notifications must never block a booking
end;
$$;

drop trigger if exists appointment_notifications on public.appointments;
create trigger appointment_notifications
  after insert or update of starts_at, status on public.appointments
  for each row execute function public.schedule_appointment_notifications();

-- ------------------------------------------------------------
-- Sender: due notifications -> Expo push API (free), every minute
-- ------------------------------------------------------------
create or replace function public.send_due_notifications()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_ids      bigint[];
  v_messages jsonb;
  v_count    integer := 0;
  v_chunk    jsonb;
  i          integer;
begin
  -- Lock the due rows so overlapping runs never send twice.
  select array_agg(id) into v_ids from (
    select id from notification_queue
    where sent_at is null and send_at <= now()
    order by send_at
    limit 500
    for update skip locked
  ) due;
  if v_ids is null then return 0; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', q.title, 'body', q.body, 'sound', 'default',
           'channelId', 'reminders', 'data', jsonb_build_object('url', '/appointments'))), '[]'::jsonb)
  into v_messages
  from notification_queue q
  join push_tokens t on t.user_id = q.user_id
  where q.id = any (v_ids);

  -- Expo accepts up to 100 messages per request.
  i := 0;
  while i < jsonb_array_length(v_messages) loop
    select jsonb_agg(m) into v_chunk
    from (select m from jsonb_array_elements(v_messages) with ordinality as x(m, n) where n > i and n <= i + 100) c;
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := v_chunk,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
    );
    v_count := v_count + jsonb_array_length(v_chunk);
    i := i + 100;
  end loop;

  -- Marked as handled even for accounts without a device, so the queue never piles up.
  update notification_queue set sent_at = now() where id = any (v_ids);
  delete from notification_queue where sent_at < now() - interval '30 days';
  return v_count;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-push-reminders') then
    perform cron.unschedule('send-push-reminders');
  end if;
  perform cron.schedule('send-push-reminders', '* * * * *', 'select public.send_due_notifications()');
end;
$$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
revoke execute on function public.register_push_token(text, text) from public, anon;
grant  execute on function public.register_push_token(text, text) to authenticated;
revoke execute on function public.send_due_notifications() from public, anon, authenticated;
revoke execute on function public.schedule_appointment_notifications() from public, anon, authenticated;
