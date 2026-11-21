-- ============================================================
-- Booking app: initial schema
-- Run this in the Supabase SQL editor (or with `supabase db push`).
-- ============================================================

create extension if not exists btree_gist;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table public.businesses (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id) on delete cascade,
  name              text not null check (length(trim(name)) between 2 and 80),
  slug              text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  category          text,
  phone             text,
  address           text,
  description       text,
  timezone          text not null default 'Asia/Jerusalem',
  slot_interval_min int  not null default 15 check (slot_interval_min in (5, 10, 15, 20, 30, 60)),
  min_notice_min    int  not null default 60 check (min_notice_min >= 0),
  max_days_ahead    int  not null default 30 check (max_days_ahead between 1 and 180),
  created_at        timestamptz not null default now()
);
create unique index businesses_owner_idx on public.businesses (owner_id);

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 80),
  duration_min int  not null check (duration_min between 5 and 600),
  price        numeric(10, 2) check (price >= 0),
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index services_business_idx on public.services (business_id);

-- Several rows per weekday are allowed (e.g. 09:00-13:00 and 14:00-19:00 for a lunch break).
-- weekday: 0 = Sunday ... 6 = Saturday
create table public.working_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);
create index working_hours_business_idx on public.working_hours (business_id, weekday);

create table public.time_off (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  check (ends_at > starts_at)
);
create index time_off_business_idx on public.time_off (business_id, starts_at);

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name        text not null check (length(trim(name)) between 2 and 80),
  phone       text not null check (phone ~ '^[0-9+]{9,15}$'),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (business_id, phone)
);

create table public.appointments (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  service_id   uuid references public.services (id) on delete set null,
  customer_id  uuid not null references public.customers (id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'booked'
               check (status in ('booked', 'cancelled', 'completed', 'no_show')),
  service_name text not null,          -- snapshot, so history survives service edits
  price        numeric(10, 2),
  notes        text,
  source       text not null default 'online' check (source in ('online', 'owner')),
  cancel_token uuid not null default gen_random_uuid() unique,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Two active appointments of the same business can never overlap.
  constraint appointments_no_overlap exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'booked')
);
create index appointments_business_time_idx on public.appointments (business_id, starts_at);
create index appointments_customer_idx on public.appointments (customer_id);

-- ------------------------------------------------------------
-- Row level security: an owner sees only their own business data.
-- The public never reads tables directly except business profile,
-- active services and working hours; everything else goes through
-- the security-definer functions below.
-- ------------------------------------------------------------

alter table public.businesses    enable row level security;
alter table public.services      enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off      enable row level security;
alter table public.customers     enable row level security;
alter table public.appointments  enable row level security;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from businesses where id = p_business_id and owner_id = auth.uid());
$$;

create policy "public read businesses" on public.businesses for select using (true);
create policy "owner insert business"  on public.businesses for insert with check (owner_id = auth.uid());
create policy "owner update business"  on public.businesses for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete business"  on public.businesses for delete using (owner_id = auth.uid());

create policy "public read active services" on public.services for select using (is_active or public.is_business_owner(business_id));
create policy "owner manage services"       on public.services for all
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "public read hours"  on public.working_hours for select using (true);
create policy "owner manage hours" on public.working_hours for all
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "owner manage time off" on public.time_off for all
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "owner manage customers" on public.customers for all
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "owner manage appointments" on public.appointments for all
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

-- Normalise an Israeli phone number to digits only, e.g. "054-123 4567" -> "0541234567".
create or replace function public.normalize_phone(p text)
returns text language sql immutable
as $$
  select case
    when regexp_replace(p, '[^0-9+]', '', 'g') like '+972%'
      then '0' || substr(regexp_replace(p, '[^0-9]', '', 'g'), 4)
    else regexp_replace(p, '[^0-9+]', '', 'g')
  end;
$$;

-- Owner calendar: appointments with their local date/time in the business timezone.
create or replace view public.appointments_view
with (security_invoker = true) as
select
  a.*,
  (a.starts_at at time zone b.timezone)::date as local_date,
  c.name  as customer_name,
  c.phone as customer_phone
from public.appointments a
join public.businesses b on b.id = a.business_id
join public.customers  c on c.id = a.customer_id;

-- ------------------------------------------------------------
-- Availability
-- Returns every free start time for a service on a given local day.
-- ------------------------------------------------------------

create or replace function public.get_available_slots(
  p_business_id uuid,
  p_service_id  uuid,
  p_day         date
)
returns setof timestamptz
language plpgsql stable security definer set search_path = public
as $$
declare
  b        businesses%rowtype;
  v_dur    interval;
  v_step   interval;
  v_now    timestamptz := now();
  v_today  date;
  wh       record;
  v_slot   timestamptz;
  v_end    timestamptz;
  v_win_end timestamptz;
