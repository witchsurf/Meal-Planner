/**
 * Inventory List Component
 * 
 * Displays the home inventory grouped by main category.
 */

import { useState, useEffect } from 'react';
import type { InventoryItem } from '../../lib/database.types';
import {
    getCategoryLabel,
    type InventoryMainCategory,
} from '../../lib/inventoryCategories';
import { listInventory, deleteInventoryItem, updateInventoryItem } from '../../services/inventory';

interface InventoryListProps {
    onAddClick?: () => void;
    onEditClick?: (item: InventoryItem) => void;
}

const MAIN_CATEGORIES: (InventoryMainCategory | 'all' | 'low')[] = ['all', 'pantry', 'freezer', 'cleaning', 'toiletry', 'low'];

const CATEGORY_LABELS: Record<string, string> = {
    all: '📦 Tout',
    pantry: '🥫 Épicerie',
    freezer: '❄️ Congélateur',
    cleaning: '🧼 Entretien',
    toiletry: '🪥 Hygiène',
    low: '⚠️ Stock bas',
};

export function InventoryList({ onAddClick, onEditClick }: InventoryListProps) {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadItems();
    }, [selectedCategory, search]);

    const loadItems = async () => {
        setLoading(true);

        // Build filters
        let categoryFilter: string | undefined;
        if (selectedCategory !== 'all' && selectedCategory !== 'low') {
            categoryFilter = selectedCategory;
        }

        const { items: data } = await listInventory({
            category: categoryFilter as any,
            search: search.trim() || undefined,
            lowStock: selectedCategory === 'low',
        });

        setItems(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cet article du stock ?')) return;
        await deleteInventoryItem(id);
        loadItems();
    };

    const handleQuickAdjust = async (item: InventoryItem, delta: number) => {
        const newQty = Math.max(0, item.quantity + delta);
        await updateInventoryItem(item.id, { quantity: newQty });
        loadItems();
    };

    // Group items by subcategory (aisle field stores full path)
    const groupedItems = items.reduce((acc, item) => {
        const subcatKey = item.aisle || 'other';
        if (!acc[subcatKey]) acc[subcatKey] = [];
        acc[subcatKey].push(item);
        return acc;
    }, {} as Record<string, InventoryItem[]>);

    const isLowStock = (item: InventoryItem) => item.quantity <= item.min_quantity;
    const isExpiringSoon = (item: InventoryItem) => {
        if (!item.expiry_date) return false;
        const expiry = new Date(item.expiry_date);
        const sevenDays = new Date();
        sevenDays.setDate(sevenDays.getDate() + 7);
        return expiry <= sevenDays;
    };

    // Count low stock items
    const lowStockCount = items.filter(isLowStock).length;

    return (
        <div className="inventory-list">
            {/* Filters */}
            <div className="inventory-filters">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Rechercher..."
                    className="inventory-search"
                />

                <div className="category-tabs">
                    {MAIN_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`category-tab ${selectedCategory === cat ? 'active' : ''} ${cat === 'low' && lowStockCount > 0 ? 'has-alert' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {CATEGORY_LABELS[cat]}
                            {cat === 'low' && lowStockCount > 0 && (
                                <span className="alert-badge">{lowStockCount}</span>
                            )}
                        </button>
                    ))}
                </div>

                {onAddClick && (
                    <button className="btn-add" onClick={onAddClick}>
                        + Ajouter
                    </button>
                )}
            </div>

            {/* Items */}
            {loading ? (
                <p className="loading">Chargement...</p>
            ) : items.length === 0 ? (
                <div className="empty-state">
                    <p>🏠 Aucun article en stock</p>
                    <p className="hint">Cliquez sur "Ajouter" pour commencer</p>
                </div>
            ) : (
                <div className="inventory-grid">
                    {Object.entries(groupedItems)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([subcatKey, subcatItems]) => (
                            <div key={subcatKey} className="inventory-category-group">
                                <h3 className="category-header">
                                    {getCategoryLabel(subcatKey)}
                                    <span className="item-count">({subcatItems.length})</span>
                                </h3>

                                <div className="inventory-items">
                                    {subcatItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={`inventory-item ${isLowStock(item) ? 'low-stock' : ''} ${isExpiringSoon(item) ? 'expiring' : ''}`}
                                            onClick={() => onEditClick?.(item)}
                                        >
                                            <div className="item-info">
                                                <span className="item-name">{item.name}</span>
                                                {isLowStock(item) && <span className="badge-low">⚠️ Bas</span>}
                                                {isExpiringSoon(item) && <span className="badge-expiring">⏰ Expire</span>}
                                            </div>

                                            <div className="item-quantity">
                                                <button
                                                    className="qty-btn"
                                                    onClick={(e) => { e.stopPropagation(); handleQuickAdjust(item, -1); }}
                                                >
                                                    −
                                                </button>
                                                <span className="qty-value">
                                                    {item.quantity} {item.unit || ''}
                                                </span>
                                                <button
                                                    className="qty-btn"
                                                    onClick={(e) => { e.stopPropagation(); handleQuickAdjust(item, 1); }}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                className="btn-delete-item"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                title="Supprimer"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
