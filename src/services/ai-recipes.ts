/**
 * AI Recipe Service
 * 
 * Generates recipes using OpenAI GPT-4 and creates images with DALL-E.
 */

import { openai, isOpenAIConfigured } from '../lib/openai';
import type { RecipeInput, IngredientInput } from '../lib/database.types';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedRecipe extends RecipeInput {
    image_url?: string;
}

export interface AIRecipeResult {
    recipe: GeneratedRecipe | null;
    error: Error | null;
}

// ============================================================================
// RECIPE GENERATION
// ============================================================================

/**
 * Generate a recipe from a text prompt using GPT-4.
 * 
 * @param prompt - Description of the desired recipe (e.g., "pasta rapide pour 4 personnes")
 * @param generateImage - Whether to also generate an image with DALL-E
 * @returns Generated recipe with ingredients
 * 
 * @example
 * ```ts
 * const { recipe } = await generateRecipeFromPrompt("tarte aux pommes facile");
 * console.log(recipe.name, recipe.ingredients);
 * ```
 */
export async function generateRecipeFromPrompt(
    prompt: string,
    generateImage: boolean = true
): Promise<AIRecipeResult> {
    if (!isOpenAIConfigured() || !openai) {
        return {
            recipe: null,
            error: new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env'),
        };
    }

    try {
        // Generate recipe with GPT-4
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Tu es un chef cuisinier expert. Génère des recettes en JSON.
          
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans \`\`\`), avec cette structure exacte:
{
  "name": "Nom de la recette",
  "description": "Description courte et appétissante",
  "category": "main|appetizer|dessert|breakfast|salad|soup|snack",
  "tags": ["origine_culinaire", "autre_tag", "..."],
  "prep_time_minutes": 30,
  "base_servings": 4,
  "ingredients": [
    {"name": "Ingrédient en français", "quantity": 200, "unit": "g", "aisle": "rayon"},
    ...
  ]
}

RÈGLES IMPORTANTES:
1. "base_servings" = nombre de personnes pour les quantités d'ingrédients
2. Les TAGS doivent TOUJOURS inclure l'origine de la cuisine (ex: "africaine", "asiatique", "européenne", "française", "italienne", "japonaise", "chinoise", "indienne", "mexicaine", "marocaine", "sénégalaise", "libanaise", "thaïlandaise", "méditerranéenne", "américaine", "moyen-orient")
3. Les noms d'ingrédients DOIVENT être en FRANÇAIS
4. Les rayons (aisle) possibles: produce, meat, dairy, bakery, pasta, grains, canned, frozen, spices, condiments, oils, beverages, snacks, international, other

Génère des recettes savoureuses, authentiques, avec des quantités précises.`,
                },
                {
                    role: 'user',
                    content: `Génère une recette pour: ${prompt}`,
                },
            ],
            temperature: 0.7,
            max_tokens: 1500,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        // Parse JSON response
        let recipeData: any;
        try {
            // Clean the response (remove markdown code blocks if present)
            const cleanedContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            recipeData = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error('Failed to parse recipe JSON:', content);
            throw new Error('Failed to parse recipe from AI response');
        }

        // Validate and transform the recipe
        const recipe: GeneratedRecipe = {
            name: recipeData.name || 'Recette sans nom',
            description: recipeData.description || null,
            category: recipeData.category || 'main',
            tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
            prep_time_minutes: recipeData.prep_time_minutes || null,
            base_servings: recipeData.base_servings || 4, // Default to 4 servings
            source_url: null,
            ingredients: (recipeData.ingredients || []).map((ing: any): IngredientInput => ({
                name: ing.name || 'Ingrédient',
                quantity: typeof ing.quantity === 'number' ? ing.quantity : null,
                unit: ing.unit || null,
                aisle: ing.aisle || 'other',
            })),
        };

        // Generate image if requested
        if (generateImage) {
            try {
                const imageUrl = await generateRecipeImage(recipe.name);
                if (imageUrl) {
                    recipe.image_url = imageUrl;
                }
            } catch (imgError) {
                console.warn('Failed to generate image:', imgError);
                // Continue without image
            }
        }

        return { recipe, error: null };
    } catch (error) {
        console.error('AI recipe generation error:', error);
        return {
            recipe: null,
            error: error instanceof Error ? error : new Error('Failed to generate recipe'),
        };
    }
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generate a food image using DALL-E.
 * 
 * @param recipeName - Name of the recipe to visualize
 * @returns URL of the generated image
 */
export async function generateRecipeImage(recipeName: string): Promise<string | null> {
    if (!isOpenAIConfigured() || !openai) {
        return null;
    }

    try {
        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `Professional food photography of "${recipeName}". Beautifully plated, appetizing, warm lighting, shallow depth of field, top-down or 45-degree angle view. Restaurant quality presentation.`,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
        });

        return response.data?.[0]?.url || null;
    } catch (error) {
        console.error('DALL-E image generation error:', error);
        return null;
    }
}

/**
 * Search for a food image on Unsplash (free alternative to DALL-E).
 * 
 * @param query - Search query (recipe name)
 * @returns URL of a matching image
 */
export async function searchFoodImage(query: string): Promise<string | null> {
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

    // Try Unsplash API if key is provided
    if (unsplashKey) {
        try {
            const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' food dish')}&per_page=1&orientation=landscape`,
                {
                    headers: {
                        Authorization: `Client-ID ${unsplashKey}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                const imageUrl = data.results[0]?.urls?.regular;
                if (imageUrl) return imageUrl;
            }
        } catch (error) {
            console.warn('Unsplash API error:', error);
        }
    }

    // Fallback: Use Lorem Picsum for food-like images (always works)
    // Or use a curated set of placeholder food images
    const foodImageIds = [
        '1504674900247-0877df9cc836', // pasta
        '1567620905732-2d1ec7ab7445', // pancakes
        '1565299624946-b28f40a0ae38', // pizza
        '1540189549336-e6e99c3679fe', // salad
        '1476224203421-9ac39bcb3327', // rice bowl
        '1432139509613-5c4255815697', // steak
        '1512621776951-a57141f2eefd', // vegetables
        '1473093295043-cdd812d0e601', // breakfast
        '1547592180-85f173990554', // burger
        '1551183053-bf91a1d81141', // soup
    ];

    // Pick a random food image as fallback
    const randomId = foodImageIds[Math.floor(Math.random() * foodImageIds.length)];
    return `https://images.unsplash.com/photo-${randomId}?w=800&h=600&fit=crop`;
}

// ============================================================================
// RECIPE SUGGESTIONS
// ============================================================================

/**
 * Get recipe suggestions based on available ingredients.
 * 
 * @param ingredients - List of available ingredients
 * @returns List of recipe ideas
 */
export async function getSuggestionsFromIngredients(
    ingredients: string[]
): Promise<string[]> {
    if (!isOpenAIConfigured() || !openai) {
        return [];
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Tu es un chef cuisinier. Suggère 5 idées de recettes basées sur les ingrédients disponibles. Réponds avec une liste JSON simple: ["recette 1", "recette 2", ...]',
                },
                {
                    role: 'user',
                    content: `Ingrédients disponibles: ${ingredients.join(', ')}`,
                },
            ],
            temperature: 0.8,
            max_tokens: 200,
        });

        const content = completion.choices[0]?.message?.content || '[]';
        return JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    } catch (error) {
        console.error('Suggestions error:', error);
        return [];
    }
}
