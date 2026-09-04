-- act_badge_progress() (added 2026-07-27) computes progress for 7 badge ids
-- (time_giver, sleeves_up, open_hand, good_word, wave_maker, grateful_heart,
-- kindness_spotter) that were never inserted into the badges catalog table.
--
-- award_badges_for_user() only records a badge when it can JOIN the eligible
-- id against public.badges, so every one of these 7 badges has been silently
-- unearnable since the day they were added — no row ever lands in
-- user_badges for them, and since both apps build their badge grid from the
-- badges table, they never even render on screen.
INSERT INTO public.badges (id, name, name_es, name_fr, name_de, description, description_es, description_fr, description_de, icon, kind, sort_order, criteria) VALUES
  ('time_giver', 'Time Giver', 'Dador de Tiempo', 'Donneur de Temps', 'Zeitgeber',
   'Gave your time or attention 10 times', 'Diste tu tiempo o atención 10 veces', 'Tu as donné ton temps ou ton attention 10 fois', '10 Mal deine Zeit oder Aufmerksamkeit geschenkt',
   '⏰', 'act_type', 10, '{"tag": "time", "count": 10}'::jsonb),
  ('sleeves_up', 'Sleeves Up', 'Manos a la Obra', 'Manches Retroussées', 'Ärmel Hoch',
   'Pitched in with hands-on help 10 times', 'Ayudaste con tus manos 10 veces', 'Tu as mis la main à la pâte 10 fois', '10 Mal tatkräftig mit angepackt',
   '💪', 'act_type', 20, '{"tag": "hands_on", "count": 10}'::jsonb),
  ('open_hand', 'Open Hand', 'Mano Abierta', 'Main Ouverte', 'Offene Hand',
   'Gave or paid it forward 10 times', 'Diste o pagaste por alguien 10 veces', 'Tu as donné ou payé pour quelqu''un 10 fois', '10 Mal gegeben oder für jemanden bezahlt',
   '🤲', 'act_type', 30, '{"tag": "money", "count": 10}'::jsonb),
  ('good_word', 'Good Word', 'Buena Palabra', 'Bonne Parole', 'Gutes Wort',
   'Spoke or wrote kindness 10 times', 'Hablaste o escribiste bondad 10 veces', 'Tu as parlé ou écrit avec bonté 10 fois', '10 Mal freundliche Worte gesagt oder geschrieben',
   '💬', 'act_type', 40, '{"tag": "words", "count": 10}'::jsonb),
  ('wave_maker', 'Wave Maker', 'Hacedor de Olas', 'Faiseur de Vagues', 'Wellenmacher',
   'Part of 5 group acts of kindness', 'Parte de 5 actos de bondad en grupo', 'Partie de 5 actes de bonté collectifs', 'Teil von 5 Gruppentaten der Güte',
   '🌊', 'act_type', 50, '{"tag": "group", "count": 5}'::jsonb),
  ('grateful_heart', 'Grateful Heart', 'Corazón Agradecido', 'Cœur Reconnaissant', 'Dankbares Herz',
   'Logged 10 acts of kindness you received', 'Registraste 10 actos de bondad que recibiste', 'Tu as enregistré 10 actes de bonté reçus', '10 empfangene Taten der Güte festgehalten',
   '💛', 'act_type', 60, '{"mode": "received", "count": 10}'::jsonb),
  ('kindness_spotter', 'Kindness Spotter', 'Observador de Bondad', 'Repéreur de Bonté', 'Güte-Spotter',
   'Logged 10 acts of kindness you witnessed', 'Registraste 10 actos de bondad que presenciaste', 'Tu as enregistré 10 actes de bonté observés', '10 miterlebte Taten der Güte festgehalten',
   '👀', 'act_type', 70, '{"mode": "witnessed", "count": 10}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- hug_dealer predates the kind/sort_order columns (defaulted to 'streak') but
-- is actually progress-based via act_badge_progress — group it with the
-- other act-type badges so it renders with a progress bar, not as a bare pill.
UPDATE public.badges SET kind = 'act_type', sort_order = 5 WHERE id = 'hug_dealer' AND kind = 'streak';