begin
  select * into b from businesses where id = p_business_id;
  if not found then return; end if;

  select make_interval(mins => duration_min) into v_dur
  from services where id = p_service_id and business_id = p_business_id and is_active;
  if v_dur is null then return; end if;

  v_today := (v_now at time zone b.timezone)::date;
  if p_day < v_today or p_day > v_today + b.max_days_ahead then return; end if;

  v_step := make_interval(mins => b.slot_interval_min);

  for wh in
    select start_time, end_time from working_hours
    where business_id = p_business_id and weekday = extract(dow from p_day)
    order by start_time
  loop
    v_slot    := (p_day + wh.start_time) at time zone b.timezone;
    v_win_end := (p_day + wh.end_time)   at time zone b.timezone;

    while v_slot + v_dur <= v_win_end loop
      v_end := v_slot + v_dur;
      if v_slot >= v_now + make_interval(mins => b.min_notice_min)
         and not exists (
           select 1 from appointments a
           where a.business_id = p_business_id and a.status = 'booked'
             and tstzrange(a.starts_at, a.ends_at) && tstzrange(v_slot, v_end))
         and not exists (
           select 1 from time_off t
           where t.business_id = p_business_id
             and tstzrange(t.starts_at, t.ends_at) && tstzrange(v_slot, v_end))
      then
        return next v_slot;
      end if;
      v_slot := v_slot + v_step;
    end loop;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Public booking (customers do not need an account)
-- ------------------------------------------------------------

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
  select * into b from businesses where id = p_business_id;
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;

  select * into s from services where id = p_service_id and business_id = p_business_id and is_active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^0[0-9]{8,9}$' then raise exception 'INVALID_PHONE'; end if;

  -- The requested time must be one of the currently offered slots.
  if not exists (
    select 1 from get_available_slots(p_business_id, p_service_id, (p_starts_at at time zone b.timezone)::date) t
    where t = p_starts_at
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  insert into customers (business_id, name, phone)
  values (p_business_id, trim(p_name), v_phone)
  on conflict (business_id, phone) do update set name = excluded.name
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

-- Lets a customer look up their appointment with the private token from the confirmation link.
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, status text, service_name text, price numeric,
  customer_name text, business_name text, business_slug text, business_phone text,
  business_address text, timezone text
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.starts_at, a.ends_at, a.status, a.service_name, a.price,
         c.name, b.name, b.slug, b.phone, b.address, b.timezone
  from appointments a
  join businesses b on b.id = a.business_id
  join customers  c on c.id = a.customer_id
  where a.cancel_token = p_token;
$$;

create or replace function public.cancel_appointment_by_token(p_token uuid)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
begin
  update appointments set status = 'cancelled'
  where cancel_token = p_token and status = 'booked' and starts_at > now();
  return found;
end;
$$;

-- ------------------------------------------------------------
-- Owner: create an appointment manually (any time, even outside the offered slots)
-- ------------------------------------------------------------

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

  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'INVALID_NAME'; end if;
  if v_phone !~ '^0[0-9]{8,9}$' then raise exception 'INVALID_PHONE'; end if;

  v_start := (p_day + p_time) at time zone b.timezone;

  insert into customers (business_id, name, phone)
  values (b.id, trim(p_name), v_phone)
  on conflict (business_id, phone) do update set name = excluded.name
  returning id into v_cust;

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
-- Grants
-- ------------------------------------------------------------

revoke all on function public.owner_create_appointment(uuid, date, time, text, text, text) from public, anon;
grant execute on function public.owner_create_appointment(uuid, date, time, text, text, text) to authenticated;

grant execute on function public.get_available_slots(uuid, uuid, date)                          to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text)    to anon, authenticated;
grant execute on function public.get_appointment_by_token(uuid)                                 to anon, authenticated;
grant execute on function public.cancel_appointment_by_token(uuid)                              to anon, authenticated;
grant select on public.appointments_view to authenticated;

-- ------------------------------------------------------------
-- Account deletion (required by the App Store and Google Play for apps with sign-up).
-- Deletes the user; the business and all its data cascade.
-- ------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_ALLOWED'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ------------------------------------------------------------
-- Owner: block time (vacation, break, event). Times are local to the business.
-- Without times, whole days from p_from_day to p_to_day (inclusive) are blocked.
-- ------------------------------------------------------------

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
  select * into b from businesses where owner_id = auth.uid();
  if not found then raise exception 'NOT_ALLOWED'; end if;
  if p_to_day < p_from_day then raise exception 'INVALID_RANGE'; end if;
  if (p_start is null) <> (p_end is null) then raise exception 'INVALID_RANGE'; end if;
  if p_start is not null and p_end <= p_start then raise exception 'INVALID_RANGE'; end if;

  insert into time_off (business_id, starts_at, ends_at, reason)
  values (
    b.id,
    (p_from_day + coalesce(p_start, time '00:00')) at time zone b.timezone,
    case when p_end is null then (p_to_day + 1)::timestamp at time zone b.timezone
         else (p_to_day + p_end) at time zone b.timezone end,
    nullif(trim(coalesce(p_reason, '')), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.add_time_off(date, date, time, time, text) from public, anon;
grant execute on function public.add_time_off(date, date, time, time, text) to authenticated;
