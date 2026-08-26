
create or replace function public.email_exists(_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from auth.users where lower(email) = lower(_email))
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;

create or replace function public.claim_my_acts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  n integer := 0;
begin
  if uid is null then return 0; end if;
  select email into uemail from auth.users where id = uid;
  if uemail is null then return 0; end if;

  with upd as (
    update public.acts_of_kindness
       set user_id = uid
     where user_id is null
       and email is not null
       and lower(email) = lower(uemail)
    returning 1
  )
  select count(*) into n from upd;

  -- also claim commitments by email
  update public.commitments
     set user_id = uid
   where user_id is null
     and email is not null
     and lower(email) = lower(uemail);

  return n;
end;
$$;

revoke all on function public.claim_my_acts() from public;
grant execute on function public.claim_my_acts() to authenticated;
