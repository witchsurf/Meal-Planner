# Nettoyage de l'inventaire

## Problème
Des articles ont été ajoutés automatiquement à l'inventaire avec les quantités recommandées de la liste de courses du 26 janvier, alors que seulement certains items (pain à hamburger, haricots rouges, pâte brisée) devaient être ajoutés.

## Options de nettoyage

### Option 1: Suppression via l'interface (Recommandé)

1. Allez dans **📦 Stock**
2. Pour chaque article qui a été ajouté par erreur, cliquez sur le bouton **Supprimer** (🗑️)
3. Ou utilisez le bouton **Quick Adjust** (-) pour réduire les quantités

### Option 2: Suppression via Supabase (Plus rapide)

1. Connectez-vous à votre dashboard Supabase
2. Allez dans **Table Editor** → **inventory**
3. Identifiez les articles ajoutés le 27 janvier (regardez la colonne `created_at` ou `updated_at`)
4. Sélectionnez et supprimez les lignes concernées

### Option 3: Script SQL de nettoyage

Si vous voulez supprimer TOUS les articles ajoutés après une certaine date:

```sql
-- ATTENTION: Ajustez la date selon votre besoin
-- Ceci supprime tous les articles créés/modifiés après le 26 janvier 2026 23:59

DELETE FROM inventory
WHERE user_id = auth.uid()
AND (
  created_at > '2026-01-26 23:59:59'::timestamptz
  OR updated_at > '2026-01-26 23:59:59'::timestamptz
);
```

### Option 4: Restaurer uniquement les 3 articles corrects

Si vous voulez garder SEULEMENT pain à hamburger, haricots rouges et pâte brisée:

```sql
-- ATTENTION: Sauvegardez d'abord vos données!
-- Ceci supprime tout sauf les 3 articles mentionnés

DELETE FROM inventory
WHERE user_id = auth.uid()
AND name NOT IN ('Pain à hamburger', 'Haricots rouges', 'Pâte brisée')
AND updated_at > '2026-01-26 23:59:59'::timestamptz;
```

## Recommandation

Je recommande **Option 1** (interface) pour plus de sécurité, ou **Option 2** (Supabase UI) si vous avez beaucoup d'articles à nettoyer.

**⚠️ IMPORTANT**: Avec la correction que je viens de pousser, ce problème ne se reproduira plus. Les champs sont maintenant vides par défaut et seuls les articles avec une quantité saisie manuellement seront ajoutés.
