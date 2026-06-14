-- ==========================================================================
-- Wicoach — migration 0007 : auto-confirmation des emails à l'inscription.
-- Évite l'étape de confirmation par email (self-service pour les nouveaux
-- comptes). Idempotent. À exécuter après 0006.
-- ==========================================================================

create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
security definer
as $func$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$func$;

drop trigger if exists auto_confirm_email_trigger on auth.users;
create trigger auto_confirm_email_trigger
  before insert on auth.users
  for each row execute function public.auto_confirm_email();
