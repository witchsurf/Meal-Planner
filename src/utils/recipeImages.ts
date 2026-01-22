/**
 * Recipe Image Utilities
 * 
 * Centralized image handling for recipes - ensures consistency
 * across all components (cards, slots, detail pages).
 */

// Curated food images mapped to recipe keywords
const FOOD_IMAGE_MAP: Record<string, string> = {
    // African cuisine
    'thiep': 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop',
    'thieboudienne': 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop',
    'djolof': 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop',
    'jollof': 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&h=600&fit=crop',
    'couscous': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop',
    'tagine': 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&h=600&fit=crop',
    'tajine': 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&h=600&fit=crop',

    // French cuisine
    'quiche': 'https://images.unsplash.com/photo-1608855238293-a8853e7f7c98?w=800&h=600&fit=crop',
    'boeuf': 'https://images.unsplash.com/photo-1544025162-d76978a8c3e5?w=800&h=600&fit=crop',
    'bourguignon': 'https://images.unsplash.com/photo-1544025162-d76978a8c3e5?w=800&h=600&fit=crop',
    'croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=600&fit=crop',
    'crêpe': 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800&h=600&fit=crop',

    // Asian cuisine
    'stir fry': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=600&fit=crop',
    'sauté': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&h=600&fit=crop',
    'ramen': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop',
    'sushi': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=600&fit=crop',
    'curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop',
    'pad thai': 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&h=600&fit=crop',

    // Mexican
    'taco': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=600&fit=crop',
    'burrito': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&h=600&fit=crop',

    // Italian
    'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=600&fit=crop',
    'carbonara': 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=600&fit=crop',
    'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
    'lasagna': 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&h=600&fit=crop',
    'risotto': 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=600&fit=crop',

    // Breakfast
    'avocado toast': 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&h=600&fit=crop',
    'avocado': 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&h=600&fit=crop',
    'toast': 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=800&h=600&fit=crop',
    'oatmeal': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&h=600&fit=crop',
    'oats': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&h=600&fit=crop',
    'overnight': 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&h=600&fit=crop',
    'pancake': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',

    // Salads
    'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    'salade': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    'greek': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop',
    'caesar': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&h=600&fit=crop',

    // Soups
    'soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',
    'soupe': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',

    // Proteins
    'chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&h=600&fit=crop',
    'poulet': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&h=600&fit=crop',
    'steak': 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800&h=600&fit=crop',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop',
    'fish': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=600&fit=crop',
    'poisson': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=600&fit=crop',
    'salmon': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop',
    'saumon': 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop',

    // Rice dishes
    'riz': 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=800&h=600&fit=crop',
    'rice': 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=800&h=600&fit=crop',

    // Middle Eastern
    'falafel': 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=800&h=600&fit=crop',
    'hummus': 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=800&h=600&fit=crop',
    'kebab': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=600&fit=crop',
    'shawarma': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=600&fit=crop',
};

// Category fallbacks
const CATEGORY_FALLBACKS: Record<string, string> = {
    'main': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    'breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop',
    'dessert': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop',
    'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    'soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop',
    'snack': 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&h=600&fit=crop',
    'appetizer': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800&h=600&fit=crop',
};

const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop';

/**
 * Check if a URL is an expired DALL-E image
 */
export function isExpiredDalleUrl(url: string | null | undefined): boolean {
    if (!url) return true;
    return url.includes('oaidalleapi') || url.includes('openai.com');
}

/**
 * Find a matching image based on recipe name keywords
 */
export function findMatchingImage(recipeName: string, category?: string | null): string {
    const nameLower = recipeName.toLowerCase();

    // Check each keyword in order (longer matches first for accuracy)
    const sortedKeywords = Object.keys(FOOD_IMAGE_MAP).sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
        if (nameLower.includes(keyword)) {
            return FOOD_IMAGE_MAP[keyword];
        }
    }

    // Try category fallback
    if (category && CATEGORY_FALLBACKS[category]) {
        return CATEGORY_FALLBACKS[category];
    }

    return DEFAULT_FOOD_IMAGE;
}

/**
 * Get the best available image URL for a recipe
 * Used by all components to ensure consistency
 */
export function getRecipeImageUrl(recipe: {
    name: string;
    image_url?: string | null;
    category?: string | null;
}): string {
    // If valid non-DALL-E URL exists, use it
    if (recipe.image_url && !isExpiredDalleUrl(recipe.image_url)) {
        return recipe.image_url;
    }

    // Otherwise find a matching image
    return findMatchingImage(recipe.name, recipe.category);
}

/**
 * Get a smaller version of the image for thumbnails
 */
export function getRecipeImageUrlSmall(recipe: {
    name: string;
    image_url?: string | null;
    category?: string | null;
}): string {
    const url = getRecipeImageUrl(recipe);
    // Replace size parameters for smaller image
    return url.replace(/w=\d+/, 'w=400').replace(/h=\d+/, 'h=300');
}
