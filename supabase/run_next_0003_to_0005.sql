-- All pending updates in one file: 0003 + 0004 + 0005. Run once in the Supabase SQL editor.

-- >>>>>>>> 0003_phone_login.sql
-- ============================================================
-- 0003: sign-in by phone with a one-time SMS code
--
-- A customer's identity is now their *verified* phone number (auth.users.phone,
-- confirmed by SMS). Appointments are linked by that number, so:
--   * a customer always sees every appointment booked under their phone,
--     including ones the studio entered by hand;
--   * nobody can see someone else's appointments by typing their number,
--     because the number has to be verified first.
-- Admins are defined by phone number too (reserved_admin_phones).
--
-- Run once in the Supabase SQL editor, after 0002.
-- ============================================================

-- "+972 54-123-4567", "972541234567" and "054-1234567" all become "0541234567".
create or replace function public.normalize_phone(p text)
returns text language sql immutable
as $$
  with d as (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as digits)
  select case
    when digits like '972%' and length(digits) between 11 and 12 then '0' || substr(digits, 4)
    else digits
  end
  from d;
$$;

-- The signed-in account's verified phone, in local format. Null if it has none.
create or replace function public.my_phone()
returns text
language sql stable security definer set search_path = public, auth
as $$
  select nullif(normalize_phone(phone), '') from auth.users where id = auth.uid() and phone_confirmed_at is not null;
$$;

-- ------------------------------------------------------------
-- Admins by phone
-- ------------------------------------------------------------

create table if not exists public.reserved_admin_phones (
  phone         text primary key check (phone ~ '^0[0-9]{8,9}$'),
  business_slug text not null
);
alter table public.reserved_admin_phones enable row level security;  -- no policies: invisible to the app

-- Grant admin rights for a phone: now if that account already exists, otherwise on sign-up.
create or replace function public.sync_admin_phone()
returns trigger
language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into business_admins (business_id, user_id)
  select b.id, u.id
  from businesses b, auth.users u
  where b.slug = new.business_slug and normalize_phone(u.phone) = new.phone
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_admin_phone_added on public.reserved_admin_phones;
create trigger on_admin_phone_added
  after insert on public.reserved_admin_phones
  for each row execute function public.sync_admin_phone();

-- Removing a phone from the list also removes the admin rights it gave.
create or replace function public.unsync_admin_phone()
returns trigger
language plpgsql security definer set search_path = public, auth
as $$
begin
  delete from business_admins a
  using businesses b, auth.users u
  where a.business_id = b.id and a.user_id = u.id
    and b.slug = old.business_slug and normalize_phone(u.phone) = old.phone;
  return old;
end;
$$;

drop trigger if exists on_admin_phone_removed on public.reserved_admin_phones;
create trigger on_admin_phone_removed
  after delete on public.reserved_admin_phones
  for each row execute function public.unsync_admin_phone();

