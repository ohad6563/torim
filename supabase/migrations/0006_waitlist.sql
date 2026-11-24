-- ============================================================
-- 0006: waitlist (רשימת המתנה)
--  * A customer joins the waitlist for a day (+ treatment, + part of the day)
--    when there's no time that suits her.
--  * When an appointment that day is cancelled, moved or deleted, everyone
--    waiting whose treatment now fits in a free time gets a push: "a slot
--    opened up" (first to book gets it). They stay on the list until they book.
--  * Studio admins get a push when someone joins, and see the list in the app
--    so they can call and find a solution.
-- Run once in the Supabase SQL editor, after 0005. Safe to re-run.
-- ============================================================

create table if not exists public.waitlist_entries (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  service_id       uuid references public.services (id) on delete set null,
  service_name     text not null,
  day              date not null,
  part             text not null default 'any' check (part in ('any', 'morning', 'noon', 'evening')),
  note             text check (char_length(note) <= 300),
  status           text not null default 'waiting' check (status in ('waiting', 'booked', 'handled', 'cancelled')),
  last_notified_at timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists waitlist_one_per_day
  on public.waitlist_entries (user_id, business_id, day, service_id) where status = 'waiting';
create index if not exists waitlist_business_day on public.waitlist_entries (business_id, day) where status = 'waiting';
alter table public.waitlist_entries enable row level security;  -- no policies: only through the functions below

-- Morning before 12:00, noon until 17:00, evening after (same split as the app's time wheel).
create or replace function public.part_of_day_matches(p_part text, p_ts timestamptz, p_tz text)
returns boolean language sql immutable
as $$
  select case p_part
    when 'morning' then (p_ts at time zone p_tz)::time < time '12:00'
    when 'noon'    then (p_ts at time zone p_tz)::time >= time '12:00' and (p_ts at time zone p_tz)::time < time '17:00'
    when 'evening' then (p_ts at time zone p_tz)::time >= time '17:00'
    else true end;
$$;

-- Push notifications that aren't about one appointment (waitlist) need a link of their own.
alter table public.notification_queue alter column appointment_id drop not null;
alter table public.notification_queue add column if not exists url text;
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue add constraint notification_queue_kind_check
  check (kind in ('confirmation', 'updated', 'day_before', 'two_hours', 'waitlist', 'waitlist_admin'));

-- ------------------------------------------------------------
-- Customer: join / leave / list
-- ------------------------------------------------------------
create or replace function public.join_waitlist(
  p_business_id uuid, p_service_id uuid, p_day date, p_part text default 'any', p_note text default null)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_biz   businesses%rowtype;
  v_svc   services%rowtype;
  v_today date;
  v_id    uuid;
  v_name  text;
  v_part  text := coalesce(nullif(p_part, ''), 'any');
begin
  if v_uid is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into v_biz from businesses where id = p_business_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_svc from services where id = p_service_id and business_id = p_business_id and is_active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
  if (select phone from profiles where id = v_uid) is null then raise exception 'PHONE_REQUIRED'; end if;
  if v_part not in ('any', 'morning', 'noon', 'evening') then raise exception 'INVALID_INPUT'; end if;

  v_today := (now() at time zone v_biz.timezone)::date;
  if p_day < v_today or p_day > v_today + v_biz.max_days_ahead then raise exception 'INVALID_DAY'; end if;
  if (select count(*) from waitlist_entries
      where user_id = v_uid and status = 'waiting' and day >= v_today) >= 5 then
    raise exception 'WAITLIST_LIMIT';
  end if;

  -- Already waiting for this day and treatment: update the part of day / note.
  update waitlist_entries set part = v_part, note = nullif(trim(p_note), '')
  where user_id = v_uid and business_id = p_business_id and day = p_day
    and service_id = p_service_id and status = 'waiting'
  returning id into v_id;
  if v_id is not null then return v_id; end if;

  insert into waitlist_entries (business_id, user_id, service_id, service_name, day, part, note)
  values (p_business_id, v_uid, p_service_id, v_svc.name, p_day, v_part, nullif(trim(p_note), ''))
  returning id into v_id;

  -- Tell the studio's admins (and owner) right away.
  select coalesce(full_name, 'לקוחה') into v_name from profiles where id = v_uid;
  insert into notification_queue (user_id, kind, send_at, title, body, url)
  select u, 'waitlist_admin', now(), 'נכנסה לרשימת ההמתנה',
         v_name || ' · ' || v_svc.name || ' · ' ||
         'יום ' || (array['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'])[extract(dow from p_day)::int + 1]
         || ' ' || to_char(p_day, 'FMDD.FMMM'),
         '/waitlist'
  from (select user_id as u from business_admins where business_id = p_business_id
        union select v_biz.owner_id) admins
  where u is not null and u <> v_uid;

  return v_id;
end;
$$;

create or replace function public.leave_waitlist(p_id uuid)
returns void
language sql volatile security definer set search_path = public
as $$
  update waitlist_entries set status = 'cancelled'
  where id = p_id and user_id = auth.uid() and status = 'waiting';
$$;

create or replace function public.my_waitlist()
returns table (id uuid, business_id uuid, service_id uuid, service_name text, day date, part text, note text,
               last_notified_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select w.id, w.business_id, w.service_id, w.service_name, w.day, w.part, w.note, w.last_notified_at, w.created_at
  from waitlist_entries w join businesses b on b.id = w.business_id
  where w.user_id = auth.uid() and w.status = 'waiting'
    and w.day >= (now() at time zone b.timezone)::date
  order by w.day, w.created_at;
$$;

-- ------------------------------------------------------------
-- Studio: list and mark as handled
-- ------------------------------------------------------------
create or replace function public.business_waitlist()
returns table (id uuid, service_id uuid, service_name text, day date, part text, note text, status text,
               last_notified_at timestamptz, created_at timestamptz, customer_name text, customer_phone text)
language sql stable security definer set search_path = public
as $$
  select w.id, w.service_id, w.service_name, w.day, w.part, w.note, w.status, w.last_notified_at, w.created_at,
         p.full_name, p.phone
  from waitlist_entries w
  join my_business() b on b.id = w.business_id
  left join profiles p on p.id = w.user_id
  where w.status = 'waiting' and w.day >= (now() at time zone b.timezone)::date
  order by w.day, w.created_at;
$$;

create or replace function public.set_waitlist_status(p_id uuid, p_status text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if p_status not in ('waiting', 'handled', 'cancelled') then raise exception 'INVALID_INPUT'; end if;
  update waitlist_entries w set status = p_status
  from my_business() b
  where w.id = p_id and w.business_id = b.id;
  if not found then raise exception 'NOT_FOUND'; end if;
end;
$$;

-- ------------------------------------------------------------
-- A time freed up -> notify whoever is waiting and now fits
-- ------------------------------------------------------------
create or replace function public.notify_waitlist_for_day(p_business_id uuid, p_day date)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_biz businesses%rowtype;
  r     record;
  v_when text;
begin
  select * into v_biz from businesses where id = p_business_id;
  if not found then return; end if;
  v_when := 'יום ' || (array['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'])[extract(dow from p_day)::int + 1]
            || ' ' || to_char(p_day, 'FMDD.FMMM');

  for r in
    select w.* from waitlist_entries w
    where w.business_id = p_business_id and w.day = p_day and w.status = 'waiting'
      and w.service_id is not null
      -- Don't ping the same person more than once every 10 minutes.
      and (w.last_notified_at is null or w.last_notified_at < now() - interval '10 minutes')
      and exists (select 1 from get_available_slots(p_business_id, w.service_id, p_day) s
                  where part_of_day_matches(w.part, s, v_biz.timezone))
  loop
    insert into notification_queue (user_id, kind, send_at, title, body, url)
    values (r.user_id, 'waitlist', now(), 'התפנה תור! 🎉',
            'התפנה תור ל' || r.service_name || ' ב' || v_when || '. מי שקובעת ראשונה מקבלת אותו.',
            '/book/' || v_biz.slug || '?service=' || r.service_id || '&day=' || to_char(p_day, 'YYYY-MM-DD'));
    update waitlist_entries set last_notified_at = now() where id = r.id;
  end loop;
end;
$$;

create or replace function public.waitlist_on_appointment_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_tz   text;
  v_user uuid;
begin
  -- A booking by someone on the list takes her off it.
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'booked' then
    select user_id into v_user from customers where id = new.customer_id;
    if v_user is not null then
      select timezone into v_tz from businesses where id = new.business_id;
      update waitlist_entries set status = 'booked'
      where user_id = v_user and business_id = new.business_id and status = 'waiting'
        and day = (new.starts_at at time zone v_tz)::date;
    end if;
  end if;

  -- A future booked time was freed (cancelled, moved or deleted).
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'booked' and old.starts_at > now()
     and (tg_op = 'DELETE' or new.status <> 'booked' or new.starts_at <> old.starts_at) then
    select timezone into v_tz from businesses where id = old.business_id;
    perform notify_waitlist_for_day(old.business_id, (old.starts_at at time zone v_tz)::date);
  end if;

  return coalesce(new, old);
exception when others then
  return coalesce(new, old);  -- the waitlist must never block a booking or a cancellation
end;
$$;

drop trigger if exists appointment_waitlist on public.appointments;
create trigger appointment_waitlist
  after insert or update of starts_at, status or delete on public.appointments
  for each row execute function public.waitlist_on_appointment_change();

-- Removing time off (a "חופשה") can open slots too.
create or replace function public.waitlist_on_time_off_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_tz text;
  d    date;
begin
  select timezone into v_tz from businesses where id = old.business_id;
  for d in
    select generate_series(greatest((old.starts_at at time zone v_tz)::date, (now() at time zone v_tz)::date),
                           (old.ends_at at time zone v_tz)::date, interval '1 day')::date
  loop
    perform notify_waitlist_for_day(old.business_id, d);
  end loop;
  return old;
exception when others then
  return old;
end;
$$;

drop trigger if exists time_off_waitlist on public.time_off;
create trigger time_off_waitlist
  after delete on public.time_off
  for each row execute function public.waitlist_on_time_off_delete();

-- ------------------------------------------------------------
-- Sender: use the notification's own link when it has one
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
           'channelId', 'reminders', 'data', jsonb_build_object('url', coalesce(q.url, '/appointments')))), '[]'::jsonb)
  into v_messages
  from notification_queue q
  join push_tokens t on t.user_id = q.user_id
  where q.id = any (v_ids);

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

  update notification_queue set sent_at = now() where id = any (v_ids);
  delete from notification_queue where sent_at < now() - interval '30 days';
  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
revoke execute on function public.join_waitlist(uuid, uuid, date, text, text) from public, anon;
grant  execute on function public.join_waitlist(uuid, uuid, date, text, text) to authenticated;
revoke execute on function public.leave_waitlist(uuid) from public, anon;
grant  execute on function public.leave_waitlist(uuid) to authenticated;
revoke execute on function public.my_waitlist() from public, anon;
grant  execute on function public.my_waitlist() to authenticated;
revoke execute on function public.business_waitlist() from public, anon;
grant  execute on function public.business_waitlist() to authenticated;
revoke execute on function public.set_waitlist_status(uuid, text) from public, anon;
grant  execute on function public.set_waitlist_status(uuid, text) to authenticated;
revoke execute on function public.notify_waitlist_for_day(uuid, date) from public, anon, authenticated;
revoke execute on function public.waitlist_on_appointment_change() from public, anon, authenticated;
revoke execute on function public.waitlist_on_time_off_delete() from public, anon, authenticated;
revoke execute on function public.send_due_notifications() from public, anon, authenticated;
