/**
 * Add/Edit Inventory Item Modal
 * 
 * With preset items based on category selection.
 */

import { useState, useEffect, type FormEvent } from 'react';
import type { InventoryItem, InventoryInput } from '../../lib/database.types';
import {
    INVENTORY_CATEGORIES,
    STORAGE_LOCATIONS,
    getPresetItems,
    type InventoryMainCategory,
    type StorageLocation,
} from '../../lib/inventoryCategories';

interface InventoryFormProps {
    item?: InventoryItem | null;
    onSubmit: (data: InventoryInput) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

const UNITS = ['', 'pièces', 'g', 'kg', 'ml', 'L', 'boîtes', 'sachets', 'bouteilles', 'flacons', 'rouleaux', 'paquets'];

export function InventoryForm({ item, onSubmit, onCancel, isLoading = false }: InventoryFormProps) {
    // Form state
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [unit, setUnit] = useState('pièces');
    const [categoryValue, setCategoryValue] = useState('pantry:cereals');
    const [location, setLocation] = useState<StorageLocation | ''>('');
    const [minQuantity, setMinQuantity] = useState('1');
    const [expiryDate, setExpiryDate] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Preset items dropdown
    const [showPresets, setShowPresets] = useState(false);
    const [presetItems, setPresetItems] = useState<string[]>([]);

    // Initialize form with editing item
    useEffect(() => {
        if (item) {
            setName(item.name);
            setQuantity(item.quantity.toString());
            setUnit(item.unit || 'pièces');
            // Try to reconstruct category value from item
            setCategoryValue(item.aisle || 'pantry:cereals');
            setLocation((item.location as StorageLocation) || '');
            setMinQuantity(item.min_quantity.toString());
            setExpiryDate(item.expiry_date || '');
        }
    }, [item]);

    // Update presets when category changes
    useEffect(() => {
        const items = getPresetItems(categoryValue);
        setPresetItems(items);
    }, [categoryValue]);

    // Get main category from value
    const getMainCategory = (): InventoryMainCategory => {
        return categoryValue.split(':')[0] as InventoryMainCategory;
    };

    const handleSelectPreset = (presetName: string) => {
        setName(presetName);
        setShowPresets(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Le nom est requis');
            return;
        }

        const mainCategory = getMainCategory();

        const input: InventoryInput = {
            name: name.trim(),
            quantity: parseFloat(quantity) || 1,
            unit: unit || null,
            category: mainCategory as any, // Will be validated by DB
            aisle: categoryValue, // Store full category path
            min_quantity: parseFloat(minQuantity) || 1,
            expiry_date: expiryDate || null,
            location: location || null,
        };

        try {
            await onSubmit(input);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
        }
    };


    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content inventory-form-modal" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="inventory-form">
                    <h2>{item ? '✏️ Modifier l\'article' : '➕ Ajouter au stock'}</h2>

                    {error && <div className="form-error">{error}</div>}

                    {/* Category selection */}
                    <div className="form-group">
                        <label htmlFor="category">Catégorie *</label>
                        <select
                            id="category"
                            value={categoryValue}
                            onChange={e => setCategoryValue(e.target.value)}
                            className="category-select"
                        >
                            {Object.entries(INVENTORY_CATEGORIES).map(([mainKey, mainCat]) => (
                                <optgroup key={mainKey} label={mainCat.label}>
                                    {Object.entries(mainCat.subcategories).map(([subKey, subCat]) => (
                                        <option key={`${mainKey}:${subKey}`} value={`${mainKey}:${subKey}`}>
                                            {subCat.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Name with preset dropdown */}
                    <div className="form-group">
                        <label htmlFor="name">
                            Article *
                            {presetItems.length > 0 && (
                                <button
                                    type="button"
                                    className="btn-show-presets"
                                    onClick={() => setShowPresets(!showPresets)}
                                >
                                    {showPresets ? '✕ Fermer' : '📋 Voir suggestions'}
                                </button>
                            )}
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nom de l'article..."
                            required
                            autoFocus={!item}
                        />

                        {/* Preset items grid */}
                        {showPresets && presetItems.length > 0 && (
                            <div className="preset-items-grid">
                                {presetItems.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        className={`preset-item ${name === preset ? 'selected' : ''}`}
                                        onClick={() => handleSelectPreset(preset)}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quantity and unit */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="quantity">Quantité</label>
                            <input
                                id="quantity"
                                type="number"
                                min="0"
                                step="0.5"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="unit">Unité</label>
                            <select
                                id="unit"
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                            >
                                {UNITS.map(u => (
                                    <option key={u} value={u}>{u || '(aucune)'}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stock minimum and location */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="minQuantity">Stock minimum</label>
                            <input
                                id="minQuantity"
                                type="number"
                                min="0"
                                step="0.5"
                                value={minQuantity}
                                onChange={e => setMinQuantity(e.target.value)}
                                title="Alerte quand le stock passe en dessous"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">Emplacement</label>
                            <select
                                id="location"
                                value={location}
                                onChange={e => setLocation(e.target.value as StorageLocation)}
                            >
                                <option value="">Sélectionner...</option>
                                {Object.entries(STORAGE_LOCATIONS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Expiry date (optional, mainly for food) */}
                    {(getMainCategory() === 'pantry' || getMainCategory() === 'freezer') && (
                        <div className="form-group">
                            <label htmlFor="expiryDate">Date d'expiration (optionnel)</label>
                            <input
                                id="expiryDate"
                                type="date"
                                value={expiryDate}
                                onChange={e => setExpiryDate(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onCancel}>
                            Annuler
                        </button>
                        <button type="submit" className="btn-submit" disabled={isLoading}>
                            {isLoading ? 'Enregistrement...' : item ? 'Modifier' : 'Ajouter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
