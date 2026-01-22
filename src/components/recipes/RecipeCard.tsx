/**
 * Recipe Card Component
 * 
 * Displays a single recipe in the library grid.
 * Supports drag for adding to planner.
 */

import { useDraggable } from '@dnd-kit/core';
import type { Recipe } from '../../lib/database.types';
import { getRecipeImageUrl } from '../../utils/recipeImages';

interface RecipeCardProps {
    recipe: Recipe;
    onClick?: () => void;
    draggable?: boolean;
}

export function RecipeCard({ recipe, onClick, draggable = false }: RecipeCardProps) {
    // Set up draggable if enabled
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: recipe.id,
        data: { recipe },
        disabled: !draggable,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            opacity: isDragging ? 0.5 : 1,
        }
        : undefined;

    // Get consistent image URL
    const imageUrl = getRecipeImageUrl(recipe);

    return (
        <div
            ref={draggable ? setNodeRef : undefined}
            className={`recipe-card ${isDragging ? 'dragging' : ''}`}
            style={style}
            onClick={onClick}
            {...(draggable ? { ...listeners, ...attributes } : {})}
        >
            {/* Image */}
            <div
                className="recipe-card-image"
                style={{ backgroundImage: `url(${imageUrl})` }}
            />

            {/* Content */}
            <div className="recipe-card-content">
                <h3 className="recipe-card-title">{recipe.name}</h3>

                {recipe.category && (
                    <span className="recipe-card-category">{recipe.category}</span>
                )}

                {recipe.prep_time_minutes && (
                    <span className="recipe-card-time">
                        ⏱️ {recipe.prep_time_minutes} min
                    </span>
                )}

                {recipe.tags && recipe.tags.length > 0 && (
                    <div className="recipe-card-tags">
                        {recipe.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
