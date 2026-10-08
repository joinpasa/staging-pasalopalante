-- Partner portal: "Invite team" page (QR code + link).
--
-- invite_token stays unreadable to clients as a column; the signed-in
-- organization account reads (or resets) only its own through these.

create or replace function public.partner_my_invite()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.invite_token from public.partners p where p.account_user_id = auth.uid() limit 1;
$$;

-- New token = every old link and printed QR code stops working. People who
-- already joined keep their Kindness IDs.
create or replace function public.partner_reset_invite()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  tok text;
begin
  update public.partners
     set invite_token = replace(gen_random_uuid()::text, '-', '')
   where account_user_id = auth.uid()
  returning invite_token into tok;
  if tok is null then
    raise exception 'not a partner account' using errcode = '42501';
  end if;
  return tok;
end;
$$;

revoke all on function public.partner_my_invite() from public, anon;
revoke all on function public.partner_reset_invite() from public, anon;
grant execute on function public.partner_my_invite() to authenticated;
grant execute on function public.partner_reset_invite() to authenticated;
