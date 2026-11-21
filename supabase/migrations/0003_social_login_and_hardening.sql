-- ============================================================
-- 0003: sign-in with Google / Apple, account-based customers, admins by
-- email, complete account deletion and security hardening.
-- Run once in the Supabase SQL editor, after 0001 and 0002. Safe to re-run.
--
-- Identity model: a customer IS their account (auth.users). Google / Apple
-- verify the email. The phone number is entered once in the profile so the
-- studio can reach the customer; it is contact info, not an identity, so
-- appointments are linked by account (customers.user_id), never by phone.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Retire username/password admin accounts from 0002
-- ------------------------------------------------------------
drop table if exists public.reserved_admin_usernames;
-- Accounts created with a username (e.g. ohad1234) and their admin rights.
delete from auth.users where email like '%@users.hila-brows.app';

-- ------------------------------------------------------------
-- 2. Helpers
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3. Admins by (verified) email
-- ------------------------------------------------------------
create table if not exists public.reserved_admin_emails (
  email         text primary key check (email = lower(email) and email like '%@%'),
  business_slug text not null
);
alter table public.reserved_admin_emails enable row level security;  -- no policies: invisible to the app

create or replace function public.grant_admin_for_user(p_user uuid)
returns void
language sql volatile security definer set search_path = public, auth
as $$
  insert into business_admins (business_id, user_id)
  select b.id, u.id
  from auth.users u
  join reserved_admin_emails r on r.email = lower(u.email)
  join businesses b on b.slug = r.business_slug
  where u.id = p_user and u.email_confirmed_at is not null
  on conflict do nothing;
$$;

create or replace function public.sync_admin_email()
returns trigger
language plpgsql security definer set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' then
    insert into business_admins (business_id, user_id)
    select b.id, u.id from businesses b, auth.users u
    where b.slug = new.business_slug and lower(u.email) = new.email and u.email_confirmed_at is not null
    on conflict do nothing;
    return new;
  else
    delete from business_admins a using businesses b, auth.users u
    where a.business_id = b.id and a.user_id = u.id
      and b.slug = old.business_slug and lower(u.email) = old.email;
    return old;
  end if;
end;
$$;

drop trigger if exists on_admin_email_change on public.reserved_admin_emails;
create trigger on_admin_email_change
  after insert or delete on public.reserved_admin_emails
  for each row execute function public.sync_admin_email();

-- ------------------------------------------------------------
-- 4. Profiles: name and phone, entered after the first sign-in
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_full_name_len;
alter table public.profiles add constraint profiles_full_name_len
  check (full_name is null or length(full_name) between 1 and 80);
alter table public.profiles drop constraint if exists profiles_phone_format;
alter table public.profiles add constraint profiles_phone_format
  check (phone is null or phone ~ '^0[0-9]{8,9}$');

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert
  with check (id = auth.uid() and username is null);

-- The username column is legacy; it can't be set from the app.
create or replace function public.protect_profile_phone()
returns trigger
language plpgsql
as $$
begin
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

-- New account (Google / Apple): profile from the provider's name; admin if the email is reserved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 80), '')
  )
  on conflict (id) do nothing;
  perform grant_admin_for_user(new.id);
  return new;
exception when others then
  return new;  -- never block a sign-in because of the profile
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email confirmed later (or changed): re-check admin rights.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform grant_admin_for_user(new.id);
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_changed on auth.users;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email, email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_change();

-- ------------------------------------------------------------
-- 5. Customers: one card per account per studio; walk-ins by phone
-- ------------------------------------------------------------
alter table public.customers alter column phone drop not null;
alter table public.customers drop constraint if exists customers_business_id_phone_key;
alter table public.customers drop constraint if exists customers_phone_check;
alter table public.customers add constraint customers_phone_check check (phone is null or phone ~ '^[0-9+]{9,15}$');
alter table public.customers drop constraint if exists customers_name_check;
alter table public.customers add constraint customers_name_check check (length(trim(name)) between 1 and 80);
alter table public.customers drop constraint if exists customers_notes_len;
alter table public.customers add constraint customers_notes_len check (notes is null or length(notes) <= 1000);

