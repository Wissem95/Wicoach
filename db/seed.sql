-- ==========================================================================
-- Wicoach — seed PERSONNEL de Wissem (généré depuis le profil coach).
-- PRÉREQUIS : avoir créé son compte dans l'app + avoir exécuté 0000 et 0001.
-- À exécuter dans le SQL Editor Supabase. Idempotent (réinitialise garde-manger
-- & favoris à chaque exécution).
-- ==========================================================================

do $$
declare
  uid uuid;
  notes text := $notes$
=== PROFIL DE WISSEM (mémoire permanente du coach) ===

Wissem, 23 ans, développeur full-stack en télétravail, marié, à Garges-lès-Gonesse (travaille vers Asnières-sur-Seine). Transformation physique : départ ~100 kg, objectif 90 kg (vers mi-juillet 2026, ~0,6 kg/semaine), puis recomposition (masse grasse 33,9% → ~20%). Morphologie endomorphe trapue : métabolisme ralenti (~-15%), sensible aux glucides, rétention d'eau facile, gras abdominal rapide. ATOUT n°1 : masse musculaire excellente (62,7 kg, top ~10%) → tout le plan vise à NE PAS la perdre (protéines hautes en déficit). Halal strict : poisson, œufs, laitages maigres = valeurs sûres ; toute viande doit être certifiée.

Composition (balance Eufy C20, 14/03/2026) : muscle 62,7 kg, masse grasse 33,7 kg (33,9%), graisse viscérale 13 (élevée, viser <8), eau 47,1%, BMR ~2026 kcal, âge métabolique 26, taille 1m70. Cibles glucides (80 g) et lipides (60 g) = PLAFONDS, pas des minimums.

SOMMEIL = FREIN N°1 (priorité absolue). Travaille souvent jusqu'à 4h-6h puis réveil 10h-13h → 4-7h irrégulières. Impact documenté : BMR -20%, cortisol haut, testostérone basse, rétention d'eau, volonté en chute → grignotage du soir. Pendant le Ramadan : quasi pas de perte malgré une nutrition correcte, à cause du sommeil + absence de cardio (tapis cassé). RÈGLE NON NÉGOCIABLE : 22h30 stop travail, 23h au lit, 7h réveil = viser 8h, week-end inclus. Si le sommeil de la veille < 7h, c'est LA priorité du jour.

HORAIRES & RAPPELS :
- Réveil 07:00, coucher 23:00, STOP manger à 20:00.
- Repas : petit-déj 07:30, déj 13:00, collation 16:00, dîner 19:30.
- 20:00 : rappel d'arrêter de manger pour la soirée.
- 22:30 : stop travail + magnésium + collagène + préparer le sommeil.
- Cardio en fin d'après-midi ; créatine après la séance ; compléments du matin avec le petit-déj.

COMPLÉMENTS (timing précis) :
- Matin (petit-déj) : Alpha Men (multivit, 1 cp), Vitamine D3 4000 UI, Oméga-3 2 caps.
- Avant séance (optionnel) : L-Citrulline 8 g, 60-90 min avant.
- Pendant/après cardio : électrolytes 1 portion ; Créatine monohydrate 5 g après la séance (régularité = clé).
- Soir 22h30 : Collagène 10 g (avec vit C), Magnésium bisglycinate 400 mg (sommeil).

ENTRAÎNEMENT : base actuelle = cardio maison 6×/sem (tapis : modéré incliné 6% / HIIT / lent), dimanche repos ou marche légère. Recommandé d'ajouter muscu full body ~3×/sem (salle ON AIR Stains) pour protéger le muscle, et piscine possible (IDF). Football 5v5 occasionnel (~80 min). Si le cardio tapis saute (panne), proposer une séance maison au poids du corps (20-30 min).

