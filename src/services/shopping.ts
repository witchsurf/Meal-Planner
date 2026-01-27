/**
 * Shopping List Service
 * 
 * Handles shopping list generation, retrieval, and item management.
 * 
 * Key feature: generateShoppingList aggregates ingredients from planned meals,
 * multiplies by servings, and groups by aisle.
 * 
 * Security is enforced by RLS.
 */

import { supabase, getCurrentUserId } from '../lib/supabase';
import { getLowStockItems } from './inventory';
import type {
    ShoppingList,
    ShoppingListItem,
    ShoppingListWithItems,
    Ingredient,
} from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ShoppingListResult {
    list: ShoppingListWithItems | null;
    error: Error | null;
}

export interface ShoppingListsResult {
    lists: ShoppingList[];
    error: Error | null;
}

/** Individual quantity with unit for an ingredient */
interface QuantityUnit {
    quantity: number;
    unit: string;
}

/** Aggregated item for shopping list generation */
interface AggregatedItem {
    name: string;
    quantities: QuantityUnit[]; // Support multiple quantities with different units
    aisle: string | null;
    isLowStock?: boolean; // Flag for items from low-stock inventory
}

// ============================================================================
// GENERATE SHOPPING LIST
// ============================================================================

/**
 * Generate a shopping list from planned meals in a date range.
 * 
 * This function:
 * 1. Fetches all planned meals in the date range
 * 2. Joins with recipes and ingredients
 * 3. Multiplies ingredient quantities by servings
 * 4. Aggregates items by (name, unit) to combine duplicates
 * 5. Groups by aisle for organized shopping
 * 6. Creates a shopping_list and shopping_list_items
 * 
 * **Important**: This is done client-side for simplicity.
 * For production atomicity, use the RPC function `generate_shopping_list`.
 * 
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns The created shopping list with items
 * 
 * @example
 * ```ts
 * // Generate shopping list for the week
 * const { list, error } = await generateShoppingList('2024-01-01', '2024-01-07');
 * 
 * // Items are grouped by aisle
 * const byAisle = list.items.reduce((acc, item) => {
 *   const aisle = item.aisle ?? 'Other';
 *   acc[aisle] = acc[aisle] || [];
 *   acc[aisle].push(item);
 *   return acc;
 * }, {});
 * ```
 */
