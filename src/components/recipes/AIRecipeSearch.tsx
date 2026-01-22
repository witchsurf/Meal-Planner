/**
 * AI Recipe Search Component
 * 
 * Allows users to generate recipes using AI from a text prompt.
 */

import { useState } from 'react';
import { generateRecipeFromPrompt, searchFoodImage, type GeneratedRecipe } from '../../services/ai-recipes';
import { isOpenAIConfigured } from '../../lib/openai';

interface AIRecipeSearchProps {
    onRecipeGenerated: (recipe: GeneratedRecipe) => void;
}

export function AIRecipeSearch({ onRecipeGenerated }: AIRecipeSearchProps) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<GeneratedRecipe | null>(null);
    const [useDALLE, setUseDALLE] = useState(false); // DALL-E coûte ~$0.04/image

    const isConfigured = isOpenAIConfigured();

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setError(null);
        setPreview(null);

        const { recipe, error: genError } = await generateRecipeFromPrompt(prompt, useDALLE);

        setLoading(false);

        if (genError) {
            setError(genError.message);
            return;
        }

        if (recipe) {
            // If no DALL-E image, get from Unsplash
            if (!recipe.image_url) {
                recipe.image_url = await searchFoodImage(recipe.name) || undefined;
            }
            setPreview(recipe);
        }
    };

    const handleAddRecipe = () => {
        if (preview) {
            onRecipeGenerated(preview);
            setPreview(null);
            setPrompt('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    if (!isConfigured) {
        return (
            <div className="ai-search ai-not-configured">
                <div className="ai-icon">🤖</div>
                <h3>Génération IA désactivée</h3>
                <p>Ajoutez <code>VITE_OPENAI_API_KEY</code> dans votre fichier .env pour activer cette fonctionnalité.</p>
            </div>
        );
    }

    return (
        <div className="ai-search">
            <div className="ai-search-header">
                <div className="ai-icon">✨</div>
                <div>
                    <h3>Générer une recette avec l'IA</h3>
                    <p>Décrivez le plat que vous voulez et l'IA créera la recette</p>
                </div>
            </div>

            <div className="ai-search-input">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Pasta carbonara pour 4 personnes, Tarte aux pommes facile..."
                    disabled={loading}
                />
                <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                    className="btn-generate-ai"
                >
                    {loading ? (
                        <span className="loading-dots">Génération<span>.</span><span>.</span><span>.</span></span>
                    ) : (
                        '🪄 Générer'
                    )}
                </button>
            </div>

            <div className="ai-options">
                <label className="ai-option">
                    <input
                        type="checkbox"
                        checked={useDALLE}
                        onChange={(e) => setUseDALLE(e.target.checked)}
                        disabled={loading}
                    />
                    <span>Générer une image avec DALL-E (plus lent, plus coûteux)</span>
                </label>
            </div>

            {error && (
                <div className="ai-error">
                    ❌ {error}
                </div>
            )}

            {loading && (
                <div className="ai-loading">
                    <div className="ai-loading-animation">
                        <span>🍳</span>
                        <span>🥘</span>
                        <span>🍝</span>
                    </div>
                    <p>L'IA prépare votre recette...</p>
                </div>
            )}

            {preview && (
                <div className="ai-preview">
                    <div className="ai-preview-header">
                        <h4>Recette générée</h4>
                        <div className="ai-preview-actions">
                            <button onClick={() => setPreview(null)} className="btn-cancel">
                                Annuler
                            </button>
                            <button onClick={handleAddRecipe} className="btn-add-recipe">
                                ✓ Ajouter à mes recettes
                            </button>
                        </div>
                    </div>

                    <div className="ai-preview-content">
                        {preview.image_url && (
                            <img
                                src={preview.image_url}
                                alt={preview.name}
                                className="ai-preview-image"
                            />
                        )}

                        <div className="ai-preview-info">
                            <h5>{preview.name}</h5>
                            <p>{preview.description}</p>

                            <div className="ai-preview-meta">
                                {preview.category && (
                                    <span className="tag category">{preview.category}</span>
                                )}
                                {preview.prep_time_minutes && (
                                    <span className="tag time">⏱️ {preview.prep_time_minutes} min</span>
                                )}
                            </div>

                            {preview.tags && preview.tags.length > 0 && (
                                <div className="ai-preview-tags">
                                    {preview.tags.map(tag => (
                                        <span key={tag} className="tag">{tag}</span>
                                    ))}
                                </div>
                            )}

                            <div className="ai-preview-ingredients">
                                <h6>Ingrédients ({preview.ingredients.length})</h6>
                                <ul>
                                    {preview.ingredients.map((ing, i) => (
                                        <li key={i}>
                                            <span className="ing-name">{ing.name}</span>
                                            {ing.quantity && (
                                                <span className="ing-qty">{ing.quantity} {ing.unit || ''}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
