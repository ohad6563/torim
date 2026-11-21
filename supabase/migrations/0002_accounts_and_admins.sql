-- ============================================================
-- 0002: customer accounts, admin roles and username login
-- Run once in the Supabase SQL editor, after 0001_init.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Profiles: one per account (customers and admins alike)
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  username   text unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------
-- Admins: besides the owner, these accounts manage a business.
-- ------------------------------------------------------------

create table if not exists public.business_admins (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  primary key (business_id, user_id)
);
alter table public.business_admins enable row level security;
drop policy if exists "see own admin rows" on public.business_admins;
create policy "see own admin rows" on public.business_admins for select using (user_id = auth.uid());

-- Usernames that become admins of a studio the moment they sign up.
-- Not readable or writable from the app at all (RLS on, no policies).
create table if not exists public.reserved_admin_usernames (
  username      text primary key,
  business_slug text not null
);
alter table public.reserved_admin_usernames enable row level security;

insert into public.reserved_admin_usernames (username, business_slug)
values ('ohad1234', 'hila-brows')
on conflict (username) do nothing;

-- Owner OR admin of the business. Every owner policy from 0001 goes through this.
create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from businesses where id = p_business_id and owner_id = auth.uid())
      or exists (select 1 from business_admins where business_id = p_business_id and user_id = auth.uid());
$$;

-- The business the signed-in account manages, if any.
create or replace function public.my_business()
returns setof public.businesses
language sql stable security definer set search_path = public
as $$
  select b.* from businesses b
  where b.owner_id = auth.uid()
     or exists (select 1 from business_admins a where a.business_id = b.id and a.user_id = auth.uid())
  order by b.created_at
  limit 1;
$$;

-- ------------------------------------------------------------
-- New account: create the profile from the sign-up form, and grant
-- admin rights when the username is reserved for a studio.
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_username text := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
  v_slug     text;
begin
  insert into profiles (id, full_name, phone, username)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(normalize_phone(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    case when v_username ~ '^[a-z0-9._-]{3,30}$' then v_username end
  )
  on conflict (id) do nothing;

  select business_slug into v_slug from reserved_admin_usernames where username = v_username;
  if v_slug is not null then
    insert into business_admins (business_id, user_id)
    select id, new.id from businesses where slug = v_slug
    on conflict do nothing;
  end if;
  return new;
exception when others then
  -- Never block a sign-up because of the profile; it can be filled in later.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for accounts that already exist.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Customers are linked to their account
-- ------------------------------------------------------------

alter table public.customers add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists customers_user_idx on public.customers (user_id);

-- Booking now requires a signed-in account; the customer row is linked to it.
create or replace function public.book_appointment(
  p_business_id uuid,
  p_service_id  uuid,
  p_starts_at   timestamptz,
  p_name        text,
  p_phone       text,
  p_notes       text default null
)
returns table (appointment_id uuid, cancel_token uuid)
language plpgsql volatile security definer set search_path = public
as $$
declare
  b        businesses%rowtype;
  s        services%rowtype;
  v_phone  text := normalize_phone(p_phone);
  v_cust   uuid;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;

  select * into b from businesses where id = p_business_id;
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;

  select * into s from services where id = p_service_id and business_id = p_business_id and is_active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^0[0-9]{8,9}$' then raise exception 'INVALID_PHONE'; end if;

  if not exists (
    select 1 from get_available_slots(p_business_id, p_service_id, (p_starts_at at time zone b.timezone)::date) t
    where t = p_starts_at
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  insert into customers (business_id, name, phone, user_id)
  values (p_business_id, trim(p_name), v_phone, auth.uid())
  on conflict (business_id, phone) do update
    set name = excluded.name, user_id = coalesce(customers.user_id, excluded.user_id)
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

revoke execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text) to authenticated;

-- The signed-in customer's appointments (across the studios they booked at).
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

revoke execute on function public.my_appointments() from public, anon;
revoke execute on function public.cancel_my_appointment(uuid) from public, anon;
revoke execute on function public.my_business() from public, anon;
grant execute on function public.my_appointments() to authenticated;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;
grant execute on function public.my_business() to authenticated;