export async function generateShoppingList(
    startDate: string,
    endDate: string
): Promise<ShoppingListResult> {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            throw new Error('User must be authenticated');
        }

        // -------------------------------------------------------------------------
        // Step 1: Fetch planned meals with recipes and ingredients
        // -------------------------------------------------------------------------
        const { data: meals, error: mealsError } = await supabase
            .from('planned_meals')
            .select(`
        id,
        servings,
        recipe:recipes!planned_meals_recipe_id_fkey(
          id,
          base_servings,
          ingredients(*)
        )
      `)
            .gte('date', startDate)
            .lte('date', endDate);

        if (mealsError) {
            throw new Error(`Failed to fetch planned meals: ${mealsError.message}`);
        }

        // -------------------------------------------------------------------------
        // Step 1.5: Fetch current inventory for deduplication
        // -------------------------------------------------------------------------
        const { data: inventory } = await supabase
            .from('inventory')
            .select('name, quantity, unit');

        const inventoryMap = new Map<string, Map<string, number>>();
        for (const item of inventory ?? []) {
            const normalized = normalizeIngredientName(item.name);
            const unit = normalizeUnit(item.unit);

            if (!inventoryMap.has(normalized)) {
                inventoryMap.set(normalized, new Map());
            }
            const unitMap = inventoryMap.get(normalized)!;
            unitMap.set(unit, (unitMap.get(unit) || 0) + (item.quantity || 0));
        }

        // -------------------------------------------------------------------------
        // Step 2: Aggregate ingredients with PROPORTIONAL calculation
        // -------------------------------------------------------------------------
        // Formula: ingredient_qty * (planned_servings / recipe_base_servings)
        // Normalization: merge same ingredients by NAME only (ignore unit to avoid duplicates)
        const aggregated = new Map<string, AggregatedItem>();

        for (const meal of meals ?? []) {
            const recipe = meal.recipe as { id: string; base_servings?: number; ingredients: Ingredient[] } | null;
            if (!recipe || !recipe.ingredients) continue;

            const plannedServings = meal.servings || 1;
            const baseServings = recipe.base_servings || 4;
            const multiplier = plannedServings / baseServings;

            for (const ingredient of recipe.ingredients) {
                // Normalize ingredient name only (not unit) to group all "miel" together
                const normalizedName = normalizeIngredientName(ingredient.name);
                const normalizedUnit = normalizeUnit(ingredient.unit) || '';

                const existing = aggregated.get(normalizedName);
                const neededQuantity = (ingredient.quantity ?? 1) * multiplier;

                if (existing) {
                    // Check if we already have this unit
                    const existingQty = existing.quantities.find(q => q.unit === normalizedUnit);
                    if (existingQty) {
                        existingQty.quantity += neededQuantity;
                    } else {
                        existing.quantities.push({ quantity: neededQuantity, unit: normalizedUnit });
                    }
                } else {
                    aggregated.set(normalizedName, {
                        name: capitalizeFirst(normalizedName),
                        quantities: [{ quantity: neededQuantity, unit: normalizedUnit }],
                        aisle: ingredient.aisle,
                    });
                }
            }
        }

        // -------------------------------------------------------------------------
        // Step 2.1: Deduct current inventory from needed ingredients
        // -------------------------------------------------------------------------
        for (const [name, item] of aggregated.entries()) {
            const stockByUnit = inventoryMap.get(name);
            if (!stockByUnit) continue;

            // Deduct stock for each quantity/unit combination
            const remainingQuantities: QuantityUnit[] = [];

            for (const qu of item.quantities) {
                const inStock = stockByUnit.get(qu.unit) || 0;
                if (inStock > 0) {
                    const remainingNeeded = Math.max(0, qu.quantity - inStock);
                    stockByUnit.set(qu.unit, Math.max(0, inStock - qu.quantity));

                    if (remainingNeeded > 0) {
                        remainingQuantities.push({ quantity: remainingNeeded, unit: qu.unit });
                    }
                } else {
                    remainingQuantities.push(qu);
                }
            }

            if (remainingQuantities.length === 0) {
                aggregated.delete(name);
            } else {
                item.quantities = remainingQuantities;
            }
        }

        // -------------------------------------------------------------------------
        // Step 2.5: Add low-stock inventory items to shopping list
        // -------------------------------------------------------------------------
        const { items: lowStockItems } = await getLowStockItems();

        for (const item of lowStockItems) {
            const normalizedName = normalizeIngredientName(item.name);
            const normalizedUnit = normalizeUnit(item.unit) || '';

            // Calculate how much to buy to reach min_quantity
            const stockByUnit = inventoryMap.get(normalizedName);
            const currentStock = stockByUnit?.get(normalizedUnit) ?? item.quantity;
            let toBuy = Math.max(0, item.min_quantity - currentStock);

            // If we are at or below min_quantity, ensure we buy something
            if (currentStock <= item.min_quantity && toBuy === 0) {
                toBuy = 1; // Minimum replenishment to get back above threshold
            }

            if (toBuy <= 0) continue;

            const existing = aggregated.get(normalizedName);
            if (existing) {
                // If already in list from recipes, add the low-stock quantity
                const existingQty = existing.quantities.find(q => q.unit === normalizedUnit);
                if (existingQty) {
                    existingQty.quantity += toBuy;
                } else {
                    existing.quantities.push({ quantity: toBuy, unit: normalizedUnit });
                }
                existing.isLowStock = true;
            } else {
                aggregated.set(normalizedName, {
                    name: capitalizeFirst(normalizedName),
                    quantities: [{ quantity: toBuy, unit: normalizedUnit }],
                    aisle: item.aisle,
                    isLowStock: true,
                });
            }
        }

        // -------------------------------------------------------------------------
        // Step 3: Create shopping list
        // -------------------------------------------------------------------------
        const { data: list, error: listError } = await supabase
            .from('shopping_lists')
            .insert({
                user_id: userId,
                start_date: startDate,
                end_date: endDate,
            })
            .select()
            .single();

        if (listError) {
            throw new Error(`Failed to create shopping list: ${listError.message}`);
        }

        // -------------------------------------------------------------------------
        // Step 4: Create shopping list items
        // -------------------------------------------------------------------------
        const items: ShoppingListItem[] = [];

        if (aggregated.size > 0) {
            // Flatten items with multiple units into separate rows
            const itemInserts = Array.from(aggregated.values()).flatMap((item) => {
                // Create one item per unit/quantity combination
                return item.quantities.map(qu => ({
                    shopping_list_id: list.id,
                    name: item.name,
                    quantity: qu.quantity,
                    unit: qu.unit || null,
                    // Prefix aisle with 'lowstock:' for low-stock items (UI detection)
                    aisle: item.isLowStock ? `lowstock:${item.aisle || 'other'}` : item.aisle,
                    checked: false,
                }));
            });

            const { data: insertedItems, error: itemsError } = await supabase
                .from('shopping_list_items')
                .insert(itemInserts)
                .select();

            if (itemsError) {
                console.error('Failed to insert shopping list items:', itemsError);
            } else {
                items.push(...(insertedItems ?? []));
            }
        }

        return {
            list: {
                ...list,
                items,
            },
            error: null,
        };
    } catch (error) {
        return { list: null, error: error as Error };
    }
}

