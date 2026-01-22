/**
 * Recipe Service
 * 
 * Handles all recipe CRUD operations with full type safety.
 * Security is enforced by RLS - the service never filters by user_id.
 */

import { supabase, getCurrentUserId } from '../lib/supabase';
import type {
    Recipe,
    RecipeInsert,
    RecipeUpdate,
    Ingredient,
    IngredientInsert,
    RecipeInput,
    RecipeWithIngredients,
} from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface RecipeFilters {
    /** Text search on recipe name (uses trigram similarity) */
    search?: string;
    /** Filter by exact category */
    category?: string;
    /** Filter by tags (recipes must have ALL specified tags) */
    tags?: string[];
}

export interface RecipeListResult {
    recipes: Recipe[];
    error: Error | null;
}

export interface RecipeResult {
    recipe: RecipeWithIngredients | null;
    error: Error | null;
}

// ============================================================================
// LIST RECIPES
// ============================================================================

/**
 * List recipes with optional filtering.
 * 
 * @param filters - Optional filters for search, category, and tags
 * @returns List of recipes matching the filters
 * 
 * @example
 * ```ts
 * // Get all recipes
 * const { recipes } = await listRecipes();
 * 
 * // Search recipes
 * const { recipes } = await listRecipes({ search: 'pasta' });
 * 
 * // Filter by category and tags
 * const { recipes } = await listRecipes({
 *   category: 'main',
 *   tags: ['vegetarian', 'quick']
 * });
 * ```
 */
