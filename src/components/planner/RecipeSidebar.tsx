/**
 * Recipe Sidebar Component
 * 
 * Displays recipe library with filters for origin/cuisine.
 */

import { useState, useEffect } from 'react';
import { RecipeCard } from '../recipes/RecipeCard';
import { listRecipes } from '../../services/recipes';
import type { Recipe } from '../../lib/database.types';

// Cuisine regions for filtering
const CUISINE_REGIONS = [
    { value: '', label: 'Toutes les cuisines' },
    { value: 'africaine', label: '🌍 Afrique' },
    { value: 'asiatique', label: '🌏 Asie' },
    { value: 'européenne', label: '🌍 Europe' },
    { value: 'américaine', label: '🌎 Amérique' },
    { value: 'moyen-orient', label: '🕌 Moyen-Orient' },
    { value: 'méditerranéenne', label: '🫒 Méditerranée' },
    { value: 'française', label: '🇫🇷 France' },
    { value: 'italienne', label: '🇮🇹 Italie' },
    { value: 'mexicaine', label: '🇲🇽 Mexique' },
    { value: 'japonaise', label: '🇯🇵 Japon' },
    { value: 'chinoise', label: '🇨🇳 Chine' },
    { value: 'indienne', label: '🇮🇳 Inde' },
    { value: 'thaïlandaise', label: '🇹🇭 Thaïlande' },
    { value: 'marocaine', label: '🇲🇦 Maroc' },
    { value: 'sénégalaise', label: '🇸🇳 Sénégal' },
    { value: 'libanaise', label: '🇱🇧 Liban' },
];

export function RecipeSidebar() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [search, setSearch] = useState('');
    const [cuisine, setCuisine] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        setCurrentPage(1); // Reset to first page on search/filter change
        loadRecipes();
    }, [search, cuisine]);

    const loadRecipes = async () => {
        setLoading(true);

        const { recipes: data } = await listRecipes({
            search: search || undefined,
            tags: cuisine ? [cuisine] : undefined,
        });
        setRecipes(data);
        setLoading(false);
    };

    return (
        <div className="recipe-sidebar">
            <h3>📚 Recettes</h3>
            <p className="sidebar-hint">Glissez une recette vers le planning</p>

            {/* Filters */}
            <div className="sidebar-filters">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="sidebar-search-input"
                />

                <select
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="sidebar-cuisine-select"
                >
                    {CUISINE_REGIONS.map(region => (
                        <option key={region.value} value={region.value}>
                            {region.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Recipe list */}
            <div className="sidebar-recipes">
                {loading ? (
                    <p className="loading">Chargement...</p>
                ) : recipes.length === 0 ? (
                    <p className="empty">Aucune recette trouvée</p>
                ) : (
                    <>
                        {recipes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((recipe) => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                draggable
                            />
                        ))}

                        {/* Pagination controls */}
                        {recipes.length > itemsPerPage && (
                            <div className="sidebar-pagination">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="btn-pagination"
                                >
                                    ←
                                </button>
                                <span className="page-info">
                                    {currentPage} / {Math.ceil(recipes.length / itemsPerPage)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(recipes.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage === Math.ceil(recipes.length / itemsPerPage)}
                                    className="btn-pagination"
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
