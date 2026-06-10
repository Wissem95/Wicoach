-- ==========================================================================
-- Wicoach — seed data for the owner's account.
-- PREREQUISITE: sign up once in the app so an auth user + profile exist.
-- Then run this in the Supabase SQL Editor. It looks the user up by email.
-- Change the email below if you signed up with a different one.
-- ==========================================================================

do $$
declare
  uid uuid;
  m_id uuid;
begin
  select id into uid from auth.users
    where email = 'wissemkarboub@gmail.com'
    limit 1;

  if uid is null then
    raise exception 'No auth user found for that email. Sign up in the app first.';
  end if;

  -- ---- Profile (endomorphe, halal, 100kg -> 90kg) ------------------------
  insert into profiles (id, current_weight, target_weight, target_calories, target_protein, target_carbs, target_fats)
  values (uid, 100, 90, 1500, 110, 80, 50)
  on conflict (id) do update set
    current_weight = excluded.current_weight,
    target_weight = excluded.target_weight,
    target_calories = excluded.target_calories,
    target_protein = excluded.target_protein,
    target_carbs = excluded.target_carbs,
    target_fats = excluded.target_fats,
    updated_at = now();

  -- ---- Weight history (shows a downward trend) ---------------------------
  insert into weight_logs (user_id, weight, logged_at) values
    (uid, 101.2, current_date - 14),
    (uid, 100.8, current_date - 10),
    (uid, 100.3, current_date - 6),
    (uid, 100.0, current_date - 2),
    (uid, 99.6,  current_date)
  on conflict (user_id, logged_at) do update set weight = excluded.weight;

  -- ---- Example halal meals (today) ---------------------------------------
  -- Omelette + skyr breakfast
  insert into meals (user_id, name, meal_type, meal_time, total_calories, total_protein, total_carbs, total_fats, ai_analyzed)
  values (uid, 'Omelette 3 œufs + skyr', 'petit_dej', now() - interval '8 hours', 430, 42, 9, 26, false)
  returning id into m_id;
  insert into food_items (meal_id, food_name, portion, unit, calories, protein, carbs, fats) values
    (m_id, 'Œufs', 150, 'g', 220, 18, 2, 16),
    (m_id, 'Skyr nature', 150, 'g', 100, 17, 6, 0),
    (m_id, 'Huile d''olive', 10, 'g', 90, 0, 0, 10),
    (m_id, 'Épinards', 80, 'g', 20, 2, 1, 0);

  -- Saumon + riz lunch
  insert into meals (user_id, name, meal_type, meal_time, total_calories, total_protein, total_carbs, total_fats, ai_analyzed)
  values (uid, 'Saumon grillé + brocoli', 'dejeuner', now() - interval '3 hours', 480, 40, 12, 30, false)
  returning id into m_id;
  insert into food_items (meal_id, food_name, portion, unit, calories, protein, carbs, fats) values
    (m_id, 'Pavé de saumon', 180, 'g', 370, 36, 0, 24),
    (m_id, 'Brocoli vapeur', 200, 'g', 70, 4, 12, 1),
    (m_id, 'Huile d''olive', 5, 'g', 45, 0, 0, 5);

  -- Snack
  insert into meals (user_id, name, meal_type, meal_time, total_calories, total_protein, total_carbs, total_fats, ai_analyzed)
  values (uid, 'Fromage blanc + amandes', 'snack', now() - interval '1 hour', 250, 22, 10, 14, false)
  returning id into m_id;
  insert into food_items (meal_id, food_name, portion, unit, calories, protein, carbs, fats) values
    (m_id, 'Fromage blanc 0%', 200, 'g', 140, 16, 8, 0),
    (m_id, 'Amandes', 20, 'g', 120, 5, 2, 11);

  -- ---- Pantry ------------------------------------------------------------
  insert into pantry_items (user_id, name, quantity) values
    (uid, 'Œufs', '12'),
    (uid, 'Skyr nature', '4 pots'),
    (uid, 'Thon en boîte', '3 boîtes'),
    (uid, 'Riz basmati', '1 kg'),
    (uid, 'Brocoli surgelé', '1 sachet'),
    (uid, 'Huile d''olive', null),
    (uid, 'Épinards surgelés', '1 sachet'),
    (uid, 'Fromage blanc 0%', '500 g'),
    (uid, 'Amandes', '200 g')
  on conflict do nothing;

  -- ---- Training plan focuses (rows created by signup trigger) ------------
  update training_plan set type = 'salle',   focus = 'Haut du corps'    where user_id = uid and day_of_week = 1;
  update training_plan set type = 'maison',  focus = 'Cardio / gainage' where user_id = uid and day_of_week = 2;
  update training_plan set type = 'piscine', focus = 'Natation'         where user_id = uid and day_of_week = 3;
  update training_plan set type = 'salle',   focus = 'Bas du corps'     where user_id = uid and day_of_week = 4;
  update training_plan set type = 'maison',  focus = 'Full body'        where user_id = uid and day_of_week = 5;
  update training_plan set type = 'repos',   focus = null               where user_id = uid and day_of_week = 6;
  update training_plan set type = 'repos',   focus = null               where user_id = uid and day_of_week = 0;

  raise notice 'Seed complete for user %', uid;
end $$;
