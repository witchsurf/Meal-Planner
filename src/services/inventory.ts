/**
 * Inventory Service
 * 
 * Handles home stock/inventory management operations.
 * Tracks items at home, low stock alerts, and expiring items.
 */

import { supabase, getCurrentUserId } from '../lib/supabase';
import type {
    InventoryItem,
    InventoryItemInsert,
    InventoryItemUpdate,
    InventoryInput,
    InventoryCategory,
    InventoryTransaction,
    SmartShoppingItem,
} from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryFilters {
    category?: InventoryCategory;
    lowStock?: boolean;
    expiringSoon?: boolean; // Items expiring within 7 days
    search?: string;
}

export interface InventoryListResult {
    items: InventoryItem[];
    error: Error | null;
}

export interface InventoryItemResult {
    item: InventoryItem | null;
    error: Error | null;
}

// ============================================================================
// LIST INVENTORY
// ============================================================================

/**
 * List all inventory items with optional filtering.
 */
export async function listInventory(
    filters: InventoryFilters = {}
): Promise<InventoryListResult> {
    try {
        let query = supabase
            .from('inventory')
            .select('*')
            .order('category')
            .order('name');

        // Filter by category
        if (filters.category) {
            query = query.eq('category', filters.category);
        }

        // Note: Low stock is filtered client-side since we compare quantity to min_quantity

        // Filter expiring soon (within 7 days)
        if (filters.expiringSoon) {
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            query = query
                .not('expiry_date', 'is', null)
                .lte('expiry_date', sevenDaysFromNow.toISOString().split('T')[0]);
        }

        // Search by name
        if (filters.search?.trim()) {
            query = query.ilike('name', `%${filters.search.trim()}%`);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch inventory: ${error.message}`);
        }

        // Client-side filter for low stock if needed
        let items = data ?? [];
        if (filters.lowStock) {
            items = items.filter(item => item.quantity <= item.min_quantity);
        }

        return { items, error: null };
    } catch (error) {
        return { items: [], error: error as Error };
    }
}

// ============================================================================
// GET ITEM BY ID
// ============================================================================

/**
 * Get a single inventory item by ID.
 */
export async function getInventoryItem(id: string): Promise<InventoryItemResult> {
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { item: null, error: null };
            }
            throw new Error(`Failed to fetch item: ${error.message}`);
        }

        return { item: data, error: null };
    } catch (error) {
        return { item: null, error: error as Error };
    }
}

// ============================================================================
// ADD TO INVENTORY
// ============================================================================

/**
 * Add a new item to inventory or update quantity if exists.
 */
export async function addToInventory(input: InventoryInput): Promise<InventoryItemResult> {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            throw new Error('User must be authenticated');
        }

        // Check if item already exists (handle unit being null or undefined)
        let existingQuery = supabase
            .from('inventory')
            .select('id, quantity')
            .eq('user_id', userId)
            .ilike('name', input.name);

        if (input.unit) {
            existingQuery = existingQuery.eq('unit', input.unit);
        } else {
            existingQuery = existingQuery.is('unit', null);
        }

        const { data: existing } = await existingQuery.single();

        if (existing) {
            // Update existing item quantity
            const newQuantity = existing.quantity + input.quantity;

            const { data, error } = await supabase
                .from('inventory')
                .update({ quantity: newQuantity })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw new Error(`Failed to update inventory: ${error.message}`);

            // Log transaction
            await logTransaction(existing.id, 'add', input.quantity, existing.quantity, newQuantity);

            return { item: data, error: null };
        }

        // Insert new item
        const insertData: InventoryItemInsert = {
            user_id: userId,
            name: input.name,
            quantity: input.quantity,
            unit: input.unit ?? null,
            category: input.category ?? 'food',
            aisle: input.aisle ?? null,
            min_quantity: input.min_quantity ?? 0,
            expiry_date: input.expiry_date ?? null,
            location: input.location ?? null,
        };

        const { data, error } = await supabase
            .from('inventory')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to add to inventory: ${error.message}`);
        }

        // Log transaction
        await logTransaction(data.id, 'add', input.quantity, 0, input.quantity);

        return { item: data, error: null };
    } catch (error) {
        return { item: null, error: error as Error };
    }
}

// ============================================================================
// UPDATE INVENTORY ITEM
// ============================================================================

/**
 * Update an inventory item.
 */
