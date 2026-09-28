-- profiles.email is only ever populated once, at signup (handle_new_user's
-- AFTER INSERT trigger). That was fine while a user's email could never
-- change after that — now that account settings lets someone change their
-- email (supabase.auth.updateUser({ email })), profiles.email would go
-- stale the moment a change is confirmed, since nothing was watching for it.
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.handle_auth_user_email_change();
