/**
 * Seed Script - Sample Recipes
 * 
 * Run this in the browser console when logged in to add sample recipes.
 * Or execute in Supabase SQL Editor with your user ID.
 */

import { supabase } from './lib/supabase';

export async function seedSampleRecipes() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('Please log in first');
        return;
    }

    const recipes = [
        {
            name: 'Pasta Carbonara',
            description: 'Classic Italian pasta with eggs, cheese, and pancetta',
            category: 'main',
            tags: ['italian', 'quick', 'pasta'],
            prep_time_minutes: 25,
            ingredients: [
                { name: 'Spaghetti', quantity: 400, unit: 'g', aisle: 'pasta' },
                { name: 'Pancetta', quantity: 200, unit: 'g', aisle: 'deli' },
                { name: 'Eggs', quantity: 4, unit: null, aisle: 'dairy' },
                { name: 'Parmesan', quantity: 100, unit: 'g', aisle: 'dairy' },
                { name: 'Black pepper', quantity: 1, unit: 'tsp', aisle: 'spices' },
            ],
        },
        {
            name: 'Greek Salad',
            description: 'Fresh Mediterranean salad with feta cheese',
            category: 'salad',
            tags: ['vegetarian', 'healthy', 'quick'],
            prep_time_minutes: 15,
            ingredients: [
                { name: 'Cucumber', quantity: 1, unit: null, aisle: 'produce' },
                { name: 'Tomatoes', quantity: 4, unit: null, aisle: 'produce' },
                { name: 'Red onion', quantity: 1, unit: null, aisle: 'produce' },
                { name: 'Feta cheese', quantity: 200, unit: 'g', aisle: 'dairy' },
                { name: 'Olives', quantity: 100, unit: 'g', aisle: 'canned' },
                { name: 'Olive oil', quantity: 3, unit: 'tbsp', aisle: 'oils' },
            ],
        },
        {
            name: 'Chicken Stir Fry',
            description: 'Quick and healthy Asian-style stir fry',
            category: 'main',
            tags: ['asian', 'quick', 'healthy'],
            prep_time_minutes: 20,
            ingredients: [
                { name: 'Chicken breast', quantity: 500, unit: 'g', aisle: 'meat' },
                { name: 'Bell peppers', quantity: 2, unit: null, aisle: 'produce' },
                { name: 'Broccoli', quantity: 300, unit: 'g', aisle: 'produce' },
                { name: 'Soy sauce', quantity: 3, unit: 'tbsp', aisle: 'asian' },
                { name: 'Ginger', quantity: 1, unit: 'tbsp', aisle: 'produce' },
                { name: 'Garlic', quantity: 3, unit: 'cloves', aisle: 'produce' },
                { name: 'Rice', quantity: 300, unit: 'g', aisle: 'grains' },
            ],
        },
        {
            name: 'Overnight Oats',
            description: 'Easy make-ahead breakfast with fruits',
            category: 'breakfast',
            tags: ['vegetarian', 'healthy', 'make-ahead'],
            prep_time_minutes: 5,
            ingredients: [
                { name: 'Rolled oats', quantity: 80, unit: 'g', aisle: 'breakfast' },
                { name: 'Milk', quantity: 200, unit: 'ml', aisle: 'dairy' },
                { name: 'Greek yogurt', quantity: 100, unit: 'g', aisle: 'dairy' },
                { name: 'Honey', quantity: 1, unit: 'tbsp', aisle: 'condiments' },
                { name: 'Berries', quantity: 100, unit: 'g', aisle: 'produce' },
            ],
        },
        {
            name: 'Tacos',
            description: 'Mexican-style tacos with ground beef',
            category: 'main',
            tags: ['mexican', 'quick', 'family'],
            prep_time_minutes: 30,
            ingredients: [
                { name: 'Ground beef', quantity: 500, unit: 'g', aisle: 'meat' },
                { name: 'Taco shells', quantity: 8, unit: null, aisle: 'international' },
                { name: 'Lettuce', quantity: 1, unit: 'head', aisle: 'produce' },
                { name: 'Tomatoes', quantity: 2, unit: null, aisle: 'produce' },
                { name: 'Cheddar cheese', quantity: 150, unit: 'g', aisle: 'dairy' },
                { name: 'Sour cream', quantity: 100, unit: 'g', aisle: 'dairy' },
                { name: 'Taco seasoning', quantity: 1, unit: 'packet', aisle: 'spices' },
            ],
        },
        {
            name: 'Avocado Toast',
            description: 'Simple and nutritious breakfast',
            category: 'breakfast',
            tags: ['vegetarian', 'quick', 'healthy'],
            prep_time_minutes: 10,
            ingredients: [
                { name: 'Sourdough bread', quantity: 2, unit: 'slices', aisle: 'bakery' },
                { name: 'Avocado', quantity: 1, unit: null, aisle: 'produce' },
                { name: 'Eggs', quantity: 2, unit: null, aisle: 'dairy' },
                { name: 'Cherry tomatoes', quantity: 100, unit: 'g', aisle: 'produce' },
                { name: 'Lemon', quantity: 0.5, unit: null, aisle: 'produce' },
            ],
        },
    ];

    console.log('Creating sample recipes...');

    for (const recipe of recipes) {
        const { ingredients, ...recipeData } = recipe;

        // Create recipe
        const { data: newRecipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({ ...recipeData, user_id: user.id })
            .select()
            .single();

        if (recipeError) {
            console.error('Error creating recipe:', recipeData.name, recipeError);
            continue;
        }

        // Create ingredients
        const ingredientInserts = ingredients.map(ing => ({
            ...ing,
            recipe_id: newRecipe.id,
        }));

        const { error: ingError } = await supabase
            .from('ingredients')
            .insert(ingredientInserts);

        if (ingError) {
            console.error('Error creating ingredients for:', recipeData.name, ingError);
        } else {
            console.log('Created:', recipeData.name);
        }
    }

    console.log('Done! Refresh the page to see your recipes.');
}

// Make it available globally for console use
if (typeof window !== 'undefined') {
    (window as any).seedSampleRecipes = seedSampleRecipes;
}
