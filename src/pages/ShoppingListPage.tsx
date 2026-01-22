/**
 * Shopping List Page
 * 
 * Displays and generates shopping lists from planned meals.
 */

import { useState, useEffect } from 'react';
import { startOfWeek, addWeeks, format } from 'date-fns';
import { ShoppingListView } from '../components/shopping';
import {
    generateShoppingList,
    listShoppingLists,
    getShoppingList,
    deleteShoppingList,
} from '../services/shopping';
import type { ShoppingList, ShoppingListWithItems } from '../lib/database.types';

export function ShoppingListPage() {
    // State
    const [lists, setLists] = useState<ShoppingList[]>([]);
    const [selectedList, setSelectedList] = useState<ShoppingListWithItems | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate date range (current week by default)
    const [startDate, setStartDate] = useState(() =>
        format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    );
    const [endDate, setEndDate] = useState(() =>
        format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd')
    );

    // Load shopping lists
    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = async () => {
        setLoading(true);
        const { lists: data } = await listShoppingLists();
        setLists(data);

        // Auto-select the most recent list
        if (data.length > 0 && !selectedList) {
            await selectList(data[0].id);
        }

        setLoading(false);
    };

    const selectList = async (id: string) => {
        const { list } = await getShoppingList(id);
        setSelectedList(list);
    };

    // Generate new shopping list
    const handleGenerate = async () => {
        setError(null);
        setGenerating(true);

        const { list, error: genError } = await generateShoppingList(startDate, endDate);

        setGenerating(false);

        if (genError) {
            setError(genError.message);
            return;
        }

        if (list) {
            setSelectedList(list);
            loadLists(); // Refresh list
        }
    };

    // Regenerate for current period
    const handleRegenerate = async () => {
        if (!selectedList) return;

        // Delete old list first
        await deleteShoppingList(selectedList.id);

        // Generate new one with same dates
        setStartDate(selectedList.start_date);
        setEndDate(selectedList.end_date);
        await handleGenerate();
    };

    // Delete list
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this shopping list?')) return;

        const { success } = await deleteShoppingList(id);
        if (success) {
            if (selectedList?.id === id) {
                setSelectedList(null);
            }
            loadLists();
        }
    };

    return (
        <div className="page shopping-list-page">
            <div className="page-header">
                <h1>🛒 Shopping Lists</h1>
            </div>

            <div className="shopping-layout">
                {/* Sidebar: List selection and generation */}
                <div className="shopping-sidebar">
                    {/* Generate form */}
                    <div className="generate-form">
                        <h3>Generate New List</h3>

                        <div className="form-group">
                            <label htmlFor="startDate">Start Date</label>
                            <input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="endDate">End Date</label>
                            <input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="btn-generate"
                        >
                            {generating ? 'Generating...' : 'Generate from Planner'}
                        </button>

                        {error && <div className="form-error">{error}</div>}
                    </div>

                    {/* Previous lists */}
                    <div className="previous-lists">
                        <h3>Previous Lists</h3>

                        {loading ? (
                            <p className="loading">Loading...</p>
                        ) : lists.length === 0 ? (
                            <p className="empty">No shopping lists yet</p>
                        ) : (
                            <ul className="lists-list">
                                {lists.map((list) => (
                                    <li
                                        key={list.id}
                                        className={selectedList?.id === list.id ? 'active' : ''}
                                    >
                                        <button onClick={() => selectList(list.id)}>
                                            <span className="list-dates">
                                                {format(new Date(list.start_date), 'MMM d')} -{' '}
                                                {format(new Date(list.end_date), 'MMM d')}
                                            </span>
                                            <span className="list-created">
                                                {format(new Date(list.created_at), 'MMM d, yyyy')}
                                            </span>
                                        </button>
                                        <button
                                            className="btn-delete-list"
                                            onClick={() => handleDelete(list.id)}
                                            title="Delete list"
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Main: Shopping list view */}
                <div className="shopping-main">
                    {selectedList ? (
                        <>
                            <div className="list-header">
                                <h2>
                                    {format(new Date(selectedList.start_date), 'MMM d')} -{' '}
                                    {format(new Date(selectedList.end_date), 'MMM d, yyyy')}
                                </h2>
                                <button onClick={handleRegenerate} className="btn-regenerate">
                                    🔄 Regenerate
                                </button>
                            </div>

                            <ShoppingListView list={selectedList} onItemToggle={() => { }} />
                        </>
                    ) : (
                        <div className="empty-state">
                            <p>Select a shopping list or generate a new one</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
