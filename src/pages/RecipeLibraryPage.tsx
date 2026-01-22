/**
 * Recipe Library Page
 * 
 * Displays all user recipes with search, filter, AI generation, and add functionality.
 */

import { useState, useEffect } from 'react';
import { RecipeCard, RecipeForm } from '../components/recipes';
import { AIRecipeSearch } from '../components/recipes/AIRecipeSearch';
import {
    listRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipeById,
    getCategories,
    getTags,
} from '../services/recipes';
import type { Recipe, RecipeInput, RecipeWithIngredients } from '../lib/database.types';
import type { GeneratedRecipe } from '../services/ai-recipes';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

export function RecipeLibraryPage() {
    // State
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(null);
    const [saving, setSaving] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Filter options
    const [categories, setCategories] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);

    // Load recipes and filter options
    useEffect(() => {
        loadRecipes();
        loadFilterOptions();
    }, [search, category, selectedTags]);

    const loadRecipes = async () => {
        setLoading(true);
        const { recipes: data } = await listRecipes({
            search: search || undefined,
            category: category || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
        });
        setRecipes(data);
        setLoading(false);
    };

    const loadFilterOptions = async () => {
        const [cats, tgs] = await Promise.all([getCategories(), getTags()]);
        setCategories(cats);
        setTags(tgs);
    };

    // Handlers
    const handleCreate = async (input: RecipeInput) => {
        setSaving(true);
        const { error } = await createRecipe(input);
        setSaving(false);

        if (error) {
            throw error;
        }

        setViewMode('list');
        loadRecipes();
        loadFilterOptions();
    };

    const handleAIRecipeGenerated = async (generated: GeneratedRecipe) => {
        setSaving(true);
        const { error } = await createRecipe(generated);
        setSaving(false);

        if (error) {
            alert('Erreur lors de l\'ajout: ' + error.message);
            return;
        }

        loadRecipes();
        loadFilterOptions();
    };

    const handleUpdate = async (input: RecipeInput) => {
        if (!selectedRecipe) return;

        setSaving(true);
        const { error } = await updateRecipe(selectedRecipe.id, input);
        setSaving(false);

        if (error) {
            throw error;
        }

        setViewMode('list');
        setSelectedRecipe(null);
        loadRecipes();
        loadFilterOptions();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        const { error } = await deleteRecipe(id);
        if (!error) {
            setViewMode('list');
            setSelectedRecipe(null);
            loadRecipes();
        }
    };

    const handleRecipeClick = async (recipe: Recipe) => {
        const { recipe: full } = await getRecipeById(recipe.id);
        if (full) {
            setSelectedRecipe(full);
            setViewMode('detail');
        }
    };

    const handleEdit = () => {
        if (selectedRecipe) {
            setViewMode('edit');
        }
    };

    const clearFilters = () => {
        setSearch('');
        setCategory('');
        setSelectedTags([]);
    };

    // Render based on view mode
    if (viewMode === 'create') {
        return (
            <div className="page recipe-library-page">
                <RecipeForm
                    onSubmit={handleCreate}
                    onCancel={() => setViewMode('list')}
                    isLoading={saving}
                />
            </div>
        );
    }

    if (viewMode === 'edit' && selectedRecipe) {
        return (
            <div className="page recipe-library-page">
                <RecipeForm
                    initialValues={selectedRecipe}
                    onSubmit={handleUpdate}
                    onCancel={() => setViewMode('detail')}
                    isLoading={saving}
                />
            </div>
        );
    }

    if (viewMode === 'detail' && selectedRecipe) {
        return (
            <div className="page recipe-library-page">
                <div className="recipe-detail">
                    <button onClick={() => setViewMode('list')} className="btn-back">
                        ← Back to Recipes
                    </button>

                    <div className="recipe-detail-header">
                        {selectedRecipe.image_url && (
                            <img
                                src={selectedRecipe.image_url}
                                alt={selectedRecipe.name}
                                className="recipe-detail-image"
                            />
                        )}
                        <div className="recipe-detail-info">
                            <h1>{selectedRecipe.name}</h1>
                            {selectedRecipe.category && (
                                <span className="recipe-category">{selectedRecipe.category}</span>
                            )}
                            {selectedRecipe.prep_time_minutes && (
                                <span className="recipe-time">⏱️ {selectedRecipe.prep_time_minutes} min</span>
                            )}
                            {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                                <div className="recipe-tags">
                                    {selectedRecipe.tags.map((tag) => (
                                        <span key={tag} className="tag">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedRecipe.description && (
                        <p className="recipe-description">{selectedRecipe.description}</p>
                    )}

                    <div className="recipe-ingredients">
                        <h2>Ingredients</h2>
                        {selectedRecipe.ingredients.length === 0 ? (
                            <p className="empty">No ingredients added</p>
                        ) : (
                            <ul>
                                {selectedRecipe.ingredients.map((ing) => (
                                    <li key={ing.id}>
                                        <span className="ing-name">{ing.name}</span>
                                        {ing.quantity && (
                                            <span className="ing-qty">
                                                {ing.quantity} {ing.unit ?? ''}
                                            </span>
                                        )}
                                        {ing.aisle && <span className="ing-aisle">({ing.aisle})</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {selectedRecipe.source_url && (
                        <a
                            href={selectedRecipe.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="recipe-source"
                        >
                            View Source →
                        </a>
                    )}

                    <div className="recipe-actions">
                        <button onClick={handleEdit} className="btn-edit">
                            Edit Recipe
                        </button>
                        <button onClick={() => handleDelete(selectedRecipe.id)} className="btn-delete">
                            Delete Recipe
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // List view
    return (
        <div className="page recipe-library-page">
            <div className="page-header">
                <h1>📚 Mes Recettes</h1>
                <button onClick={() => setViewMode('create')} className="btn-add">
                    + Ajouter manuellement
                </button>
            </div>

            {/* AI Recipe Generation */}
            <AIRecipeSearch onRecipeGenerated={handleAIRecipeGenerated} />

            {/* Filters */}
            <div className="recipe-filters">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search recipes..."
                    className="filter-search"
                />

                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="filter-category"
                >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>

                <div className="filter-tags">
                    {tags.map((tag) => (
                        <label key={tag} className="tag-filter">
                            <input
                                type="checkbox"
                                checked={selectedTags.includes(tag)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedTags([...selectedTags, tag]);
                                    } else {
                                        setSelectedTags(selectedTags.filter((t) => t !== tag));
                                    }
                                }}
                            />
                            {tag}
                        </label>
                    ))}
                </div>

                {(search || category || selectedTags.length > 0) && (
                    <button onClick={clearFilters} className="btn-clear-filters">
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Recipe Grid */}
            {loading ? (
                <div className="loading">Loading recipes...</div>
            ) : recipes.length === 0 ? (
                <div className="empty-state">
                    <p>No recipes found</p>
                    <button onClick={() => setViewMode('create')} className="btn-add">
                        Create your first recipe
                    </button>
                </div>
            ) : (
                <div className="recipe-grid">
                    {recipes.map((recipe) => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            onClick={() => handleRecipeClick(recipe)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
