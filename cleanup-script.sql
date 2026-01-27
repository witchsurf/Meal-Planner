-- ============================================================================
-- SCRIPT DE NETTOYAGE DE L'INVENTAIRE
-- ============================================================================
-- Ce script nettoie les articles ajoutés par erreur à l'inventaire
-- avec les quantités recommandées de la liste de courses.
--
-- ATTENTION: Lisez attentivement avant d'exécuter!
-- ============================================================================

-- OPTION A: Voir tous les articles ajoutés récemment (après le 26 janvier)
-- Exécutez d'abord ceci pour voir ce qui sera supprimé
SELECT 
  id,
  name,
  quantity,
  unit,
  category,
  created_at,
  updated_at
FROM inventory
WHERE user_id = auth.uid()
AND (created_at > '2026-01-26 23:59:59'::timestamptz 
     OR updated_at > '2026-01-26 23:59:59'::timestamptz)
ORDER BY updated_at DESC;

-- ============================================================================

-- OPTION B: Supprimer TOUS les articles ajoutés/modifiés après le 26 janvier
-- Décommentez les lignes suivantes pour exécuter:

-- DELETE FROM inventory 
-- WHERE user_id = auth.uid() 
-- AND (created_at > '2026-01-26 23:59:59'::timestamptz
--      OR updated_at > '2026-01-26 23:59:59'::timestamptz);

-- ============================================================================

-- OPTION C: Garder SEULEMENT les 3 articles corrects 
-- (pain à hamburger, haricots rouges, pâte brisée)
-- Décommentez les lignes suivantes pour exécuter:

-- DELETE FROM inventory 
-- WHERE user_id = auth.uid() 
-- AND LOWER(name) NOT IN (
--   'pain à hamburger',
--   'pain a hamburger',
--   'haricots rouges',
--   'haricot rouge',
--   'pâte brisée',
--   'pate brisée',
--   'pate brisee'
-- )
-- AND updated_at > '2026-01-26 23:59:59'::timestamptz;

-- ============================================================================

-- OPTION D: Réinitialiser les quantités à 0 (au lieu de supprimer)
-- Décommentez les lignes suivantes pour exécuter:

-- UPDATE inventory
-- SET quantity = 0
-- WHERE user_id = auth.uid()
-- AND updated_at > '2026-01-26 23:59:59'::timestamptz;

-- ============================================================================
-- APRÈS LE NETTOYAGE
-- ============================================================================
-- Exécutez ceci pour vérifier que le nettoyage a fonctionné:

-- SELECT COUNT(*) as total_items, SUM(quantity) as total_quantity
-- FROM inventory
-- WHERE user_id = auth.uid();

