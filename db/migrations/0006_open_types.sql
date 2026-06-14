-- ==========================================================================
-- Wicoach — migration 0006 : types d'entraînement ouverts (texte libre).
-- Le coach peut désormais utiliser n'importe quel type (course, vélo, yoga…).
-- À exécuter dans le SQL Editor après 0005.
-- ==========================================================================

-- training_plan.type : enum -> text
alter table training_plan alter column type drop default;
alter table training_plan alter column type type text using type::text;
alter table training_plan alter column type set default 'repos';

-- workout_logs.type : enum -> text
alter table workout_logs alter column type type text using type::text;

-- L'ancien type enum n'est plus utilisé (on le garde au cas où, sans risque).
