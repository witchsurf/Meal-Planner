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

            const processedItems: string[] = [];

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

                processedItems.push(quantityData.itemId);
            }

            // Remove processed items from the quantities state
            setQuantities(prev => {
                const newQuantities = { ...prev };
                processedItems.forEach(itemId => {
                    delete newQuantities[itemId];
                });
                return newQuantities;
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                if (onSuccess) onSuccess();
            }, 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    // Filter to only show items that haven't been processed yet
    const activeItems = checkedItems.filter(item => quantities[item.id]);
    const groupedItems = groupItemsByAisle(activeItems);
    const totalItems = activeItems.length;

    if (totalItems === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-gray-600">
                    {checkedItems.length === 0
                        ? "Aucun produit coché dans cette liste de courses."
                        : "Tous les produits ont été traités avec succès !"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    {checkedItems.length === 0
                        ? "Cochez des produits dans votre liste de courses pour pouvoir les remettre en stock."
                        : "Vous pouvez retourner à la liste de courses ou sélectionner une autre liste."}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <form onSubmit={handleSubmit}>
                <div className="p-4 md:p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-red-800 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-green-800 font-medium">
                                    Inventaire mis à jour avec succès !
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 md:space-y-6">
                        {Array.from(groupedItems.entries()).map(([aisle, items]) => (
                            <div key={aisle} className="border-b border-gray-200 last:border-0 pb-4 md:pb-6 last:pb-0">
                                <h3 className="text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 md:mb-4 flex items-center">
                                    <span className="bg-gray-100 px-3 py-1 rounded-full">{aisle}</span>
                                    <span className="ml-2 text-xs text-gray-500">({items.length})</span>
                                </h3>
                                <div className="space-y-2 md:space-y-3">
                                    {items.map((item) => {
                                        const qData = quantities[item.id];
                                        if (!qData) return null;
                                        return (
                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 md:p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 text-base md:text-lg truncate">{item.name}</div>
                                                    <div className="text-xs md:text-sm text-gray-500 mt-1">
                                                        💡 Suggéré: {qData.suggestedQuantity} {qData.unit || ''}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <label className="text-sm text-gray-600 hidden sm:block">Acheté:</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={qData.actualQuantity}
                                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="0"
                                                            className="w-20 md:w-24 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-semibold text-lg"
                                                            disabled={loading}
                                                        />
                                                        <span className="text-sm md:text-base text-gray-700 font-medium min-w-[3rem] md:min-w-[4rem]">
                                                            {qData.unit || 'unité'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 md:px-6 py-4 rounded-b-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t-2 border-gray-200">
                    <div className="text-sm md:text-base text-gray-700 font-medium">
                        📦 {totalItems} produit{totalItems !== 1 ? 's' : ''} à ajouter au stock
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Mise à jour...
                            </span>
                        ) : (
                            '✓ Mettre à jour l\'inventaire'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
