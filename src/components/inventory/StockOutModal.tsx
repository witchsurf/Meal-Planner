/**
 * Stock Out Modal Component
 * 
 * Modal dialog for removing items from inventory with quantity and reason.
 */

import { useState } from 'react';
import type { InventoryItem } from '../../lib/database.types';
import { removeFromStock } from '../../services/inventory';

interface StockOutModalProps {
    item: InventoryItem;
    onClose: () => void;
    onSuccess: () => void;
}

const STOCK_OUT_REASONS = [
    { value: 'consumed', label: '🍽️ Consommé' },
    { value: 'expired', label: '⏰ Périmé' },
    { value: 'given', label: '🎁 Donné' },
    { value: 'thrown', label: '🗑️ Jeté' },
    { value: 'other', label: '📝 Autre' },
];

export function StockOutModal({ item, onClose, onSuccess }: StockOutModalProps) {
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState<string>('consumed');
    const [note, setNote] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const maxQuantity = item.quantity;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (quantity <= 0) {
            setError('La quantité doit être supérieure à 0');
            return;
        }

        if (quantity > maxQuantity) {
            setError(`Quantité maximum disponible: ${maxQuantity}`);
            return;
        }

        setIsLoading(true);
        setError(null);

        const reasonLabel = STOCK_OUT_REASONS.find(r => r.value === reason)?.label ?? reason;
        const fullNote = note ? `${reasonLabel} - ${note}` : reasonLabel;

        const { error: removeError } = await removeFromStock(item.id, quantity, fullNote);

        setIsLoading(false);

        if (removeError) {
            setError(removeError.message);
            return;
        }

        onSuccess();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal stock-out-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📤 Sortie de stock</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Item info */}
                        <div className="stock-out-item">
                            <span className="item-name">{item.name}</span>
                            <span className="item-current">
                                Stock actuel: <strong>{item.quantity} {item.unit ?? ''}</strong>
                            </span>
                        </div>

                        {/* Quantity */}
                        <div className="form-group">
                            <label htmlFor="quantity">Quantité à retirer</label>
                            <div className="quantity-input">
                                <button
                                    type="button"
                                    className="qty-btn"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                >
                                    −
                                </button>
                                <input
                                    id="quantity"
                                    type="number"
                                    min={1}
                                    max={maxQuantity}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                />
                                <span className="unit">{item.unit ?? ''}</span>
                                <button
                                    type="button"
                                    className="qty-btn"
                                    onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                                    disabled={quantity >= maxQuantity}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="form-group">
                            <label htmlFor="reason">Motif</label>
                            <select
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            >
                                {STOCK_OUT_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Note */}
                        <div className="form-group">
                            <label htmlFor="note">Note (optionnel)</label>
                            <input
                                id="note"
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Commentaire..."
                            />
                        </div>

                        {error && <div className="form-error">{error}</div>}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn-submit" disabled={isLoading}>
                            {isLoading ? 'En cours...' : 'Confirmer la sortie'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
