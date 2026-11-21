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
