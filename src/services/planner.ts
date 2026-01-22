/**
 * Planner Service
 * 
 * Handles meal planning operations for the weekly planner.
 * Security is enforced by RLS - the service never filters by user_id.
 */

import { supabase, getCurrentUserId } from '../lib/supabase';
import type {
    PlannedMeal,
    PlannedMealInsert,
    PlannedMealUpdate,
    PlannedMealWithRecipe,
    MealType,
} from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface PlannedMealInput {
    recipe_id: string;
    date: string; // ISO date string (YYYY-MM-DD)
    meal_type: MealType;
    servings?: number;
}

export interface PlannedMealListResult {
    meals: PlannedMealWithRecipe[];
    error: Error | null;
}

export interface PlannedMealResult {
    meal: PlannedMeal | null;
    error: Error | null;
}

// ============================================================================
// LIST PLANNED MEALS
// ============================================================================

/**
 * List planned meals within a date range, with recipe data.
 * 
 * @param startDate - Start date (ISO string, inclusive)
 * @param endDate - End date (ISO string, inclusive)
 * @returns List of planned meals with recipe details
 * 
 * @example
 * ```ts
 * // Get meals for the current week
 * const { meals } = await listPlannedMealsInRange('2024-01-01', '2024-01-07');
 * 
 * meals.forEach(meal => {
 *   console.log(`${meal.date} ${meal.meal_type}: ${meal.recipe.name}`);
 * });
 * ```
 */
export async function listPlannedMealsInRange(
    startDate: string,
    endDate: string
): Promise<PlannedMealListResult> {
    try {
        const { data, error } = await supabase
            .from('planned_meals')
            .select(`
        *,
        recipe:recipes(*)
      `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .order('meal_type', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch planned meals: ${error.message}`);
        }

        // Transform data to match PlannedMealWithRecipe type
        const meals: PlannedMealWithRecipe[] = (data ?? []).map((row) => ({
            id: row.id,
            user_id: row.user_id,
            recipe_id: row.recipe_id,
            date: row.date,
            meal_type: row.meal_type,
            servings: row.servings,
            created_at: row.created_at,
            updated_at: row.updated_at,
            recipe: row.recipe,
        }));

        return { meals, error: null };
    } catch (error) {
        return { meals: [], error: error as Error };
    }
}

// ============================================================================
// CREATE PLANNED MEAL
// ============================================================================

/**
 * Create a new planned meal.
 * 
 * Note: Due to the unique constraint on (user_id, date, meal_type),
 * this will fail if a meal already exists in that slot.
 * 
 * @param input - Planned meal data
 * @returns The created planned meal
 * 
 * @example
 * ```ts
 * const { meal, error } = await createPlannedMeal({
 *   recipe_id: 'recipe-uuid',
 *   date: '2024-01-15',
 *   meal_type: 'dinner',
 *   servings: 4
 * });
 * ```
 */
export async function createPlannedMeal(
    input: PlannedMealInput
): Promise<PlannedMealResult> {
    try {
        // Get current user ID
        const userId = await getCurrentUserId();
        if (!userId) {
            throw new Error('User must be authenticated to create planned meals');
        }

        const mealInsert: PlannedMealInsert = {
            user_id: userId,
            recipe_id: input.recipe_id,
            date: input.date,
            meal_type: input.meal_type,
            servings: input.servings ?? 1,
        };

        const { data, error } = await supabase
            .from('planned_meals')
            .insert(mealInsert)
            .select()
            .single();

        if (error) {
            // Check for unique constraint violation
            if (error.code === '23505') {
                throw new Error('A meal is already planned for this slot');
            }
            throw new Error(`Failed to create planned meal: ${error.message}`);
        }

        return { meal: data, error: null };
    } catch (error) {
        return { meal: null, error: error as Error };
    }
}

// ============================================================================
// UPDATE PLANNED MEAL
// ============================================================================

/**
 * Update an existing planned meal.
 * 
 * Use this to change the recipe, date, meal type, or servings.
 * 
 * @param id - Planned meal UUID
 * @param updates - Fields to update
 * @returns The updated planned meal
 * 
 * @example
 * ```ts
 * // Move a meal to a different day
 * const { meal } = await updatePlannedMeal('uuid', {
 *   date: '2024-01-16'
 * });
 * 
 * // Change servings
 * const { meal } = await updatePlannedMeal('uuid', {
 *   servings: 6
 * });
 * ```
 */
export async function updatePlannedMeal(
    id: string,
    updates: Partial<PlannedMealInput>
): Promise<PlannedMealResult> {
    try {
        const mealUpdate: PlannedMealUpdate = {};

        if (updates.recipe_id !== undefined) mealUpdate.recipe_id = updates.recipe_id;
        if (updates.date !== undefined) mealUpdate.date = updates.date;
        if (updates.meal_type !== undefined) mealUpdate.meal_type = updates.meal_type;
        if (updates.servings !== undefined) mealUpdate.servings = updates.servings;

        const { data, error } = await supabase
            .from('planned_meals')
            .update(mealUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            // Check for unique constraint violation
            if (error.code === '23505') {
                throw new Error('A meal is already planned for this slot');
            }
            throw new Error(`Failed to update planned meal: ${error.message}`);
        }

        return { meal: data, error: null };
    } catch (error) {
        return { meal: null, error: error as Error };
    }
}

// ============================================================================
// DELETE PLANNED MEAL
// ============================================================================

/**
 * Delete a planned meal.
 * 
 * @param id - Planned meal UUID
 * @returns Success status
 * 
 * @example
 * ```ts
 * const { success, error } = await deletePlannedMeal('uuid');
 * ```
 */
export async function deletePlannedMeal(
    id: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('planned_meals')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete planned meal: ${error.message}`);
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}

// ============================================================================
// UTILITY: REPLACE MEAL IN SLOT
// ============================================================================

/**
 * Replace an existing meal in a slot, or create if empty.
 * 
 * This is useful for drag-and-drop operations where you want to
 * replace whatever is in a slot without checking first.
 * 
 * @param input - Planned meal data
 * @returns The created/updated planned meal
 */
export async function replaceMealInSlot(
    input: PlannedMealInput
): Promise<PlannedMealResult> {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            throw new Error('User must be authenticated');
        }

        // First, try to delete any existing meal in this slot
        await supabase
            .from('planned_meals')
            .delete()
            .eq('date', input.date)
            .eq('meal_type', input.meal_type);

        // Then create the new meal
        return createPlannedMeal(input);
    } catch (error) {
        return { meal: null, error: error as Error };
    }
}
