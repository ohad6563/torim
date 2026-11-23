-- ============================================================
-- 0005: store readiness
--  1. Admin rights only for accounts signed in with Google or Apple.
--     Defence in depth: even if email/password sign-up is switched on again by
--     mistake (Supabase auto-confirms emails when "Confirm email" is off), nobody
--     can register a reserved admin email with a password and become an admin.
--  2. Record when the customer accepted the terms of use and privacy policy.
-- Safe to run more than once.
-- ============================================================

-- 1. Admins ---------------------------------------------------
create or replace function public.is_social_user(p_user uuid)
returns boolean
language sql stable security definer set search_path = auth, public
as $$
  select coalesce(
    (select (u.raw_app_meta_data -> 'providers') ?| array['google', 'apple']
            or u.raw_app_meta_data ->> 'provider' in ('google', 'apple')
     from auth.users u where u.id = p_user),
    false);
$$;
revoke execute on function public.is_social_user(uuid) from public, anon, authenticated;

create or replace function public.grant_admin_for_user(p_user uuid)
returns void
language sql volatile security definer set search_path = public, auth
as $$
  insert into business_admins (business_id, user_id)
  select b.id, u.id
  from auth.users u
  join reserved_admin_emails r on r.email = lower(u.email)
  join businesses b on b.slug = r.business_slug
  where u.id = p_user and u.email_confirmed_at is not null and is_social_user(u.id)
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
    where b.slug = new.business_slug and lower(u.email) = new.email
      and u.email_confirmed_at is not null and is_social_user(u.id)
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

-- A Google/Apple identity linked later (raw_app_meta_data changes) can make an
-- existing account eligible; check again when that happens.
drop trigger if exists on_auth_user_providers_changed on auth.users;
create trigger on_auth_user_providers_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_email_change();

-- Remove admin rights from any account that isn't a Google/Apple account
-- (e.g. one created with email + password while that provider was on).
delete from public.business_admins a
where not public.is_social_user(a.user_id);

-- 2. Terms acceptance ------------------------------------------
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- What to check after running:
--   select u.email, a.business_id from business_admins a join auth.users u on u.id = a.user_id;
