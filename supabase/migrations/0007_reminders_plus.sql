-- ============================================================
-- 0007: smarter reminders
--  1. "מגיעה / צריכה להזיז": the day-before reminder carries two buttons. Confirming
--     sets appointments.confirmed_at, shown in the studio's calendar. Moving an
--     appointment clears it.
--  2. A reminder 48 hours before (time to reschedule and refill the slot).
--  3. "Time for your next visit": per-service rebook interval; a push N days after a
--     visit, dropped as soon as the customer books again.
--  4. No pushes on Shabbat (Fri 15:00 – Sat 20:30, Israel time), except the booking
--     confirmation, an update the customer caused, and the 2-hours-before reminder.
-- Run once in the Supabase SQL editor, after 0006. Safe to re-run.
-- ============================================================

-- 1. Confirmation --------------------------------------------
alter table public.appointments add column if not exists confirmed_at timestamptz;

-- The calendar view lists a.* columns, so it has to be rebuilt to include the new one.
drop view if exists public.appointments_view;
create view public.appointments_view
with (security_invoker = true) as
select
  a.*,
  (a.starts_at at time zone b.timezone)::date as local_date,
  c.name  as customer_name,
  c.phone as customer_phone
from public.appointments a
join public.businesses b on b.id = a.business_id
join public.customers  c on c.id = a.customer_id;
grant select on public.appointments_view to authenticated;

create or replace function public.confirm_my_appointment(p_id uuid)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  update appointments a set confirmed_at = coalesce(a.confirmed_at, now())
  from customers c
  where a.id = p_id and c.id = a.customer_id and c.user_id = auth.uid()
    and a.status = 'booked' and a.starts_at > now();
  if not found then raise exception 'NOT_FOUND'; end if;
end;
$$;

-- A moved appointment needs a fresh confirmation.
create or replace function public.reset_confirmation_on_move()
returns trigger language plpgsql as $$
begin
  if new.starts_at is distinct from old.starts_at then new.confirmed_at := null; end if;
  return new;
end;
$$;
drop trigger if exists appointment_reset_confirmation on public.appointments;
create trigger appointment_reset_confirmation
  before update of starts_at on public.appointments
  for each row execute function public.reset_confirmation_on_move();

-- 3. Rebook interval per service ------------------------------
alter table public.services add column if not exists rebook_after_days int
  check (rebook_after_days is null or rebook_after_days between 7 and 365);
-- Sensible defaults by treatment (the studio can change them later).
update public.services set rebook_after_days = 28 where rebook_after_days is null and (name like '%עיצוב%' or name like '%צביעת%');
update public.services set rebook_after_days = 42 where rebook_after_days is null and name like '%ריסים%';

-- Notification kinds ------------------------------------------
alter table public.notification_queue drop constraint if exists notification_queue_kind_check;
alter table public.notification_queue add constraint notification_queue_kind_check
  check (kind in ('confirmation', 'updated', 'two_days', 'day_before', 'two_hours', 'waitlist', 'waitlist_admin', 'rebook'));

-- 2 + 3. Rebuild an appointment's pending notifications --------
create or replace function public.schedule_appointment_notifications()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_user   uuid;
  v_biz    businesses%rowtype;
  v_when   text;
  v_time   text;
  v_rebook int;
begin
  delete from notification_queue where appointment_id = new.id and sent_at is null;

  select user_id into v_user from customers where id = new.customer_id;
  if v_user is null then return new; end if;  -- walk-in customer without the app
  select * into v_biz from businesses where id = new.business_id;

  -- A new booking replaces any pending "time to rebook" nudge for this customer.
  if tg_op = 'INSERT' and new.status = 'booked' then
    delete from notification_queue q
    using appointments a
    where q.kind = 'rebook' and q.sent_at is null and q.user_id = v_user
      and a.id = q.appointment_id and a.business_id = new.business_id;
  end if;

  -- "Time for your next visit", counted from the visit (booked or completed, not cancelled/no-show).
  if new.status in ('booked', 'completed') then
    select rebook_after_days into v_rebook from services where id = new.service_id;
    if v_rebook is not null and new.starts_at + make_interval(days => v_rebook) > now() then
      insert into notification_queue (appointment_id, user_id, kind, send_at, title, body, url)
      values (new.id, v_user, 'rebook',
              -- 10:00 studio time on that day
              ((new.starts_at at time zone v_biz.timezone)::date + v_rebook + time '10:00') at time zone v_biz.timezone,
              'הגיע הזמן לסידור',
              'עברו ' || (v_rebook / 7) || ' שבועות מאז ' || new.service_name || '. רוצה לשמור על הקו? אפשר לקבוע בלחיצה.',
              '/book/' || v_biz.slug || coalesce('?service=' || new.service_id, ''));
    end if;
  end if;

  if new.status <> 'booked' or new.starts_at <= now() then return new; end if;
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

  if new.starts_at - interval '48 hours' > now() + interval '1 hour' then
    insert into notification_queue (appointment_id, user_id, kind, send_at, title, body)
    values (new.id, v_user, 'two_days', new.starts_at - interval '48 hours', 'בעוד יומיים',
            v_when || ' · ' || new.service_name || '. אם צריך להזיז, עכשיו הזמן.');
  end if;
  if new.starts_at - interval '24 hours' > now() then
    insert into notification_queue (appointment_id, user_id, kind, send_at, title, body)
    values (new.id, v_user, 'day_before', new.starts_at - interval '24 hours', 'מחר ב־' || v_time,
            new.service_name || ' אצל ' || v_biz.name || '. מגיעה?');
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

-- 1 + 4. Sender: reminder buttons, and hold on Shabbat --------
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
  v_local    timestamp := now() at time zone 'Asia/Jerusalem';
  v_shabbat  boolean;
begin
  -- Friday 15:00 to Saturday 20:30 (covers candle lighting and havdalah all year round).
  v_shabbat := (extract(dow from v_local) = 5 and v_local::time >= time '15:00')
            or (extract(dow from v_local) = 6 and v_local::time < time '20:30');

  select array_agg(id) into v_ids from (
    select id from notification_queue
    where sent_at is null and send_at <= now()
      and (not v_shabbat or kind in ('confirmation', 'updated', 'two_hours'))
    order by send_at
    limit 500
    for update skip locked
  ) due;
  if v_ids is null then return 0; end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'to', t.token, 'title', q.title, 'body', q.body, 'sound', 'default', 'channelId', 'reminders',
             'data', jsonb_build_object('url', coalesce(q.url, '/appointments'), 'appointmentId', q.appointment_id))
           -- The day-before reminder shows "מגיעה ✓ / צריכה להזיז" buttons (category registered by the app).
           || case when q.kind = 'day_before' then jsonb_build_object('categoryId', 'reminder') else '{}'::jsonb end
         ), '[]'::jsonb)
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

-- Grants ------------------------------------------------------
revoke execute on function public.confirm_my_appointment(uuid) from public, anon;
grant  execute on function public.confirm_my_appointment(uuid) to authenticated;
revoke execute on function public.reset_confirmation_on_move() from public, anon, authenticated;
revoke execute on function public.schedule_appointment_notifications() from public, anon, authenticated;
revoke execute on function public.send_due_notifications() from public, anon, authenticated;
