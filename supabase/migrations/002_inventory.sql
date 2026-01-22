-- ============================================================================
-- MIGRATION: Add Inventory/Stock Management System
-- ============================================================================
-- Run this in Supabase SQL Editor to add inventory tracking.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: INVENTORY
-- ----------------------------------------------------------------------------
-- Tracks items in stock at home (food + household items)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Item information
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT, -- e.g., 'kg', 'g', 'L', 'pièces'
  
  -- Categorization
  category TEXT NOT NULL DEFAULT 'pantry' 
    CHECK (category IN ('pantry', 'freezer', 'cleaning', 'toiletry')),
  aisle TEXT, -- For shopping list grouping (stores full category path like 'pantry:cereals')
  
  -- Stock management
  min_quantity NUMERIC DEFAULT 0 CHECK (min_quantity >= 0), -- Alert threshold
  expiry_date DATE, -- Expiration date (optional)
  
  -- Location (optional)
  location TEXT, -- 'frigo', 'placard', 'congélateur', 'salle de bain'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate items for same user
  CONSTRAINT unique_inventory_item UNIQUE (user_id, name, unit)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(user_id) 
  WHERE quantity <= min_quantity;

-- Updated_at trigger
CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE: INVENTORY_TRANSACTIONS
-- ----------------------------------------------------------------------------
-- History of stock changes
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'adjust', 'meal_used', 'expired')),
  quantity NUMERIC NOT NULL, -- Positive for add, negative for remove
  quantity_before NUMERIC NOT NULL,
  quantity_after NUMERIC NOT NULL,
  
  -- Context
  planned_meal_id UUID REFERENCES planned_meals(id) ON DELETE SET NULL,
  note TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id 
  ON inventory_transactions(inventory_id);

-- ----------------------------------------------------------------------------
-- RLS: INVENTORY
-- ----------------------------------------------------------------------------
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_select_policy ON inventory
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY inventory_insert_policy ON inventory
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY inventory_update_policy ON inventory
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY inventory_delete_policy ON inventory
  FOR DELETE USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: INVENTORY_TRANSACTIONS
-- ----------------------------------------------------------------------------
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_transactions_select_policy ON inventory_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id = inventory_transactions.inventory_id
        AND inventory.user_id = auth.uid()
    )
  );

CREATE POLICY inventory_transactions_insert_policy ON inventory_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id = inventory_transactions.inventory_id
        AND inventory.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- FUNCTION: Deduct ingredients from inventory for a planned meal
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_meal_ingredients(
  p_planned_meal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_recipe_id UUID;
  v_servings INTEGER;
  v_base_servings INTEGER;
  v_multiplier NUMERIC;
  v_ingredient RECORD;
  v_inventory_item RECORD;
  v_deducted JSONB := '[]'::JSONB;
  v_needed_qty NUMERIC;
  v_deduct_qty NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get planned meal details
  SELECT pm.recipe_id, pm.servings, COALESCE(r.base_servings, 4)
  INTO v_recipe_id, v_servings, v_base_servings
  FROM planned_meals pm
  JOIN recipes r ON r.id = pm.recipe_id
  WHERE pm.id = p_planned_meal_id AND pm.user_id = v_user_id;

  IF v_recipe_id IS NULL THEN
    RAISE EXCEPTION 'Planned meal not found';
  END IF;

  v_multiplier := v_servings::NUMERIC / v_base_servings;

  -- Loop through ingredients
  FOR v_ingredient IN
    SELECT name, COALESCE(quantity, 1) * v_multiplier AS needed, unit
    FROM ingredients
    WHERE recipe_id = v_recipe_id
  LOOP
    -- Find matching inventory item
    SELECT * INTO v_inventory_item
    FROM inventory
    WHERE user_id = v_user_id
      AND LOWER(name) = LOWER(v_ingredient.name)
      AND (unit = v_ingredient.unit OR (unit IS NULL AND v_ingredient.unit IS NULL))
    FOR UPDATE;

    IF v_inventory_item.id IS NOT NULL AND v_inventory_item.quantity > 0 THEN
      -- Calculate how much to deduct
      v_needed_qty := v_ingredient.needed;
      v_deduct_qty := LEAST(v_inventory_item.quantity, v_needed_qty);

      -- Update inventory
      UPDATE inventory
      SET quantity = quantity - v_deduct_qty
      WHERE id = v_inventory_item.id;

      -- Log transaction
      INSERT INTO inventory_transactions (
        inventory_id, type, quantity, quantity_before, quantity_after, 
        planned_meal_id, note
      ) VALUES (
        v_inventory_item.id, 'meal_used', -v_deduct_qty,
        v_inventory_item.quantity, v_inventory_item.quantity - v_deduct_qty,
        p_planned_meal_id, 'Utilisé pour recette'
      );

      -- Add to result
      v_deducted := v_deducted || jsonb_build_object(
        'name', v_ingredient.name,
        'deducted', v_deduct_qty,
        'remaining', v_inventory_item.quantity - v_deduct_qty
      );
    END IF;
  END LOOP;

  RETURN v_deducted;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_meal_ingredients TO authenticated;

-- ----------------------------------------------------------------------------
-- FUNCTION: Get shopping list with inventory subtracted
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_smart_shopping_list(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  name TEXT,
  needed_quantity NUMERIC,
  in_stock NUMERIC,
  to_buy NUMERIC,
  unit TEXT,
  aisle TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH needed_ingredients AS (
    SELECT 
      LOWER(i.name) AS ingredient_name,
      SUM(COALESCE(i.quantity, 1) * (pm.servings::NUMERIC / COALESCE(r.base_servings, 4))) AS total_needed,
      i.unit,
      i.aisle
    FROM planned_meals pm
    JOIN recipes r ON r.id = pm.recipe_id
    JOIN ingredients i ON i.recipe_id = r.id
    WHERE pm.user_id = v_user_id
      AND pm.date BETWEEN p_start_date AND p_end_date
    GROUP BY LOWER(i.name), i.unit, i.aisle
  ),
  inventory_stock AS (
    SELECT 
      LOWER(inv.name) AS item_name,
      inv.quantity AS stock,
      inv.unit
    FROM inventory inv
    WHERE inv.user_id = v_user_id
  )
  SELECT 
    ni.ingredient_name::TEXT AS name,
    ROUND(ni.total_needed, 2) AS needed_quantity,
    COALESCE(ROUND(ist.stock, 2), 0) AS in_stock,
    GREATEST(ROUND(ni.total_needed - COALESCE(ist.stock, 0), 2), 0) AS to_buy,
    ni.unit::TEXT,
    ni.aisle::TEXT
  FROM needed_ingredients ni
  LEFT JOIN inventory_stock ist 
    ON ist.item_name = ni.ingredient_name
    AND (ist.unit = ni.unit OR (ist.unit IS NULL AND ni.unit IS NULL))
  WHERE ni.total_needed > COALESCE(ist.stock, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION generate_smart_shopping_list TO authenticated;
