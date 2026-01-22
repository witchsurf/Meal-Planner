/**
 * Recipe Form Component
 * 
 * Form for creating and editing recipes with dynamic ingredient management.
 */

import { useState, type FormEvent } from 'react';
import type { RecipeInput, IngredientInput, RecipeWithIngredients } from '../../lib/database.types';

interface RecipeFormProps {
    /** Initial values for editing, undefined for create */
    initialValues?: RecipeWithIngredients;
    /** Called on successful form submission */
    onSubmit: (data: RecipeInput) => Promise<void>;
    /** Called when form is cancelled */
    onCancel: () => void;
    /** Loading state */
    isLoading?: boolean;
}

const EMPTY_INGREDIENT: IngredientInput = {
    name: '',
    quantity: null,
    unit: null,
    aisle: null,
};

export function RecipeForm({
    initialValues,
    onSubmit,
    onCancel,
    isLoading = false,
}: RecipeFormProps) {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    const [name, setName] = useState(initialValues?.name ?? '');
    const [description, setDescription] = useState(initialValues?.description ?? '');
    const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? '');
    const [category, setCategory] = useState(initialValues?.category ?? '');
    const [tagsInput, setTagsInput] = useState(initialValues?.tags?.join(', ') ?? '');
    const [prepTime, setPrepTime] = useState(initialValues?.prep_time_minutes?.toString() ?? '');
    const [baseServings, setBaseServings] = useState(initialValues?.base_servings?.toString() ?? '4');
    const [sourceUrl, setSourceUrl] = useState(initialValues?.source_url ?? '');

    const [ingredients, setIngredients] = useState<IngredientInput[]>(
        initialValues?.ingredients?.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            aisle: i.aisle,
        })) ?? [{ ...EMPTY_INGREDIENT }]
    );

    const [error, setError] = useState<string | null>(null);

    // -------------------------------------------------------------------------
    // Ingredient Management
    // -------------------------------------------------------------------------

    const addIngredient = () => {
        setIngredients([...ingredients, { ...EMPTY_INGREDIENT }]);
    };

    const removeIngredient = (index: number) => {
        if (ingredients.length === 1) return;
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const updateIngredient = (index: number, field: keyof IngredientInput, value: string | number | null) => {
        const updated = [...ingredients];
        updated[index] = { ...updated[index], [field]: value };
        setIngredients(updated);
    };

    // -------------------------------------------------------------------------
    // Form Submission
    // -------------------------------------------------------------------------

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError('Recipe name is required');
            return;
        }

        // Filter out empty ingredients
        const validIngredients = ingredients.filter((i) => i.name.trim());

        // Parse tags
        const tags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t);

        // Build input
        const input: RecipeInput = {
            name: name.trim(),
            description: description.trim() || null,
            image_url: imageUrl.trim() || null,
            category: category.trim() || null,
            tags,
            prep_time_minutes: prepTime ? parseInt(prepTime, 10) : null,
            base_servings: baseServings ? parseInt(baseServings, 10) : 4,
            source_url: sourceUrl.trim() || null,
            ingredients: validIngredients,
        };

        try {
            await onSubmit(input);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save recipe');
        }
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
        <form onSubmit={handleSubmit} className="recipe-form">
            <h2>{initialValues ? 'Edit Recipe' : 'New Recipe'}</h2>

            {error && <div className="form-error">{error}</div>}

            {/* Basic Info */}
            <div className="form-section">
                <h3>Basic Information</h3>

                <div className="form-group">
                    <label htmlFor="name">Recipe Name *</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Pasta Carbonara"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A short description of the recipe..."
                        rows={3}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="category">Catégorie</label>
                        <input
                            id="category"
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="ex: main, dessert, appetizer"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="prepTime">Temps de préparation (min)</label>
                        <input
                            id="prepTime"
                            type="number"
                            min="0"
                            value={prepTime}
                            onChange={(e) => setPrepTime(e.target.value)}
                            placeholder="30"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="baseServings">Pour combien de personnes ? *</label>
                        <input
                            id="baseServings"
                            type="number"
                            min="1"
                            max="50"
                            value={baseServings}
                            onChange={(e) => setBaseServings(e.target.value)}
                            placeholder="4"
                            required
                        />
                        <small style={{ color: '#666', fontSize: '0.8rem' }}>Les quantités d'ingrédients sont pour ce nombre de personnes</small>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="tags">Tags (comma-separated)</label>
                    <input
                        id="tags"
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="e.g., vegetarian, quick, italian"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="imageUrl">Image URL</label>
                    <input
                        id="imageUrl"
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="sourceUrl">Source URL</label>
                    <input
                        id="sourceUrl"
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </div>
            </div>

            {/* Ingredients */}
            <div className="form-section">
                <h3>Ingredients</h3>

                <div className="ingredients-list">
                    {ingredients.map((ingredient, index) => (
                        <div key={index} className="ingredient-row">
                            <input
                                type="text"
                                value={ingredient.name}
                                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                placeholder="Ingredient name"
                                className="ingredient-name"
                            />
                            <input
                                type="number"
                                value={ingredient.quantity ?? ''}
                                onChange={(e) =>
                                    updateIngredient(
                                        index,
                                        'quantity',
                                        e.target.value ? parseFloat(e.target.value) : null
                                    )
                                }
                                placeholder="Qty"
                                className="ingredient-qty"
                                min="0"
                                step="0.1"
                            />
                            <input
                                type="text"
                                value={ingredient.unit ?? ''}
                                onChange={(e) =>
                                    updateIngredient(index, 'unit', e.target.value || null)
                                }
                                placeholder="Unit"
                                className="ingredient-unit"
                            />
                            <input
                                type="text"
                                value={ingredient.aisle ?? ''}
                                onChange={(e) =>
                                    updateIngredient(index, 'aisle', e.target.value || null)
                                }
                                placeholder="Aisle"
                                className="ingredient-aisle"
                            />
                            <button
                                type="button"
                                onClick={() => removeIngredient(index)}
                                className="btn-remove"
                                disabled={ingredients.length === 1}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                <button type="button" onClick={addIngredient} className="btn-add-ingredient">
                    + Add Ingredient
                </button>
            </div>

            {/* Actions */}
            <div className="form-actions">
                <button type="button" onClick={onCancel} className="btn-cancel">
                    Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : initialValues ? 'Update Recipe' : 'Create Recipe'}
                </button>
            </div>
        </form>
    );
}
