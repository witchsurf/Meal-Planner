-- ============================================================================
-- MIGRATION: Add base_servings to recipes
-- ============================================================================
-- Run this in Supabase SQL Editor to add the base_servings column.
-- This tracks how many people the original recipe serves.
-- ============================================================================

-- Add base_servings column to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS base_servings INTEGER NOT NULL DEFAULT 4 
CHECK (base_servings > 0 AND base_servings <= 50);

-- Add comment for documentation
COMMENT ON COLUMN recipes.base_servings IS 
  'Number of people the recipe ingredients are calculated for. Default is 4.';

-- Update the generate_shopping_list function to use proportional calculation
CREATE OR REPLACE FUNCTION generate_shopping_list(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_list_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Create the shopping list
  INSERT INTO shopping_lists (user_id, start_date, end_date)
  VALUES (v_user_id, p_start_date, p_end_date)
  RETURNING id INTO v_list_id;
  
  -- Aggregate ingredients from planned meals with PROPORTIONAL calculation
  -- Formula: ingredient_qty * (planned_servings / recipe_base_servings)
  INSERT INTO shopping_list_items (shopping_list_id, name, quantity, unit, aisle)
  SELECT 
    v_list_id,
    i.name,
    SUM(
      COALESCE(i.quantity, 1) * 
      (pm.servings::NUMERIC / COALESCE(r.base_servings, 4))
    ),
    i.unit,
    i.aisle
  FROM planned_meals pm
  JOIN recipes r ON r.id = pm.recipe_id
  JOIN ingredients i ON i.recipe_id = r.id
  WHERE pm.user_id = v_user_id
    AND pm.date BETWEEN p_start_date AND p_end_date
  GROUP BY i.name, i.unit, i.aisle;
  
  RETURN v_list_id;
END;
$$;
