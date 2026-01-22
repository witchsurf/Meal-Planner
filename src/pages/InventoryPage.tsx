/**
 * Inventory Page
 * 
 * Home stock management page with items list and add/edit functionality.
 */

import { useState } from 'react';
import { InventoryList, InventoryForm } from '../components/inventory';
import { addToInventory, updateInventoryItem } from '../services/inventory';
import type { InventoryItem, InventoryInput } from '../lib/database.types';

export function InventoryPage() {
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAdd = () => {
        setEditingItem(null);
        setShowForm(true);
    };

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleSubmit = async (data: InventoryInput) => {
        setIsLoading(true);
        try {
            if (editingItem) {
                await updateInventoryItem(editingItem.id, data);
            } else {
                await addToInventory(data);
            }
            setShowForm(false);
            setEditingItem(null);
            setRefreshKey(k => k + 1);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingItem(null);
    };

    return (
        <div className="page inventory-page">
            <div className="page-header">
                <h1>📦 Stock Maison</h1>
                <p className="page-subtitle">Gérez votre inventaire et évitez les achats inutiles</p>
            </div>

            {/* Stats summary */}
            <div className="inventory-summary">
                <div className="summary-card">
                    <span className="summary-icon">🍎</span>
                    <span className="summary-label">Aliments</span>
                </div>
                <div className="summary-card">
                    <span className="summary-icon">🧹</span>
                    <span className="summary-label">Ménager</span>
                </div>
                <div className="summary-card">
                    <span className="summary-icon">⚠️</span>
                    <span className="summary-label">Stock bas</span>
                </div>
                <div className="summary-card">
                    <span className="summary-icon">⏰</span>
                    <span className="summary-label">Expire bientôt</span>
                </div>
            </div>

            {/* Inventory list */}
            <InventoryList
                key={refreshKey}
                onAddClick={handleAdd}
                onEditClick={handleEdit}
            />

            {/* Add/Edit form modal */}
            {showForm && (
                <InventoryForm
                    item={editingItem}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