export async function listRecipes(filters: RecipeFilters = {}): Promise<RecipeListResult> {
    try {
        let query = supabase
            .from('recipes')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply text search filter
        if (filters.search && filters.search.trim()) {
            // Use ilike for simple search. For production, consider pg_trgm similarity.
            query = query.ilike('name', `%${filters.search.trim()}%`);
        }

        // Apply category filter
        if (filters.category) {
            query = query.eq('category', filters.category);
        }

        // Apply tags filter (recipes must contain ALL specified tags)
        if (filters.tags && filters.tags.length > 0) {
            query = query.contains('tags', filters.tags);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch recipes: ${error.message}`);
        }

        return { recipes: data ?? [], error: null };
    } catch (error) {
        return { recipes: [], error: error as Error };
    }
}

// ============================================================================
// GET RECIPE BY ID
// ============================================================================

/**
 * Get a single recipe with its ingredients.
 * 
 * @param id - Recipe UUID
 * @returns Recipe with ingredients, or null if not found
 * 
 * @example
 * ```ts
 * const { recipe, error } = await getRecipeById('uuid-here');
 * if (recipe) {
 *   console.log(recipe.name, recipe.ingredients);
 * }
 * ```
 */
export async function getRecipeById(id: string): Promise<RecipeResult> {
    try {
        // Fetch recipe
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', id)
            .single();

        if (recipeError) {
            if (recipeError.code === 'PGRST116') {
                // Not found
                return { recipe: null, error: null };
            }
            throw new Error(`Failed to fetch recipe: ${recipeError.message}`);
        }

        // Fetch ingredients
        const { data: ingredients, error: ingredientsError } = await supabase
            .from('ingredients')
            .select('*')
            .eq('recipe_id', id)
            .order('created_at', { ascending: true });

        if (ingredientsError) {
            throw new Error(`Failed to fetch ingredients: ${ingredientsError.message}`);
        }

        return {
            recipe: {
                ...recipe,
                ingredients: ingredients ?? [],
            },
            error: null,
        };
    } catch (error) {
        return { recipe: null, error: error as Error };
    }
}

// ============================================================================
// CREATE RECIPE
// ============================================================================

/**
 * Create a new recipe with ingredients.
 * 
 * This performs two operations:
 * 1. Insert the recipe
 * 2. Insert all ingredients
 * 
 * Note: For atomic guarantees, use Supabase transactions or an RPC function.
 * 
 * @param input - Recipe data with ingredients
 * @returns The created recipe with ingredients
 * 
 * @example
 * ```ts
 * const { recipe, error } = await createRecipe({
 *   name: 'Pasta Carbonara',
 *   category: 'main',
 *   tags: ['italian', 'quick'],
 *   ingredients: [
 *     { name: 'Spaghetti', quantity: 400, unit: 'g', aisle: 'pasta' },
 *     { name: 'Eggs', quantity: 4, unit: null, aisle: 'dairy' },
 *   ]
 * });
 * ```
 */
export async function createRecipe(input: RecipeInput): Promise<RecipeResult> {
    try {
        // Get current user ID
        const userId = await getCurrentUserId();
        if (!userId) {
            throw new Error('User must be authenticated to create recipes');
        }

        // Prepare recipe insert data
        const recipeInsert: RecipeInsert = {
            user_id: userId,
            name: input.name,
            description: input.description ?? null,
            image_url: input.image_url ?? null,
            category: input.category ?? null,
            tags: input.tags ?? [],
            prep_time_minutes: input.prep_time_minutes ?? null,
            source_url: input.source_url ?? null,
        };

        // Insert recipe
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert(recipeInsert)
            .select()
            .single();

        if (recipeError) {
            throw new Error(`Failed to create recipe: ${recipeError.message}`);
        }

        // Insert ingredients if any
        let ingredients: Ingredient[] = [];
        if (input.ingredients && input.ingredients.length > 0) {
            const ingredientInserts: IngredientInsert[] = input.ingredients.map((ing) => ({
                recipe_id: recipe.id,
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                aisle: ing.aisle,
            }));

            const { data: insertedIngredients, error: ingredientsError } = await supabase
                .from('ingredients')
                .insert(ingredientInserts)
                .select();

            if (ingredientsError) {
                // Recipe was created but ingredients failed - log and continue
                console.error('Failed to insert ingredients:', ingredientsError);
            } else {
                ingredients = insertedIngredients ?? [];
            }
        }

        return {
            recipe: {
                ...recipe,
                ingredients,
            },
            error: null,
        };
    } catch (error) {
        return { recipe: null, error: error as Error };
    }
}

// ============================================================================
// UPDATE RECIPE
// ============================================================================

/**
 * Update an existing recipe.
 * 
 * Note: This only updates recipe fields, not ingredients.
 * To update ingredients, delete and re-create them.
 * 
 * @param id - Recipe UUID
 * @param updates - Fields to update
 * @returns The updated recipe
 * 
 * @example
 * ```ts
 * const { recipe, error } = await updateRecipe('uuid', {
 *   name: 'Updated Name',
 *   category: 'dessert'
 * });
 * ```
 */
export async function updateRecipe(
    id: string,
    updates: Partial<RecipeInput>
): Promise<RecipeResult> {
    try {
        // Prepare update data (exclude ingredients and undefined values)
        const recipeUpdate: RecipeUpdate = {};

        if (updates.name !== undefined) recipeUpdate.name = updates.name;
        if (updates.description !== undefined) recipeUpdate.description = updates.description;
        if (updates.image_url !== undefined) recipeUpdate.image_url = updates.image_url;
        if (updates.category !== undefined) recipeUpdate.category = updates.category;
        if (updates.tags !== undefined) recipeUpdate.tags = updates.tags;
        if (updates.prep_time_minutes !== undefined) recipeUpdate.prep_time_minutes = updates.prep_time_minutes;
        if (updates.source_url !== undefined) recipeUpdate.source_url = updates.source_url;

        const { error: recipeError } = await supabase
            .from('recipes')
            .update(recipeUpdate)
            .eq('id', id)
            .select()
            .single();

        if (recipeError) {
            throw new Error(`Failed to update recipe: ${recipeError.message}`);
        }

        // If ingredients were provided, replace them
        if (updates.ingredients !== undefined) {
            // Delete existing ingredients
            await supabase.from('ingredients').delete().eq('recipe_id', id);

            // Insert new ingredients
            if (updates.ingredients.length > 0) {
                const ingredientInserts: IngredientInsert[] = updates.ingredients.map((ing) => ({
                    recipe_id: id,
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    aisle: ing.aisle,
                }));

                await supabase.from('ingredients').insert(ingredientInserts);
            }
        }

        // Fetch updated recipe with ingredients
        return getRecipeById(id);
    } catch (error) {
        return { recipe: null, error: error as Error };
    }
}

// ============================================================================
// DELETE RECIPE
// ============================================================================

/**
 * Delete a recipe and all its ingredients (cascade).
 * 
 * @param id - Recipe UUID
 * @returns Success status
 * 
 * @example
 * ```ts
 * const { success, error } = await deleteRecipe('uuid');
 * ```
 */
export async function deleteRecipe(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete recipe: ${error.message}`);
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}

// ============================================================================
// UTILITY: GET CATEGORIES
// ============================================================================

/**
 * Get all unique categories from user's recipes.
 * Useful for filter dropdowns.
 * 
 * @returns List of unique category names
 */
export async function getCategories(): Promise<string[]> {
    const { data, error } = await supabase
        .from('recipes')
        .select('category')
        .not('category', 'is', null);

    if (error || !data) {
        return [];
    }

    // Extract unique categories
    const categories = new Set<string>();
    data.forEach((row) => {
        if (row.category) {
            categories.add(row.category);
        }
    });

    return Array.from(categories).sort();
}

/**
 * Get all unique tags from user's recipes.
 * Useful for filter dropdowns.
 * 
 * @returns List of unique tag names
 */
export async function getTags(): Promise<string[]> {
    const { data, error } = await supabase
        .from('recipes')
        .select('tags');

    if (error || !data) {
        return [];
    }

    // Extract unique tags from all recipes
    const tags = new Set<string>();
    data.forEach((row) => {
        if (row.tags) {
            row.tags.forEach((tag) => tags.add(tag));
        }
    });

    return Array.from(tags).sort();
}