-- New account: profile with the verified phone, and admin rights if the phone is reserved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_phone    text := nullif(normalize_phone(coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')), '');
  v_username text := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
begin
  insert into profiles (id, full_name, phone, username)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    v_phone,
    case when v_username ~ '^[a-z0-9._-]{3,30}$' then v_username end
  )
  on conflict (id) do nothing;

  insert into business_admins (business_id, user_id)
  select b.id, new.id
  from businesses b
  join reserved_admin_phones r on r.business_slug = b.slug
  where new.phone is not null and r.phone = v_phone
  on conflict do nothing;

  -- Legacy: username-reserved admins (from 0002).
  insert into business_admins (business_id, user_id)
  select b.id, new.id
  from businesses b
  join reserved_admin_usernames r on r.business_slug = b.slug
  where v_username is not null and r.username = v_username
  on conflict do nothing;

  return new;
exception when others then
  return new;  -- never block a sign-in because of the profile
end;
$$;

-- Keep the profile phone in step with the verified phone (e.g. first SMS sign-in).
create or replace function public.handle_user_phone_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.phone is distinct from old.phone and new.phone is not null then
    update profiles set phone = normalize_phone(new.phone) where id = new.id;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_changed on auth.users;
create trigger on_auth_user_phone_changed
  after update of phone on auth.users
  for each row execute function public.handle_user_phone_change();

-- The phone shown in the profile can't be changed from the app: it is the verified sign-in number.
create or replace function public.protect_profile_phone()
returns trigger
language plpgsql
as $$
begin
  if new.phone is distinct from old.phone and current_user in ('authenticated', 'anon') then
    new.phone := old.phone;
  end if;
  if new.username is distinct from old.username and current_user in ('authenticated', 'anon') then
    new.username := old.username;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_phone on public.profiles;
create trigger protect_profile_phone
  before update on public.profiles
  for each row execute function public.protect_profile_phone();

-- ------------------------------------------------------------
-- Booking and "my appointments" use the verified phone
-- ------------------------------------------------------------

create or replace function public.book_appointment(
  p_business_id uuid,
  p_service_id  uuid,
  p_starts_at   timestamptz,
  p_name        text,
  p_phone       text,      -- ignored for accounts with a verified phone (kept for compatibility)
  p_notes       text default null
)
returns table (appointment_id uuid, cancel_token uuid)
language plpgsql volatile security definer set search_path = public
as $$
declare
  b        businesses%rowtype;
  s        services%rowtype;
  v_phone  text := my_phone();
  v_cust   uuid;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if v_phone is null then raise exception 'PHONE_NOT_VERIFIED'; end if;

  select * into b from businesses where id = p_business_id;
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;

  select * into s from services where id = p_service_id and business_id = p_business_id and is_active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'INVALID_NAME'; end if;

  if not exists (
    select 1 from get_available_slots(p_business_id, p_service_id, (p_starts_at at time zone b.timezone)::date) t
    where t = p_starts_at
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  -- The verified owner of this number is the customer; link the row to this account.
  insert into customers (business_id, name, phone, user_id)
  values (p_business_id, trim(p_name), v_phone, auth.uid())
  on conflict (business_id, phone) do update
    set name = excluded.name, user_id = excluded.user_id
  returning id into v_cust;

  return query
  insert into appointments (business_id, service_id, customer_id, starts_at, ends_at,
                            service_name, price, notes, source)
  values (p_business_id, s.id, v_cust, p_starts_at, p_starts_at + make_interval(mins => s.duration_min),
          s.name, s.price, nullif(trim(coalesce(p_notes, '')), ''), 'online')
  returning id, appointments.cancel_token;
exception
  when exclusion_violation then raise exception 'SLOT_TAKEN';
end;
$$;

-- Appointments of the verified phone (and, for older accounts, of the linked customer rows).
create or replace function public.my_appointments()
returns table (
  id uuid, cancel_token uuid, starts_at timestamptz, ends_at timestamptz, status text,
  service_name text, price numeric, business_name text, business_slug text,
  business_phone text, business_address text, timezone text
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.cancel_token, a.starts_at, a.ends_at, a.status, a.service_name, a.price,
         b.name, b.slug, b.phone, b.address, b.timezone
  from appointments a
  join customers c on c.id = a.customer_id
  join businesses b on b.id = a.business_id
  where (my_phone() is not null and c.phone = my_phone())
     or (my_phone() is null and c.user_id = auth.uid())
  order by a.starts_at desc
  limit 100;
$$;

create or replace function public.cancel_my_appointment(p_id uuid)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_phone text := my_phone();
begin
  update appointments a set status = 'cancelled'
  from customers c
  where a.id = p_id and c.id = a.customer_id
    and ((v_phone is not null and c.phone = v_phone) or (v_phone is null and c.user_id = auth.uid()))
    and a.status = 'booked' and a.starts_at > now();
  return found;
end;
$$;

revoke execute on function public.my_phone() from public, anon;
grant execute on function public.my_phone() to authenticated;
revoke execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) to authenticated;
revoke execute on function public.sync_admin_phone() from public, anon, authenticated;
revoke execute on function public.unsync_admin_phone() from public, anon, authenticated;

-- >>>>>>>> 0004_full_account_deletion.sql
-- ============================================================
-- 0004: complete account deletion (App Store 5.1.1(v), Google Play)
--
-- Deleting an account now also removes the person's details from every
-- studio they booked at: future appointments are cancelled, and their
-- customer card is anonymised (name, phone and notes are erased). Past
-- appointment rows stay only as anonymous history (treatment, date, price)
-- so the studio's records remain consistent.
--
-- Run once in the Supabase SQL editor, after 0003.
-- ============================================================

-- An anonymised customer has no phone.
alter table public.customers alter column phone drop not null;
alter table public.customers drop constraint if exists customers_phone_check;
alter table public.customers add constraint customers_phone_check
  check (phone is null or phone ~ '^[0-9+]{9,15}$');
alter table public.customers drop constraint if exists customers_name_check;
alter table public.customers add constraint customers_name_check
  check (length(trim(name)) between 1 and 80);

create or replace function public.delete_my_account()
returns void
language plpgsql volatile security definer set search_path = public, auth
as $$
declare
  v_uid   uuid := auth.uid();
  v_phone text := my_phone();
begin
  if v_uid is null then raise exception 'NOT_ALLOWED'; end if;

  -- Customer cards that belong to this person (by verified phone or by link).
  create temporary table _mine on commit drop as
    select id from customers
    where user_id = v_uid or (v_phone is not null and phone = v_phone);

  update appointments set status = 'cancelled', notes = null
  where customer_id in (select id from _mine) and status = 'booked' and starts_at > now();

  update appointments set notes = null
  where customer_id in (select id from _mine);

  update customers
  set name = 'לקוח/ה שמחק/ה את החשבון', phone = null, notes = null, user_id = null
  where id in (select id from _mine);

  -- The account itself (profile and admin rows cascade; an owner's business cascades too).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- >>>>>>>> 0005_security_hardening.sql
-- ============================================================
-- 0005: security hardening (findings of the security audit)
-- Run once in the Supabase SQL editor, after 0004.
-- ============================================================

-- 1. Username-based admin reservations are removed: sign-up metadata is chosen by
--    the client, so a reserved username could be claimed by anyone. Admins are by
--    verified phone only (reserved_admin_phones).
drop table if exists public.reserved_admin_usernames;

-- 5. Businesses can only be created by the operator (SQL), never from the app.
drop policy if exists "owner insert business" on public.businesses;

-- 14. Admins (not only the owner) can edit the business settings, but nobody can
--     change who the owner is from the app.
drop policy if exists "owner update business" on public.businesses;
drop policy if exists "admin update business" on public.businesses;
create policy "admin update business" on public.businesses for update
  using (public.is_business_owner(id)) with check (public.is_business_owner(id));

create or replace function public.protect_business_owner()
returns trigger language plpgsql as $$
begin
  if new.owner_id is distinct from old.owner_id and current_user in ('authenticated', 'anon') then
    raise exception 'NOT_ALLOWED';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_business_owner on public.businesses;
create trigger protect_business_owner before update on public.businesses
  for each row execute function public.protect_business_owner();

-- 9. The public can read the studio profile, but not internal columns (owner_id, created_at).
revoke select on public.businesses from anon, authenticated;
grant select (id, name, slug, category, phone, address, description, timezone,
              slot_interval_min, min_notice_min, max_days_ahead)
  on public.businesses to anon, authenticated;

-- 7. Length limits on free text.
alter table public.appointments drop constraint if exists appointments_notes_len;
alter table public.appointments add constraint appointments_notes_len check (notes is null or length(notes) <= 500);
alter table public.profiles drop constraint if exists profiles_full_name_len;
alter table public.profiles add constraint profiles_full_name_len check (full_name is null or length(full_name) between 1 and 80);
alter table public.time_off drop constraint if exists time_off_reason_len;
alter table public.time_off add constraint time_off_reason_len check (reason is null or length(reason) <= 200);
alter table public.customers drop constraint if exists customers_notes_len;
alter table public.customers add constraint customers_notes_len check (notes is null or length(notes) <= 1000);
alter table public.businesses drop constraint if exists businesses_text_len;
alter table public.businesses add constraint businesses_text_len check (
  (description is null or length(description) <= 500) and (address is null or length(address) <= 200)
  and (phone is null or length(phone) <= 20) and (category is null or length(category) <= 40));

-- 6. Admin rights by phone only once the phone is VERIFIED (SMS code entered).
create or replace function public.sync_admin_phone()
returns trigger
language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into business_admins (business_id, user_id)
  select b.id, u.id
  from businesses b, auth.users u
  where b.slug = new.business_slug and normalize_phone(u.phone) = new.phone and u.phone_confirmed_at is not null
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, phone)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 80), ''),
    nullif(normalize_phone(coalesce(new.phone, '')), '')
  )
  on conflict (id) do nothing;

  if new.phone is not null and new.phone_confirmed_at is not null then
    insert into business_admins (business_id, user_id)
    select b.id, new.id from businesses b
    join reserved_admin_phones r on r.business_slug = b.slug
    where r.phone = normalize_phone(new.phone)
    on conflict do nothing;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