export async function updateInventoryItem(
    id: string,
    updates: Partial<InventoryInput>
): Promise<InventoryItemResult> {
    try {
        // Get current state for transaction logging
        const { item: current } = await getInventoryItem(id);
        if (!current) {
            throw new Error('Item not found');
        }

        const updateData: InventoryItemUpdate = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
        if (updates.unit !== undefined) updateData.unit = updates.unit;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.aisle !== undefined) updateData.aisle = updates.aisle;
        if (updates.min_quantity !== undefined) updateData.min_quantity = updates.min_quantity;
        if (updates.expiry_date !== undefined) updateData.expiry_date = updates.expiry_date;
        if (updates.location !== undefined) updateData.location = updates.location;

        const { data, error } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update item: ${error.message}`);
        }

        // Log quantity change if applicable
        if (updates.quantity !== undefined && updates.quantity !== current.quantity) {
            const diff = updates.quantity - current.quantity;
            await logTransaction(
                id,
                diff > 0 ? 'add' : 'remove',
                diff,
                current.quantity,
                updates.quantity
            );
        }

        return { item: data, error: null };
    } catch (error) {
        return { item: null, error: error as Error };
    }
}

// ============================================================================
// REMOVE FROM STOCK
// ============================================================================

/**
 * Remove quantity from an inventory item.
 */
export async function removeFromStock(
    id: string,
    quantity: number,
    note?: string
): Promise<InventoryItemResult> {
    try {
        const { item: current } = await getInventoryItem(id);
        if (!current) {
            throw new Error('Item not found');
        }

        const newQuantity = Math.max(0, current.quantity - quantity);

        const { data, error } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to remove from stock: ${error.message}`);
        }

        await logTransaction(id, 'remove', -quantity, current.quantity, newQuantity, note);

        return { item: data, error: null };
    } catch (error) {
        return { item: null, error: error as Error };
    }
}

// ============================================================================
// DELETE INVENTORY ITEM
// ============================================================================

/**
 * Delete an inventory item completely.
 */
export async function deleteInventoryItem(
    id: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete item: ${error.message}`);
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}

// ============================================================================
// LOW STOCK ITEMS
// ============================================================================

/**
 * Get items that are below their minimum stock level.
 */
export async function getLowStockItems(): Promise<InventoryListResult> {
    return listInventory({ lowStock: true });
}

// ============================================================================
// EXPIRING ITEMS
// ============================================================================

/**
 * Get items expiring within the next 7 days.
 */
export async function getExpiringItems(): Promise<InventoryListResult> {
    return listInventory({ expiringSoon: true });
}

// ============================================================================
// DEDUCT MEAL INGREDIENTS
// ============================================================================

/**
 * Deduct ingredients for a planned meal from inventory.
 * Uses the database function for atomic operation.
 */
export async function deductMealIngredients(
    plannedMealId: string
): Promise<{ deducted: unknown; error: Error | null }> {
    try {
        const { data, error } = await supabase.rpc('deduct_meal_ingredients', {
            p_planned_meal_id: plannedMealId,
        });

        if (error) {
            throw new Error(`Failed to deduct ingredients: ${error.message}`);
        }

        return { deducted: data, error: null };
    } catch (error) {
        return { deducted: null, error: error as Error };
    }
}

// ============================================================================
// SMART SHOPPING LIST
// ============================================================================

/**
 * Generate a shopping list that subtracts current inventory.
 */
export async function getSmartShoppingList(
    startDate: string,
    endDate: string
): Promise<{ items: SmartShoppingItem[]; error: Error | null }> {
    try {
        const { data, error } = await supabase.rpc('generate_smart_shopping_list', {
            p_start_date: startDate,
            p_end_date: endDate,
        });

        if (error) {
            throw new Error(`Failed to generate smart list: ${error.message}`);
        }

        return { items: data ?? [], error: null };
    } catch (error) {
        return { items: [], error: error as Error };
    }
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

/**
 * Get transaction history for an inventory item.
 */
export async function getItemTransactions(
    inventoryId: string
): Promise<{ transactions: InventoryTransaction[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('inventory_transactions')
            .select('*')
            .eq('inventory_id', inventoryId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            throw new Error(`Failed to fetch transactions: ${error.message}`);
        }

        return { transactions: data ?? [], error: null };
    } catch (error) {
        return { transactions: [], error: error as Error };
    }
}

// ============================================================================
// HELPER: LOG TRANSACTION
// ============================================================================

async function logTransaction(
    inventoryId: string,
    type: 'add' | 'remove' | 'adjust' | 'meal_used' | 'expired',
    quantity: number,
    quantityBefore: number,
    quantityAfter: number,
    note?: string,
    plannedMealId?: string
): Promise<void> {
    try {
        await supabase.from('inventory_transactions').insert({
            inventory_id: inventoryId,
            type,
            quantity,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            note,
            planned_meal_id: plannedMealId,
        });
    } catch (error) {
        console.error('Failed to log transaction:', error);
    }
}