MENUS DE JOURNÉE (à proposer avec recettes quand il a les ingrédients) :
- J1 Standard (~1310 kcal, 135g prot) : PDej œufs brouillés (4) + skyr + café ; Déj saumon 200g + légumes verts + riz basmati 90g + huile olive ; Collation skyr 150g ; Dîner poulet halal 150g grillé + grande salade + huile olive.
- J2 Sans poulet (~1225 kcal, 136g prot) : PDej omelette 3 œufs + fromage blanc 0% ; Déj thon naturel 140g + riz 100g + légumes ; Collation cottage 200g + carottes râpées ; Dîner saumon fumé 100g + salade + skyr.
- J3 Express/budget haute prot (~1170 kcal, 154g prot) : PDej 4 œufs durs + skyr ; Déj poulet halal 200g + légumes (sans féculent) ; Collation fromage blanc 0% 250g ; Dîner salade thon 140g + œuf dur.
- J4 Refeed dimanche (1×/sem, ~2075 kcal, 165g prot, glucides hauts) : PDej porridge (avoine 60g) + œufs + fromage blanc ; Déj poulet 200g + riz 200g + légumes ; Collation skyr + banane ; Dîner saumon 180g + patate douce 200g + légumes + yaourt grec + miel.

SANTÉ : graisse viscérale élevée (13) à réduire ; privation de sommeil chronique ; aucune blessure articulaire connue.

