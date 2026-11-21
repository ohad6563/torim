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
