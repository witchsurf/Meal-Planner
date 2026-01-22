-- ============================================================================
-- MEAL PLANNER - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This schema creates all tables, triggers, indexes, and RLS policies
-- for a multi-tenant meal planning application.
-- 
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
-- pgcrypto: Required for uuid_generate_v4() function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm: Enables trigram-based text search for recipe names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- HELPER: UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
-- This function automatically sets updated_at to NOW() on any row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TABLE: RECIPES
-- ----------------------------------------------------------------------------
-- Stores user's recipe collection with metadata for search and filtering
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core fields
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  description TEXT,
  image_url TEXT,
  
  -- Categorization
  category TEXT, -- e.g., 'main', 'dessert', 'appetizer'
  tags TEXT[] DEFAULT '{}', -- e.g., ['vegetarian', 'quick', 'italian']
  
  -- Metadata
  prep_time_minutes INTEGER CHECK (prep_time_minutes IS NULL OR prep_time_minutes >= 0),
  source_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for recipes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_category ON recipes(category) WHERE category IS NOT NULL;
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_name_trgm ON recipes USING GIN(name gin_trgm_ops); -- Fast text search

-- Updated_at trigger
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE: INGREDIENTS
-- ----------------------------------------------------------------------------
-- Recipe ingredients. No direct user_id - security via recipes relationship.
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Core fields
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  quantity NUMERIC CHECK (quantity IS NULL OR quantity > 0),
  unit TEXT, -- e.g., 'cup', 'tbsp', 'g', 'kg'
  aisle TEXT, -- e.g., 'produce', 'dairy', 'bakery' - for shopping list grouping
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Prevent obvious duplicates (same name in same recipe)
  CONSTRAINT unique_ingredient_per_recipe UNIQUE (recipe_id, name)
);

-- Indexes for ingredients
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX idx_ingredients_aisle ON ingredients(aisle) WHERE aisle IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE: PLANNED_MEALS
-- ----------------------------------------------------------------------------
-- Maps recipes to specific meal slots in the weekly planner
CREATE TABLE planned_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Scheduling
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  
  -- Serving size (affects shopping list quantities)
  servings INTEGER NOT NULL DEFAULT 1 CHECK (servings > 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Only one meal per slot (user + date + meal_type)
  -- User can have multiple snacks is common, so we may want to reconsider this
  CONSTRAINT unique_meal_slot UNIQUE (user_id, date, meal_type)
);

-- Indexes for planned_meals
CREATE INDEX idx_planned_meals_user_id ON planned_meals(user_id);
CREATE INDEX idx_planned_meals_date ON planned_meals(date);
CREATE INDEX idx_planned_meals_date_range ON planned_meals(user_id, date); -- For range queries
CREATE INDEX idx_planned_meals_recipe_id ON planned_meals(recipe_id);

-- Updated_at trigger
CREATE TRIGGER planned_meals_updated_at
  BEFORE UPDATE ON planned_meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE: SHOPPING_LISTS
-- ----------------------------------------------------------------------------
-- Generated shopping lists for a date range
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Date range this list covers
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: end_date must be >= start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes for shopping_lists
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_dates ON shopping_lists(user_id, start_date, end_date);

-- Updated_at trigger
CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- TABLE: SHOPPING_LIST_ITEMS
-- ----------------------------------------------------------------------------
-- Individual items in a shopping list. No direct user_id.
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  
  -- Item details (aggregated from ingredients)
  name TEXT NOT NULL CHECK (char_length(name) >= 1),
  quantity NUMERIC CHECK (quantity IS NULL OR quantity > 0),
  unit TEXT,
  aisle TEXT,
  
  -- State
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for shopping_list_items
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_aisle ON shopping_list_items(aisle) WHERE aisle IS NOT NULL;
CREATE INDEX idx_shopping_list_items_checked ON shopping_list_items(shopping_list_id, checked);