/**
 * Generate shopping list using the RPC function (recommended for production).
 * 
 * This is atomic - either the entire list is created or nothing is.
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns The created shopping list ID
 */
export async function generateShoppingListRpc(
    startDate: string,
    endDate: string
): Promise<{ listId: string | null; error: Error | null }> {
    try {
        const { data, error } = await supabase.rpc('generate_shopping_list', {
            p_start_date: startDate,
            p_end_date: endDate,
        });

        if (error) {
            throw new Error(`Failed to generate shopping list: ${error.message}`);
        }

        return { listId: data, error: null };
    } catch (error) {
        return { listId: null, error: error as Error };
    }
}

// ============================================================================
// GET SHOPPING LIST
// ============================================================================

/**
 * Get a shopping list with all its items.
 * 
 * @param id - Shopping list UUID
 * @returns Shopping list with items, sorted by aisle
 */
export async function getShoppingList(id: string): Promise<ShoppingListResult> {
    try {
        // Fetch list
        const { data: list, error: listError } = await supabase
            .from('shopping_lists')
            .select('*')
            .eq('id', id)
            .single();

        if (listError) {
            if (listError.code === 'PGRST116') {
                return { list: null, error: null };
            }
            throw new Error(`Failed to fetch shopping list: ${listError.message}`);
        }

        // Fetch items sorted by aisle
        const { data: items, error: itemsError } = await supabase
            .from('shopping_list_items')
            .select('*')
            .eq('shopping_list_id', id)
            .order('aisle', { ascending: true, nullsFirst: false })
            .order('name', { ascending: true });

        if (itemsError) {
            throw new Error(`Failed to fetch shopping list items: ${itemsError.message}`);
        }

        return {
            list: {
                ...list,
                items: items ?? [],
            },
            error: null,
        };
    } catch (error) {
        return { list: null, error: error as Error };
    }
}

// ============================================================================
// LIST SHOPPING LISTS
// ============================================================================

