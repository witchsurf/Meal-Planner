/**
 * Shopping List View Component
 * 
 * Displays shopping list items grouped by aisle with checkboxes.
 */

import { useState, useEffect } from 'react';
import {
    toggleShoppingListItemChecked,
    groupItemsByAisle,
} from '../../services/shopping';
import type { ShoppingListWithItems, ShoppingListItem } from '../../lib/database.types';

interface ShoppingListViewProps {
    list: ShoppingListWithItems;
    onItemToggle?: () => void;
}

export function ShoppingListView({ list, onItemToggle }: ShoppingListViewProps) {
    const [items, setItems] = useState<ShoppingListItem[]>(list.items);
    const [loading, setLoading] = useState<string | null>(null);

    // Update items when list changes
    useEffect(() => {
        setItems(list.items);
    }, [list.items]);

    // Group items by aisle
    const groupedItems = groupItemsByAisle(items);
    const aisles = Array.from(groupedItems.keys()).sort();

    // Handle checkbox toggle
    const handleToggle = async (item: ShoppingListItem) => {
        setLoading(item.id);

        const { item: updated, error } = await toggleShoppingListItemChecked(
            item.id,
            !item.checked
        );

        if (updated && !error) {
            // Update local state
            setItems((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i))
            );
            onItemToggle?.();
        }

        setLoading(null);
    };

    // Calculate progress
    const checkedCount = items.filter((i) => i.checked).length;
    const totalCount = items.length;
    const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

    return (
        <div className="shopping-list-view">
            {/* Progress bar */}
            <div className="shopping-progress">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="progress-text">
                    {checkedCount} / {totalCount} items
                </span>
            </div>

            {/* Items by aisle */}
            {aisles.length === 0 ? (
                <p className="empty">No items in this list</p>
            ) : (
                <div className="shopping-aisles">
                    {aisles.map((aisle) => (
                        <div key={aisle} className="shopping-aisle">
                            <h3 className="aisle-name">
                                🏪 {aisle}
                            </h3>
                            <ul className="aisle-items">
                                {groupedItems.get(aisle)?.map((item) => (
                                    <li
                                        key={item.id}
                                        className={`shopping-item ${item.checked ? 'checked' : ''}`}
                                    >
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={() => handleToggle(item)}
                                                disabled={loading === item.id}
                                            />
                                            <span className="item-info">
                                                <span className="item-name">{item.name}</span>
                                                {item.quantity && (
                                                    <span className="item-quantity">
                                                        {item.quantity} {item.unit ?? ''}
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
