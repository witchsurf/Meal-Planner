/**
 * Restocking Form Component
 *
 * Displays checked items from a shopping list and allows user to input
 * actual purchased quantities to update inventory.
 */

import { useState } from 'react';
import type { ShoppingListWithItems } from '../../lib/database.types';
import { addToInventory, listInventory } from '../../services/inventory';
import { groupItemsByAisle } from '../../services/shopping';

interface RestockingFormProps {
    list: ShoppingListWithItems;
    onSuccess?: () => void;
}

interface QuantityInput {
    itemId: string;
    name: string;
    suggestedQuantity: number;
    actualQuantity: number;
    unit: string | null;
    aisle: string | null;
}

export function RestockingForm({ list, onSuccess }: RestockingFormProps) {
    const checkedItems = list.items.filter(item => item.checked);

    // Initialize quantities from shopping list
    const [quantities, setQuantities] = useState<Record<string, QuantityInput>>(() => {
        const initial: Record<string, QuantityInput> = {};
        checkedItems.forEach(item => {
            initial[item.id] = {
                itemId: item.id,
                name: item.name,
                suggestedQuantity: item.quantity || 0,
                actualQuantity: item.quantity || 0,
                unit: item.unit,
                aisle: item.aisle,
            };
        });
        return initial;
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleQuantityChange = (itemId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setQuantities(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                actualQuantity: numValue,
            },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Get current inventory to check for existing items
            const { items: inventoryItems } = await listInventory();

            // Create a map for quick lookup: normalize name for matching
            const inventoryMap = new Map<string, typeof inventoryItems[0]>();
            inventoryItems.forEach(item => {
                const key = `${item.name.toLowerCase()}|${(item.unit || '').toLowerCase()}`;
                inventoryMap.set(key, item);
            });

            // Process each checked item
            for (const quantityData of Object.values(quantities)) {
                if (quantityData.actualQuantity <= 0) continue;

                // Try to match with existing inventory item
                const key = `${quantityData.name.toLowerCase()}|${(quantityData.unit || '').toLowerCase()}`;
                const existingItem = inventoryMap.get(key);

                // Determine category from aisle
                let category: 'pantry' | 'freezer' | 'cleaning' | 'toiletry' = 'pantry';
                const aisleKey = quantityData.aisle?.toLowerCase().replace('lowstock:', '') || '';

                if (aisleKey.includes('frozen') || aisleKey.includes('surgelés')) {
                    category = 'freezer';
                } else if (aisleKey.includes('cleaning') || aisleKey.includes('nettoyage')) {
                    category = 'cleaning';
                } else if (aisleKey.includes('toiletry') || aisleKey.includes('toilette') || aisleKey.includes('hygiène')) {
                    category = 'toiletry';
                }

                if (existingItem) {
                    // Update existing item by adding quantity
                    await addToInventory({
                        name: existingItem.name,
                        quantity: quantityData.actualQuantity,
                        unit: existingItem.unit,
                        category: existingItem.category,
                        aisle: existingItem.aisle,
                        min_quantity: existingItem.min_quantity,
                    });
                } else {
                    // Add new item to inventory
                    await addToInventory({
                        name: quantityData.name,
                        quantity: quantityData.actualQuantity,
                        unit: quantityData.unit || undefined,
                        category,
                        aisle: quantityData.aisle?.replace('lowstock:', '') || undefined,
                        min_quantity: 0,
                    });
                }
            }

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                if (onSuccess) onSuccess();
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const groupedItems = groupItemsByAisle(checkedItems);
    const totalItems = checkedItems.length;

    if (totalItems === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-gray-600">
                    Aucun produit coché dans cette liste de courses.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Cochez des produits dans votre liste de courses pour pouvoir les remettre en stock.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <form onSubmit={handleSubmit}>
                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800">
                                ✓ Inventaire mis à jour avec succès !
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {Array.from(groupedItems.entries()).map(([aisle, items]) => (
                            <div key={aisle} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                                    {aisle}
                                </h3>
                                <div className="space-y-3">
                                    {items.map((item) => {
                                        const qData = quantities[item.id];
                                        return (
                                            <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">{item.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        Suggéré: {qData.suggestedQuantity} {qData.unit || ''}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={qData.actualQuantity}
                                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        disabled={loading}
                                                    />
                                                    <span className="text-sm text-gray-600 w-16">
                                                        {qData.unit || ''}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        {totalItems} produit{totalItems !== 1 ? 's' : ''} à remettre en stock
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {loading ? 'Mise à jour...' : 'Mettre à jour l\'inventaire'}
                    </button>
                </div>
            </form>
        </div>
    );
}