/**
 * List all shopping lists for the current user.
 * 
 * @returns List of shopping lists (without items)
 */
export async function listShoppingLists(): Promise<ShoppingListsResult> {
    try {
        const { data, error } = await supabase
            .from('shopping_lists')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch shopping lists: ${error.message}`);
        }

        return { lists: data ?? [], error: null };
    } catch (error) {
        return { lists: [], error: error as Error };
    }
}

// ============================================================================
// TOGGLE ITEM CHECKED
// ============================================================================

/**
 * Toggle the checked status of a shopping list item.
 * 
 * @param itemId - Shopping list item UUID
 * @param checked - New checked status
 * @returns Updated item
 */
export async function toggleShoppingListItemChecked(
    itemId: string,
    checked: boolean
): Promise<{ item: ShoppingListItem | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('shopping_list_items')
            .update({ checked })
            .eq('id', itemId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update item: ${error.message}`);
        }

        return { item: data, error: null };
    } catch (error) {
        return { item: null, error: error as Error };
    }
}

// ============================================================================
// DELETE SHOPPING LIST
// ============================================================================

/**
 * Delete a shopping list and all its items.
 * 
 * @param id - Shopping list UUID
 * @returns Success status
 */
export async function deleteShoppingList(
    id: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('shopping_lists')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete shopping list: ${error.message}`);
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}

// ============================================================================
// UTILITY: GROUP ITEMS BY AISLE
// ============================================================================

/**
 * Group shopping list items by aisle for display.
 * Handles lowstock: prefix for items that need restocking.
 * 
 * @param items - Shopping list items
 * @returns Map of aisle name to items
 */
export function groupItemsByAisle(
    items: ShoppingListItem[]
): Map<string, ShoppingListItem[]> {
    const grouped = new Map<string, ShoppingListItem[]>();

    for (const item of items) {
        // Strip lowstock: prefix for grouping, but keep it in the item for UI detection
        const rawAisle = item.aisle?.startsWith('lowstock:')
            ? item.aisle.replace('lowstock:', '')
            : item.aisle;
        const aisle = translateAisle(rawAisle) ?? 'Autre';
        const existing = grouped.get(aisle) ?? [];
        existing.push(item);
        grouped.set(aisle, existing);
    }

    return grouped;
}

/**
 * Check if an item is marked as low-stock.
 */
export function isLowStockItem(item: ShoppingListItem): boolean {
    return item.aisle?.startsWith('lowstock:') ?? false;
}

// ============================================================================
// INGREDIENT NORMALIZATION
// ============================================================================

/** English to French ingredient translations */
const INGREDIENT_TRANSLATIONS: Record<string, string> = {
    // Common ingredients
    'olive oil': 'huile d\'olive',
    'oil': 'huile',
    'garlic': 'ail',
    'onion': 'oignon',
    'onions': 'oignon',
    'red onion': 'oignon rouge',
    'tomato': 'tomate',
    'tomatoes': 'tomate',
    'cherry tomatoes': 'tomates cerises',
    'tomato paste': 'concentré de tomate',
    'salt': 'sel',
    'pepper': 'poivre',
    'black pepper': 'poivre noir',
    'sugar': 'sucre',
    'flour': 'farine',
    'butter': 'beurre',
    'egg': 'oeuf',
    'eggs': 'oeufs',
    'milk': 'lait',
    'cream': 'crème',
    'cheese': 'fromage',
    'chicken': 'poulet',
    'beef': 'boeuf',
    'pork': 'porc',
    'fish': 'poisson',
    'rice': 'riz',
    'pasta': 'pâtes',
    'potato': 'pomme de terre',
    'potatoes': 'pommes de terre',
    'carrot': 'carotte',
    'carrots': 'carottes',
    'lemon': 'citron',
    'lettuce': 'laitue',
    'cucumber': 'concombre',
    'avocado': 'avocat',
    'bell pepper': 'poivron',
    'berries': 'fruits rouges',
    'parsley': 'persil',
    'basil': 'basilic',
    'thyme': 'thym',
    'oregano': 'origan',
    'ginger': 'gingembre',
    'soy sauce': 'sauce soja',
    'honey': 'miel',
    'vinegar': 'vinaigre',
    'water': 'eau',
    'broth': 'bouillon',
    'stock': 'bouillon',
    'chicken broth': 'bouillon de poulet',
    'beef broth': 'bouillon de boeuf',
};

/** Normalize singular/plural French */
const PLURAL_NORMALIZATIONS: Record<string, string> = {
    'oignons': 'oignon',
    'tomates': 'tomate',
    'carottes': 'carotte',
    'pommes de terre': 'pomme de terre',
    'oeufs': 'oeuf',
    'gousses': 'gousse',
};

/** Aisle translations */
const AISLE_TRANSLATIONS: Record<string, string> = {
    'produce': 'Fruits & Légumes',
    'meat': 'Boucherie',
    'dairy': 'Produits laitiers',
    'bakery': 'Boulangerie',
    'pasta': 'Pâtes & Riz',
    'grains': 'Céréales',
    'canned': 'Conserves',
    'frozen': 'Surgelés',
    'spices': 'Épices',
    'condiments': 'Condiments',
    'oils': 'Huiles',
    'beverages': 'Boissons',
    'snacks': 'Snacks',
    'international': 'Produits du monde',
    'other': 'Autre',
    'asian': 'Asiatique',
    'breakfast': 'Petit-déjeuner',
    'deli': 'Traiteur',
};

/** Normalize unit names */
const UNIT_NORMALIZATIONS: Record<string, string> = {
    'tbsp': 'c. à soupe',
    'tablespoon': 'c. à soupe',
    'tablespoons': 'c. à soupe',
    'cuil. à soupe': 'c. à soupe',
    'tsp': 'c. à café',
    'teaspoon': 'c. à café',
    'teaspoons': 'c. à café',
    'cup': 'tasse',
    'cups': 'tasse',
    'clove': 'gousse',
    'cloves': 'gousses',
    'piece': 'pièce',
    'pieces': 'pièces',
    'head': 'pièce',
    'slice': 'tranche',
    'slices': 'tranches',
    'g': 'g',
    'kg': 'kg',
    'ml': 'ml',
    'l': 'l',
};

/**
 * Normalize ingredient name for better aggregation.
 * Translates English to French and normalizes plurals.
 */
function normalizeIngredientName(name: string): string {
    let normalized = name.toLowerCase().trim();

    // Remove leading/trailing punctuation
    normalized = normalized.replace(/^[,.\s]+|[,.\s]+$/g, '');

    // Translate English to French
    if (INGREDIENT_TRANSLATIONS[normalized]) {
        normalized = INGREDIENT_TRANSLATIONS[normalized];
    }

    // Normalize plurals
    if (PLURAL_NORMALIZATIONS[normalized]) {
        normalized = PLURAL_NORMALIZATIONS[normalized];
    }

    // Remove "fresh", "frais", etc.
    normalized = normalized
        .replace(/\bfresh\b/gi, '')
        .replace(/\bfrais\b/gi, '')
        .replace(/\bfraîche?\b/gi, '')
        .trim();

    return normalized;
}

/**
 * Normalize unit for better aggregation.
 */
function normalizeUnit(unit: string | null | undefined): string {
    if (!unit) return '';

    const normalized = unit.toLowerCase().trim();
    return UNIT_NORMALIZATIONS[normalized] || normalized;
}

/**
 * Translate aisle name to French.
 */
function translateAisle(aisle: string | null | undefined): string | null {
    if (!aisle) return null;
    const lower = aisle.toLowerCase();
    return AISLE_TRANSLATIONS[lower] || aisle;
}

/**
 * Capitalize first letter.
 */
function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