-- Runs when the phone changes or gets verified: keeps the profile phone in sync and
-- grants admin rights for reserved phones at the moment of verification.
create or replace function public.handle_user_phone_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.phone is not null then
    update profiles set phone = normalize_phone(new.phone) where id = new.id;
    if new.phone_confirmed_at is not null then
      insert into business_admins (business_id, user_id)
      select b.id, new.id from businesses b
      join reserved_admin_phones r on r.business_slug = b.slug
      where r.phone = normalize_phone(new.phone)
      on conflict do nothing;
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_changed on auth.users;
create trigger on_auth_user_phone_changed
  after update of phone, phone_confirmed_at on auth.users
  for each row execute function public.handle_user_phone_change();

-- 3. "My appointments" and customer cancel go by the verified phone ONLY (no
--    fallback to links made before phone verification existed), and stale links
--    from that era are cleared.
create or replace function public.my_appointments()
returns table (
  id uuid, cancel_token uuid, starts_at timestamptz, ends_at timestamptz, status text,
  service_name text, price numeric, business_name text, business_slug text,
  business_phone text, business_address text, timezone text
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.cancel_token, a.starts_at, a.ends_at, a.status, a.service_name, a.price,
         b.name, b.slug, b.phone, b.address, b.timezone
  from appointments a
  join customers c on c.id = a.customer_id
  join businesses b on b.id = a.business_id
  where my_phone() is not null and c.phone = my_phone()
  order by a.starts_at desc
  limit 100;
$$;

create or replace function public.cancel_my_appointment(p_id uuid)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_phone text := my_phone();
begin
  if v_phone is null then return false; end if;
  update appointments a set status = 'cancelled'
  from customers c
  where a.id = p_id and c.id = a.customer_id and c.phone = v_phone
    and a.status = 'booked' and a.starts_at > now();
  return found;
end;
$$;

update public.customers c set user_id = null
where user_id is not null and phone is distinct from (
  select normalize_phone(u.phone) from auth.users u where u.id = c.user_id and u.phone_confirmed_at is not null);

-- 4. At most 3 upcoming appointments per customer, so one account can't fill the diary.
create or replace function public.book_appointment(
  p_business_id uuid,
  p_service_id  uuid,
  p_starts_at   timestamptz,
  p_name        text,
  p_phone       text,      -- ignored: the verified sign-in phone is used
  p_notes       text default null
)
returns table (appointment_id uuid, cancel_token uuid)
language plpgsql volatile security definer set search_path = public
as $$
declare
  b        businesses%rowtype;
  s        services%rowtype;
  v_phone  text := my_phone();
  v_cust   uuid;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if v_phone is null then raise exception 'PHONE_NOT_VERIFIED'; end if;

  select * into b from businesses where id = p_business_id;
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;

  select * into s from services where id = p_service_id and business_id = p_business_id and is_active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  if length(trim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'INVALID_NAME'; end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'NOTE_TOO_LONG'; end if;

  -- Serialise bookings of the same customer, then enforce the cap.
  perform pg_advisory_xact_lock(hashtext(p_business_id::text || v_phone));
  if (select count(*) from appointments a join customers c on c.id = a.customer_id
      where c.business_id = p_business_id and c.phone = v_phone
        and a.status = 'booked' and a.starts_at > now()) >= 3 then
    raise exception 'TOO_MANY_BOOKINGS';
  end if;

  if not exists (
    select 1 from get_available_slots(p_business_id, p_service_id, (p_starts_at at time zone b.timezone)::date) t
    where t = p_starts_at
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  insert into customers (business_id, name, phone, user_id)
  values (p_business_id, trim(p_name), v_phone, auth.uid())
  on conflict (business_id, phone) do update
    set name = excluded.name, user_id = excluded.user_id
  returning id into v_cust;

  return query
  insert into appointments (business_id, service_id, customer_id, starts_at, ends_at,
                            service_name, price, notes, source)
  values (p_business_id, s.id, v_cust, p_starts_at, p_starts_at + make_interval(mins => s.duration_min),
          s.name, s.price, nullif(trim(coalesce(p_notes, '')), ''), 'online')
  returning id, appointments.cancel_token;
exception
  when exclusion_violation then raise exception 'SLOT_TAKEN';
end;
$$;

-- 14. Time off can be added by any admin of the studio (not only the owner).
create or replace function public.add_time_off(
  p_from_day date,
  p_to_day   date,
  p_start    time default null,
  p_end      time default null,
  p_reason   text default null
)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  b    businesses%rowtype;
  v_id uuid;
begin
  select * into b from my_business() limit 1;
  if b.id is null then raise exception 'NOT_ALLOWED'; end if;
  if p_to_day < p_from_day then raise exception 'INVALID_RANGE'; end if;
  if (p_start is null) <> (p_end is null) then raise exception 'INVALID_RANGE'; end if;
  if p_start is not null and p_end <= p_start then raise exception 'INVALID_RANGE'; end if;

  insert into time_off (business_id, starts_at, ends_at, reason)
  values (
    b.id,
    (p_from_day + coalesce(p_start, time '00:00')) at time zone b.timezone,
    case when p_end is null then (p_to_day + 1)::timestamp at time zone b.timezone
         else (p_to_day + p_end) at time zone b.timezone end,
    nullif(left(trim(coalesce(p_reason, '')), 200), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- 13. Tidy grants: trigger functions are not callable from the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_phone_change() from public, anon, authenticated;
revoke execute on function public.protect_profile_phone() from public, anon, authenticated;
revoke execute on function public.protect_business_owner() from public, anon, authenticated;
revoke execute on function public.sync_admin_phone() from public, anon, authenticated;
revoke execute on function public.unsync_admin_phone() from public, anon, authenticated;
revoke execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) to authenticated;
revoke execute on function public.add_time_off(date, date, time, time, text) from public, anon;
grant execute on function public.add_time_off(date, date, time, time, text) to authenticated;
revoke execute on function public.my_appointments() from public, anon;
revoke execute on function public.cancel_my_appointment(uuid) from public, anon;
grant execute on function public.my_appointments() to authenticated;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;
