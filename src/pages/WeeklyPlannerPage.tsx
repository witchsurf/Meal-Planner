/**
 * Weekly Planner Page
 * 
 * Drag-and-drop meal planning interface.
 */

import { useState, useEffect } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { startOfWeek, addWeeks, subWeeks, format } from 'date-fns';
import { WeekGrid, RecipeSidebar } from '../components/planner';
import {
    listPlannedMealsInRange,
    replaceMealInSlot,
    deletePlannedMeal,
    updatePlannedMeal,
} from '../services/planner';
import type { PlannedMealWithRecipe, Recipe, MealType } from '../lib/database.types';

export function WeeklyPlannerPage() {
    // State
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [meals, setMeals] = useState<PlannedMealWithRecipe[]>([]);
    const [loading, setLoading] = useState(true);

    // Calculate date range
    const weekEnd = addWeeks(weekStart, 1);
    const startStr = format(weekStart, 'yyyy-MM-dd');

    // Load meals when week changes
    useEffect(() => {
        loadMeals();
    }, [weekStart]);

    const loadMeals = async () => {
        setLoading(true);
        const { meals: data } = await listPlannedMealsInRange(
            startStr,
            format(subWeeks(weekEnd, 0), 'yyyy-MM-dd')
        );
        setMeals(data);
        setLoading(false);
    };

    // Handle drag end - create meal in dropped slot
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        // Get the dropped slot data
        const { date, mealType } = over.data.current as { date: string; mealType: MealType };

        // Get the dragged recipe
        const recipe = (active.data.current as { recipe: Recipe })?.recipe;
        if (!recipe) return;

        // Create the meal (replaces any existing meal in slot)
        const { meal, error } = await replaceMealInSlot({
            recipe_id: recipe.id,
            date,
            meal_type: mealType,
            servings: 2, // Default to 2 servings
        });

        if (!error && meal) {
            // Reload meals to get fresh data
            loadMeals();
        }
    };

    // Handle meal removal
    const handleRemoveMeal = async (mealId: string) => {
        const { success } = await deletePlannedMeal(mealId);
        if (success) {
            setMeals(meals.filter((m) => m.id !== mealId));
        }
    };

    // Handle servings change
    const handleServingsChange = async (mealId: string, servings: number) => {
        const { meal, error } = await updatePlannedMeal(mealId, { servings });
        if (!error && meal) {
            // Update local state
            setMeals(prev => prev.map(m =>
                m.id === mealId ? { ...m, servings: meal.servings } : m
            ));
        }
    };

    // Navigation
    const goToPreviousWeek = () => setWeekStart((w) => subWeeks(w, 1));
    const goToNextWeek = () => setWeekStart((w) => addWeeks(w, 1));
    const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="page weekly-planner-page">
                <div className="planner-layout">
                    {/* Main planner area */}
                    <div className="planner-main">
                        <div className="planner-header">
                            <h1>📅 Weekly Planner</h1>

                            <div className="week-navigation">
                                <button onClick={goToPreviousWeek} className="btn-nav">
                                    ← Previous
                                </button>
                                <button onClick={goToCurrentWeek} className="btn-today">
                                    Today
                                </button>
                                <button onClick={goToNextWeek} className="btn-nav">
                                    Next →
                                </button>
                            </div>

                            <div className="week-range">
                                {format(weekStart, 'MMM d')} - {format(addWeeks(weekStart, 1), 'MMM d, yyyy')}
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading">Chargement du planning...</div>
                        ) : (
                            <WeekGrid
                                weekStart={weekStart}
                                meals={meals}
                                onRemoveMeal={handleRemoveMeal}
                                onServingsChange={handleServingsChange}
                            />
                        )}
                    </div>

                    {/* Recipe sidebar */}
                    <RecipeSidebar />
                </div>
            </div>
        </DndContext>
    );
}
