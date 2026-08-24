-- ============================================================================
-- 021 — (Optionnel) Régler la fenêtre de vote sur « jusqu'à dimanche »
-- ============================================================================
-- Contexte : sur l'écran de vote, une séance affichait « Expiré » dès le
-- lendemain. Ce n'est PAS un bug : le groupe est réglé sur `vote_deadline =
-- 'same_day'`, donc le vote ferme à la fin de la journée de déclaration.
--
-- Si l'intention est de pouvoir voter jusqu'au dimanche 23h59 de la semaine de
-- la séance (comportement par défaut à la création), bascule le groupe en
-- `end_of_week`. NB : `publication_deadline` (fenêtre pour DÉCLARER) est un
-- réglage distinct — on n'y touche pas ici.
--
-- ⚠ Renseigne le nom (ou l'id) du groupe avant d'exécuter.
-- ============================================================================

-- Option A — un groupe précis par son nom :
UPDATE public.groups
SET vote_deadline = 'end_of_week'
WHERE name = 'BOOM';            -- ← remplace par le nom de ton groupe

-- Option B — par id (décommente et renseigne) :
-- UPDATE public.groups SET vote_deadline = 'end_of_week' WHERE id = '...';

-- Option C — tous les groupes encore en same_day (à utiliser en connaissance de cause) :
-- UPDATE public.groups SET vote_deadline = 'end_of_week' WHERE vote_deadline = 'same_day';
