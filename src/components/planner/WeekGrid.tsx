/**
 * Week Grid Component
 * 
 * Displays a 7-day grid with meal slots for each day.
 */

import { format, addDays } from 'date-fns';
import { MealSlot } from './MealSlot';
import type { PlannedMealWithRecipe, MealType } from '../../lib/database.types';

interface WeekGridProps {
    /** Start date of the week (defaults to start of current week) */
    weekStart: Date;
    /** All planned meals for the week */
    meals: PlannedMealWithRecipe[];
    /** Called when a meal is removed */
    onRemoveMeal: (mealId: string) => void;
    /** Called when servings are changed */
    onServingsChange?: (mealId: string, servings: number) => void;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
    breakfast: 'Petit-déj',
    lunch: 'Déjeuner',
    dinner: 'Dîner',
    snack: 'Collation',
};

export function WeekGrid({ weekStart, meals, onRemoveMeal, onServingsChange }: WeekGridProps) {
    // Generate the 7 days of the week
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Create a lookup map for quick meal access
    const mealMap = new Map<string, PlannedMealWithRecipe>();
    meals.forEach((meal) => {
        const key = `${meal.date}-${meal.meal_type}`;
        mealMap.set(key, meal);
    });

    return (
        <div className="week-grid">
            {/* Header row with day names */}
            <div className="week-grid-header">
                <div className="slot-header empty" /> {/* Corner cell */}
                {days.map((day) => (
                    <div key={day.toISOString()} className="slot-header day">
                        <span className="day-name">{format(day, 'EEE')}</span>
                        <span className="day-date">{format(day, 'd MMM')}</span>
                    </div>
                ))}
            </div>

            {/* Meal type rows */}
            {MEAL_TYPES.map((mealType) => (
                <div key={mealType} className="week-grid-row">
                    {/* Row label */}
                    <div className="slot-header meal-type">
                        <span>{MEAL_TYPE_LABELS[mealType]}</span>
                    </div>

                    {/* Day slots */}
                    {days.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const key = `${dateStr}-${mealType}`;
                        const meal = mealMap.get(key);

                        return (
                            <MealSlot
                                key={key}
                                date={dateStr}
                                mealType={mealType}
                                meal={meal}
                                onRemove={onRemoveMeal}
                                onServingsChange={onServingsChange}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