MOTIVATION : déclencheurs = échéances concrètes (un voyage type Lanzarote), voir bouger les chiffres (balance/composition), suivi structuré (Notion/app), fierté du contrôle (n'a repris qu'+1 kg en vacances). Ce qui le fait lâcher : manque de sommeil quand le travail déborde la nuit, imprévus matériels qui coupent le cardio, fatigue → grignotage du soir. OBJECTIFS : 90 kg ; masse grasse →~20% ; préserver le muscle ; viscérale <8 ; sommeil 8h (coucher 23h).
$notes$;
begin
  select id into uid from auth.users where email = 'wissemkarboub@gmail.com' limit 1;
  if uid is null then
    raise exception 'Aucun utilisateur pour cet email. Crée ton compte dans l''app d''abord.';
  end if;

  -- ---- Profil + mémoire coach -------------------------------------------
  insert into profiles (id, current_weight, target_weight, target_calories, target_protein, target_carbs, target_fats, coach_notes, email_reminders)
  values (uid, 100, 90, 1500, 110, 80, 60, notes, true)
  on conflict (id) do update set
    current_weight = 100, target_weight = 90, target_calories = 1500,
    target_protein = 110, target_carbs = 80, target_fats = 60,
    coach_notes = excluded.coach_notes, email_reminders = true, updated_at = now();

  -- pesée du jour
  insert into weight_logs (user_id, weight, logged_at) values (uid, 100, current_date)
  on conflict (user_id, logged_at) do update set weight = 100;

  -- ---- Plan d'entraînement (cardio maison + repos dimanche) -------------
  update training_plan set type='repos',  focus='Repos ou marche légère 20-30 min (refeed)' where user_id=uid and day_of_week=0;
  update training_plan set type='maison', focus='Cardio modéré tapis 35 min'                 where user_id=uid and day_of_week=1;
  update training_plan set type='maison', focus='Cardio HIIT tapis 30 min'                    where user_id=uid and day_of_week=2;
  update training_plan set type='maison', focus='Cardio lent tapis 40 min'                    where user_id=uid and day_of_week=3;
  update training_plan set type='maison', focus='Cardio modéré tapis 30 min'                  where user_id=uid and day_of_week=4;
  update training_plan set type='maison', focus='Cardio HIIT tapis 35 min'                    where user_id=uid and day_of_week=5;
  update training_plan set type='maison', focus='Cardio lent tapis 40 min'                    where user_id=uid and day_of_week=6;

  -- ---- Garde-manger (reset + staples) -----------------------------------
  delete from pantry_items where user_id = uid;
  insert into pantry_items (user_id, name) values
    (uid,'Œufs'),(uid,'Saumon fumé'),(uid,'Thon naturel en boîte'),(uid,'Skyr nature'),
    (uid,'Cottage cheese'),(uid,'Fromage blanc 0%'),(uid,'Kvarg'),(uid,'Carottes râpées'),
    (uid,'Tomates'),(uid,'Salade verte'),(uid,'Légumes verts (brocoli/courgette)'),
    (uid,'Riz basmati'),(uid,'Huile d''olive'),(uid,'Café');

  -- ---- Favoris : repas des journées-types -------------------------------
  delete from favorite_meals where user_id = uid;
  insert into favorite_meals (user_id, name, meal_type, items) values
  (uid,'J1 PDej — Œufs brouillés + skyr','petit_dej',$j$[{"food_name":"Œufs entiers","portion":200,"unit":"g","calories":280,"protein":24,"carbs":2,"fats":20},{"food_name":"Skyr nature","portion":100,"unit":"g","calories":60,"protein":11,"carbs":4,"fats":0}]$j$::jsonb),
  (uid,'J1 Déj — Saumon + légumes + riz','dejeuner',$j$[{"food_name":"Saumon","portion":200,"unit":"g","calories":374,"protein":40,"carbs":0,"fats":24},{"food_name":"Légumes verts cuits","portion":200,"unit":"g","calories":60,"protein":4,"carbs":8,"fats":1},{"food_name":"Riz basmati cuit","portion":90,"unit":"g","calories":117,"protein":2,"carbs":25,"fats":0},{"food_name":"Huile d'olive","portion":10,"unit":"g","calories":88,"protein":0,"carbs":0,"fats":10}]$j$::jsonb),
  (uid,'Collation — Skyr','snack',$j$[{"food_name":"Skyr nature","portion":150,"unit":"g","calories":90,"protein":17,"carbs":6,"fats":0}]$j$::jsonb),
  (uid,'J1 Dîner — Poulet + grande salade','diner',$j$[{"food_name":"Poulet halal grillé","portion":150,"unit":"g","calories":165,"protein":35,"carbs":0,"fats":3},{"food_name":"Salade verte + tomates","portion":150,"unit":"g","calories":30,"protein":2,"carbs":5,"fats":0},{"food_name":"Huile d'olive","portion":5,"unit":"g","calories":44,"protein":0,"carbs":0,"fats":5}]$j$::jsonb),
  (uid,'J2 PDej — Omelette + fromage blanc','petit_dej',$j$[{"food_name":"Œufs entiers","portion":150,"unit":"g","calories":210,"protein":18,"carbs":1,"fats":15},{"food_name":"Fromage blanc 0%","portion":200,"unit":"g","calories":90,"protein":16,"carbs":8,"fats":0}]$j$::jsonb),
  (uid,'J2 Déj — Thon + riz + légumes','dejeuner',$j$[{"food_name":"Thon naturel égoutté","portion":140,"unit":"g","calories":150,"protein":33,"carbs":0,"fats":2},{"food_name":"Riz basmati cuit","portion":100,"unit":"g","calories":130,"protein":3,"carbs":28,"fats":0},{"food_name":"Légumes verts cuits","portion":200,"unit":"g","calories":60,"protein":4,"carbs":8,"fats":1},{"food_name":"Huile d'olive","portion":10,"unit":"g","calories":88,"protein":0,"carbs":0,"fats":10}]$j$::jsonb),
  (uid,'J2 Collation — Cottage + carottes','snack',$j$[{"food_name":"Cottage cheese","portion":200,"unit":"g","calories":160,"protein":22,"carbs":8,"fats":4},{"food_name":"Carottes râpées","portion":100,"unit":"g","calories":35,"protein":1,"carbs":8,"fats":0}]$j$::jsonb),
  (uid,'J2 Dîner — Saumon fumé + salade + skyr','diner',$j$[{"food_name":"Saumon fumé","portion":100,"unit":"g","calories":180,"protein":20,"carbs":0,"fats":11},{"food_name":"Salade verte","portion":150,"unit":"g","calories":30,"protein":2,"carbs":5,"fats":0},{"food_name":"Skyr nature","portion":150,"unit":"g","calories":90,"protein":17,"carbs":6,"fats":0}]$j$::jsonb),
  (uid,'J3 PDej — Œufs durs + skyr','petit_dej',$j$[{"food_name":"Œufs durs","portion":200,"unit":"g","calories":280,"protein":24,"carbs":2,"fats":20},{"food_name":"Skyr nature","portion":150,"unit":"g","calories":90,"protein":17,"carbs":6,"fats":0}]$j$::jsonb),
  (uid,'J3 Déj — Poulet + légumes (sans féculent)','dejeuner',$j$[{"food_name":"Poulet halal grillé","portion":200,"unit":"g","calories":220,"protein":46,"carbs":0,"fats":5},{"food_name":"Légumes verts cuits","portion":250,"unit":"g","calories":75,"protein":5,"carbs":10,"fats":1},{"food_name":"Huile d'olive","portion":10,"unit":"g","calories":88,"protein":0,"carbs":0,"fats":10}]$j$::jsonb),
  (uid,'J3 Collation — Fromage blanc 0%','snack',$j$[{"food_name":"Fromage blanc 0%","portion":250,"unit":"g","calories":113,"protein":20,"carbs":10,"fats":0}]$j$::jsonb),
  (uid,'J3 Dîner — Salade thon + œuf','diner',$j$[{"food_name":"Thon naturel égoutté","portion":140,"unit":"g","calories":150,"protein":33,"carbs":0,"fats":2},{"food_name":"Salade verte + tomates","portion":200,"unit":"g","calories":40,"protein":3,"carbs":6,"fats":0},{"food_name":"Œuf dur","portion":50,"unit":"g","calories":70,"protein":6,"carbs":0,"fats":5},{"food_name":"Huile d'olive","portion":5,"unit":"g","calories":44,"protein":0,"carbs":0,"fats":5}]$j$::jsonb),
  (uid,'J4 Refeed PDej — Porridge + œufs','petit_dej',$j$[{"food_name":"Œufs entiers","portion":150,"unit":"g","calories":210,"protein":18,"carbs":1,"fats":15},{"food_name":"Flocons d'avoine (sec)","portion":60,"unit":"g","calories":228,"protein":8,"carbs":40,"fats":4},{"food_name":"Fromage blanc 0%","portion":150,"unit":"g","calories":68,"protein":12,"carbs":6,"fats":0}]$j$::jsonb),
  (uid,'J4 Refeed Déj — Poulet + riz + légumes','dejeuner',$j$[{"food_name":"Poulet halal grillé","portion":200,"unit":"g","calories":220,"protein":46,"carbs":0,"fats":5},{"food_name":"Riz basmati cuit","portion":200,"unit":"g","calories":260,"protein":5,"carbs":56,"fats":1},{"food_name":"Légumes verts cuits","portion":200,"unit":"g","calories":60,"protein":4,"carbs":8,"fats":1},{"food_name":"Huile d'olive","portion":10,"unit":"g","calories":88,"protein":0,"carbs":0,"fats":10}]$j$::jsonb),
  (uid,'J4 Refeed Collation — Skyr + banane','snack',$j$[{"food_name":"Banane","portion":120,"unit":"g","calories":107,"protein":1,"carbs":27,"fats":0},{"food_name":"Skyr nature","portion":150,"unit":"g","calories":90,"protein":17,"carbs":6,"fats":0}]$j$::jsonb),
  (uid,'J4 Refeed Dîner — Saumon + patate douce','diner',$j$[{"food_name":"Saumon","portion":180,"unit":"g","calories":337,"protein":36,"carbs":0,"fats":22},{"food_name":"Patate douce cuite","portion":200,"unit":"g","calories":172,"protein":3,"carbs":40,"fats":0},{"food_name":"Légumes verts cuits","portion":150,"unit":"g","calories":45,"protein":3,"carbs":6,"fats":1},{"food_name":"Yaourt grec","portion":150,"unit":"g","calories":145,"protein":13,"carbs":8,"fats":7},{"food_name":"Miel","portion":15,"unit":"g","calories":46,"protein":0,"carbs":12,"fats":0}]$j$::jsonb);

  -- ---- Routine quotidienne (checklist du jour) --------------------------
  delete from routine_items where user_id = uid;
  insert into routine_items (user_id, label, at_time, sort) values
    (uid,'Réveil','07:00',0),
    (uid,'Compléments matin (multivit, D3, oméga-3)','07:30',1),
    (uid,'Petit-déjeuner','07:30',2),
    (uid,'Déjeuner','13:00',3),
    (uid,'Collation','16:00',4),
    (uid,'Séance / cardio du jour','17:30',5),
    (uid,'Dîner','19:30',6),
    (uid,'Stop manger pour ce soir','20:00',7),
    (uid,'Magnésium + collagène','22:30',8),
    (uid,'Au lit (objectif 8h)','23:00',9);

  raise notice 'Seed Wissem OK pour %', uid;
end $$;