-- Updated_at trigger
CREATE TRIGGER shopping_list_items_updated_at
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- All tables have RLS enabled. Users can only access their own data.
-- Child tables (ingredients, shopping_list_items) use EXISTS subqueries.

-- ----------------------------------------------------------------------------
-- RLS: RECIPES
-- ----------------------------------------------------------------------------
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see their own recipes
CREATE POLICY recipes_select_policy ON recipes
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create recipes for themselves
-- Note: user_id is set by the client, but RLS ensures it matches auth.uid()
CREATE POLICY recipes_insert_policy ON recipes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own recipes
CREATE POLICY recipes_update_policy ON recipes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own recipes
CREATE POLICY recipes_delete_policy ON recipes
  FOR DELETE
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: INGREDIENTS
-- ----------------------------------------------------------------------------
-- No direct user_id column - security enforced via recipe ownership
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- SELECT: Only if the parent recipe belongs to the user
CREATE POLICY ingredients_select_policy ON ingredients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

-- INSERT: Only if the parent recipe belongs to the user
CREATE POLICY ingredients_insert_policy ON ingredients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

-- UPDATE: Only if the parent recipe belongs to the user
CREATE POLICY ingredients_update_policy ON ingredients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

-- DELETE: Only if the parent recipe belongs to the user
CREATE POLICY ingredients_delete_policy ON ingredients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: PLANNED_MEALS
-- ----------------------------------------------------------------------------
ALTER TABLE planned_meals ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see their own planned meals
CREATE POLICY planned_meals_select_policy ON planned_meals
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create planned meals for themselves
CREATE POLICY planned_meals_insert_policy ON planned_meals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own planned meals
CREATE POLICY planned_meals_update_policy ON planned_meals
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own planned meals
CREATE POLICY planned_meals_delete_policy ON planned_meals
  FOR DELETE
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: SHOPPING_LISTS
-- ----------------------------------------------------------------------------
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see their own shopping lists
CREATE POLICY shopping_lists_select_policy ON shopping_lists
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create shopping lists for themselves
CREATE POLICY shopping_lists_insert_policy ON shopping_lists
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own shopping lists
CREATE POLICY shopping_lists_update_policy ON shopping_lists
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own shopping lists
CREATE POLICY shopping_lists_delete_policy ON shopping_lists
  FOR DELETE
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: SHOPPING_LIST_ITEMS
-- ----------------------------------------------------------------------------
-- No direct user_id column - security enforced via shopping_list ownership
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Only if the parent shopping_list belongs to the user
CREATE POLICY shopping_list_items_select_policy ON shopping_list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND shopping_lists.user_id = auth.uid()
    )
  );

-- INSERT: Only if the parent shopping_list belongs to the user
CREATE POLICY shopping_list_items_insert_policy ON shopping_list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND shopping_lists.user_id = auth.uid()
    )
  );

-- UPDATE: Only if the parent shopping_list belongs to the user
CREATE POLICY shopping_list_items_update_policy ON shopping_list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND shopping_lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND shopping_lists.user_id = auth.uid()
    )
  );

-- DELETE: Only if the parent shopping_list belongs to the user
CREATE POLICY shopping_list_items_delete_policy ON shopping_list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND shopping_lists.user_id = auth.uid()
    )
  );

-- ============================================================================
-- OPTIONAL: RPC FUNCTION FOR ATOMIC SHOPPING LIST GENERATION
-- ============================================================================
-- This function creates a shopping list atomically in a single transaction.
-- Recommended for production use instead of client-side generation.
-- 
-- Usage: SELECT * FROM generate_shopping_list('2024-01-01', '2024-01-07');

CREATE OR REPLACE FUNCTION generate_shopping_list(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges, but we still check auth.uid()
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
  
  -- Aggregate ingredients from planned meals and insert as items
  INSERT INTO shopping_list_items (shopping_list_id, name, quantity, unit, aisle)
  SELECT 
    v_list_id,
    i.name,
    SUM(COALESCE(i.quantity, 1) * pm.servings),
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_shopping_list TO authenticated;
