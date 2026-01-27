/**
 * Restocking Page
 *
 * Allows users to restock their inventory from checked shopping list items.
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RestockingForm } from '../components/restocking/RestockingForm';
import {
    listShoppingLists,
    getShoppingList,
} from '../services/shopping';
import type { ShoppingList, ShoppingListWithItems } from '../lib/database.types';

export function RestockingPage() {
    // State
    const [lists, setLists] = useState<ShoppingList[]>([]);
    const [selectedList, setSelectedList] = useState<ShoppingListWithItems | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load shopping lists
    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = async () => {
        setLoading(true);
        setError(null);

        const { lists: data, error: err } = await listShoppingLists();

        if (err) {
            setError(err.message);
            setLoading(false);
            return;
        }

        setLists(data);

        // Auto-select the most recent list
        if (data.length > 0 && !selectedList) {
            await selectList(data[0].id);
        }

        setLoading(false);
    };

    const selectList = async (id: string) => {
        const { list, error: err } = await getShoppingList(id);

        if (err) {
            setError(err.message);
            return;
        }

        setSelectedList(list);
    };

    const checkedItemsCount = selectedList?.items.filter(item => item.checked).length || 0;

    return (
        <div className="max-w-7xl mx-auto p-3 md:p-4 lg:p-6">
            <div className="mb-4 md:mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📥 Restockage</h1>
                <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
                    Mettez à jour votre inventaire avec les produits achetés
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 md:p-4 mb-4">
                    <p className="text-red-800 text-sm md:text-base">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="text-gray-600 mt-4">Chargement...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* Sidebar: Shopping Lists */}
                    <div className="lg:col-span-1 order-2 lg:order-1">
                        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4">
                            <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">🛒 Listes de courses</h2>

                            {lists.length === 0 ? (
                                <p className="text-gray-500 text-xs md:text-sm">
                                    Aucune liste de courses disponible.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {lists.map((list) => (
                                        <button
                                            key={list.id}
                                            onClick={() => selectList(list.id)}
                                            className={`w-full text-left p-2 md:p-3 rounded-lg transition-all ${
                                                selectedList?.id === list.id
                                                    ? 'bg-green-50 border-2 border-green-500 shadow-sm'
                                                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="text-xs md:text-sm font-medium text-gray-900">
                                                📅 {format(new Date(list.start_date), 'dd MMM')} - {format(new Date(list.end_date), 'dd MMM yyyy')}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {format(new Date(list.created_at), 'dd/MM/yyyy')}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main: Restocking Form */}
                    <div className="lg:col-span-3 order-1 lg:order-2">
                        {selectedList ? (
                            <>
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-3 md:p-4 mb-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <svg className="h-5 w-5 md:h-6 md:w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm md:text-base font-semibold text-blue-900">
                                                ✓ {checkedItemsCount} produit{checkedItemsCount !== 1 ? 's' : ''} à traiter
                                            </h3>
                                            <div className="mt-1 md:mt-2 text-xs md:text-sm text-blue-800">
                                                <p>
                                                    Ajustez les quantités si nécessaire, puis cliquez sur "Mettre à jour l'inventaire".
                                                    Les produits traités disparaîtront de cette liste.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <RestockingForm
                                    list={selectedList}
                                    onSuccess={loadLists}
                                />
                            </>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 text-center">
                                <svg className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="mt-4 text-sm md:text-base text-gray-600 font-medium">
                                    Sélectionnez une liste de courses
                                </p>
                                <p className="mt-2 text-xs md:text-sm text-gray-500">
                                    Choisissez une liste dans le panneau {lists.length > 0 ? 'à gauche' : 'ci-dessus'} pour commencer
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