-- Links made before this update by typing a phone number can't be trusted: drop them.
update public.customers set user_id = null where user_id is not null;

create unique index if not exists customers_business_user_key
  on public.customers (business_id, user_id) where user_id is not null;
create unique index if not exists customers_business_walkin_phone_key
  on public.customers (business_id, phone) where user_id is null;

-- ------------------------------------------------------------
-- 6. Booking (customers) and manual booking (studio)
-- ------------------------------------------------------------
create or replace function public.book_appointment(
  p_business_id uuid,
  p_service_id  uuid,
  p_starts_at   timestamptz,
  p_name        text,
  p_phone       text,      -- ignored: the phone comes from the profile
  p_notes       text default null
)
returns table (appointment_id uuid, cancel_token uuid)
language plpgsql volatile security definer set search_path = public
as $$
declare
  b        businesses%rowtype;
  s        services%rowtype;
  v_phone  text;
  v_cust   uuid;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  select phone into v_phone from profiles where id = auth.uid();
  if v_phone is null then raise exception 'PHONE_REQUIRED'; end if;

  select * into b from businesses where id = p_business_id;
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;

  select * into s from services where id = p_service_id and business_id = p_business_id and is_active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  if length(trim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'INVALID_NAME'; end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'NOTE_TOO_LONG'; end if;

  -- At most 3 upcoming appointments per customer, so one account can't fill the diary.
  perform pg_advisory_xact_lock(hashtext(p_business_id::text || auth.uid()::text));
  if (select count(*) from appointments a join customers c on c.id = a.customer_id
      where c.business_id = p_business_id and c.user_id = auth.uid()
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
  on conflict (business_id, user_id) where user_id is not null
    do update set name = excluded.name, phone = excluded.phone
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

-- Studio enters an appointment by hand. Reuses a customer card with that phone
-- (an app customer's card first), otherwise creates a walk-in card.
create or replace function public.owner_create_appointment(
  p_service_id uuid,
  p_day        date,
  p_time       time,
  p_name       text,
  p_phone      text,
  p_notes      text default null
)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  s       services%rowtype;
  b       businesses%rowtype;
  v_phone text := normalize_phone(p_phone);
  v_start timestamptz;
  v_cust  uuid;
  v_id    uuid;
begin
  select * into s from services where id = p_service_id;
  if not found or not is_business_owner(s.business_id) then raise exception 'NOT_ALLOWED'; end if;
  select * into b from businesses where id = s.business_id;

  if length(trim(coalesce(p_name, ''))) not between 2 and 80 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^0[0-9]{8,9}$' then raise exception 'INVALID_PHONE'; end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'NOTE_TOO_LONG'; end if;

  v_start := (p_day + p_time) at time zone b.timezone;

  select id into v_cust from customers
  where business_id = b.id and phone = v_phone
  order by (user_id is null), created_at
  limit 1;

  if v_cust is null then
    insert into customers (business_id, name, phone)
    values (b.id, trim(p_name), v_phone)
    returning id into v_cust;
  end if;

  insert into appointments (business_id, service_id, customer_id, starts_at, ends_at,
                            service_name, price, notes, source)
  values (b.id, s.id, v_cust, v_start, v_start + make_interval(mins => s.duration_min),
          s.name, s.price, nullif(trim(coalesce(p_notes, '')), ''), 'owner')
  returning id into v_id;
  return v_id;
exception
  when exclusion_violation then raise exception 'SLOT_TAKEN';
end;
$$;

-- ------------------------------------------------------------
-- 7. "My appointments" and customer cancel: by account
-- ------------------------------------------------------------
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
  where c.user_id = auth.uid()
  order by a.starts_at desc
  limit 100;
$$;

create or replace function public.cancel_my_appointment(p_id uuid)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
begin
  update appointments a set status = 'cancelled'
  from customers c
  where a.id = p_id and c.id = a.customer_id and c.user_id = auth.uid()
    and a.status = 'booked' and a.starts_at > now();
  return found;
end;
$$;

-- ------------------------------------------------------------
-- 8. Complete account deletion (App Store 5.1.1(v), Google Play)
-- ------------------------------------------------------------
alter table public.appointments drop constraint if exists appointments_notes_len;
alter table public.appointments add constraint appointments_notes_len check (notes is null or length(notes) <= 500);

create or replace function public.delete_my_account()
returns void
language plpgsql volatile security definer set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_ALLOWED'; end if;

  update appointments set status = 'cancelled'
  where customer_id in (select id from customers where user_id = v_uid)
    and status = 'booked' and starts_at > now();
  update appointments set notes = null
  where customer_id in (select id from customers where user_id = v_uid);
  update customers
  set name = 'לקוח/ה שמחק/ה את החשבון', phone = null, notes = null, user_id = null
  where user_id = v_uid;

  delete from auth.users where id = v_uid;  -- profile and admin rows cascade
end;
$$;

-- ------------------------------------------------------------
-- 9. Studio settings: admins may edit, nobody may change the owner;
--    businesses are created only by the operator (SQL).
-- ------------------------------------------------------------
drop policy if exists "owner insert business" on public.businesses;
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

-- The public reads the studio profile, not internal columns (owner_id, created_at).
revoke select on public.businesses from anon, authenticated;
grant select (id, name, slug, category, phone, address, description, timezone,
              slot_interval_min, min_notice_min, max_days_ahead)
  on public.businesses to anon, authenticated;

alter table public.businesses drop constraint if exists businesses_text_len;
alter table public.businesses add constraint businesses_text_len check (
  (description is null or length(description) <= 500) and (address is null or length(address) <= 200)
  and (phone is null or length(phone) <= 20) and (category is null or length(category) <= 40));
alter table public.time_off drop constraint if exists time_off_reason_len;
alter table public.time_off add constraint time_off_reason_len check (reason is null or length(reason) <= 200);

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

-- Saving working hours is atomic: if anything fails, the previous hours stay.
create or replace function public.replace_working_hours(p_hours jsonb)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_business uuid;
begin
  select id into v_business from my_business() limit 1;
  if v_business is null then raise exception 'NOT_ALLOWED'; end if;
  if jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) > 50 then raise exception 'INVALID_RANGE'; end if;

  delete from working_hours where business_id = v_business;
  insert into working_hours (business_id, weekday, start_time, end_time)
  select v_business, (h ->> 'weekday')::smallint, (h ->> 'start_time')::time, (h ->> 'end_time')::time
  from jsonb_array_elements(p_hours) h;
end;
$$;

-- ------------------------------------------------------------
-- 10. Grants
-- ------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.protect_profile_phone() from public, anon, authenticated;
revoke execute on function public.protect_business_owner() from public, anon, authenticated;
revoke execute on function public.sync_admin_email() from public, anon, authenticated;
revoke execute on function public.grant_admin_for_user(uuid) from public, anon, authenticated;

revoke execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) from public, anon;
grant  execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) to authenticated;
revoke execute on function public.owner_create_appointment(uuid, date, time, text, text, text) from public, anon;
grant  execute on function public.owner_create_appointment(uuid, date, time, text, text, text) to authenticated;
revoke execute on function public.my_appointments() from public, anon;
grant  execute on function public.my_appointments() to authenticated;
revoke execute on function public.cancel_my_appointment(uuid) from public, anon;
grant  execute on function public.cancel_my_appointment(uuid) to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
revoke execute on function public.add_time_off(date, date, time, time, text) from public, anon;
grant  execute on function public.add_time_off(date, date, time, time, text) to authenticated;
revoke execute on function public.replace_working_hours(jsonb) from public, anon;
grant  execute on function public.replace_working_hours(jsonb) to authenticated;
