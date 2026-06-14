-- ==========================================================================
-- Wicoach — migration 0005 : onboarding des nouveaux utilisateurs.
-- À exécuter dans le SQL Editor après 0004.
-- ==========================================================================

alter table profiles add column if not exists onboarded boolean not null default false;

-- Les utilisateurs déjà configurés ne repassent pas par l'onboarding.
update profiles set onboarded = true where onboarded = false;
