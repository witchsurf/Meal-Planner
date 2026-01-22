/**
 * OpenAI Client Configuration
 * 
 * Provides access to GPT-4 for recipe generation and DALL-E for images.
 */

import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Create OpenAI client (will be null if no API key)
export const openai = apiKey
    ? new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
    })
    : null;

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
    return !!openai;
}
