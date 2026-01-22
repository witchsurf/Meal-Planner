/**
 * Meal Slot Component
 * 
 * Drop target for a single meal slot in the weekly planner.
 * Includes servings selector to adjust portions.
 */

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { PlannedMealWithRecipe, MealType } from '../../lib/database.types';
import { getRecipeImageUrlSmall } from '../../utils/recipeImages';

interface MealSlotProps {
    date: string;
    mealType: MealType;
    meal?: PlannedMealWithRecipe;
    onRemove?: (mealId: string) => void;
    onServingsChange?: (mealId: string, servings: number) => void;
}

const MEAL_TYPE_EMOJI: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
};

export function MealSlot({ date, mealType, meal, onRemove, onServingsChange }: MealSlotProps) {
    const [isEditingServings, setIsEditingServings] = useState(false);

    const { isOver, setNodeRef } = useDroppable({
        id: `${date}-${mealType}`,
        data: { date, mealType },
    });

    const handleServingsChange = (newServings: number) => {
        if (meal && onServingsChange && newServings >= 1 && newServings <= 20) {
            onServingsChange(meal.id, newServings);
        }
        setIsEditingServings(false);
    };

    // Get consistent image URL
    const imageUrl = meal ? getRecipeImageUrlSmall(meal.recipe) : null;

    return (
        <div
            ref={setNodeRef}
            className={`meal-slot ${isOver ? 'drag-over' : ''} ${meal ? 'has-meal' : ''}`}
        >
            <div className="meal-slot-header">
                <span className="meal-type-emoji">{MEAL_TYPE_EMOJI[mealType]}</span>
                <span className="meal-type-label">{mealType}</span>
            </div>

            {meal ? (
                <div className="meal-slot-content">
                    <div
                        className="meal-slot-image"
                        style={{ backgroundImage: `url(${imageUrl})` }}
                    />
                    <span className="meal-recipe-name">{meal.recipe.name}</span>

                    {/* Servings selector */}
                    <div className="meal-servings-container">
                        {isEditingServings ? (
                            <select
                                value={meal.servings}
                                onChange={(e) => handleServingsChange(parseInt(e.target.value))}
                                onBlur={() => setIsEditingServings(false)}
                                autoFocus
                                className="servings-select"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                                    <option key={n} value={n}>{n} pers.</option>
                                ))}
                            </select>
                        ) : (
                            <button
                                className="meal-servings"
                                onClick={() => setIsEditingServings(true)}
                                title="Cliquer pour modifier le nombre de personnes"
                            >
                                👥 {meal.servings} pers.
                            </button>
                        )}
                    </div>

                    {onRemove && (
                        <button
                            onClick={() => onRemove(meal.id)}
                            className="btn-remove-meal"
                            title="Supprimer le repas"
                        >
                            ✕
                        </button>
                    )}
                </div>
            ) : (
                <div className="meal-slot-empty">
                    <span>Glisser une recette ici</span>
                </div>
            )}
        </div>
    );
}
