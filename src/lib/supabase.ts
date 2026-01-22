/**
 * Supabase Client Configuration
 * 
 * Creates a typed Supabase client for use throughout the application.
 * Environment variables must be set in .env file.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
        'Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    );
}

/**
 * Typed Supabase client
 * 
 * Usage:
 * ```ts
 * const { data, error } = await supabase
 *   .from('recipes')
 *   .select('*');
 * // data is typed as Recipe[] | null
 * ```
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Get the current authenticated user's ID
 * 
 * @returns User ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
}

/**
 * Get the current authenticated user's ID synchronously from session
 * Useful for RLS operations where we need the user_id immediately
 * 
 * @throws Error if no active session
 */
export function getSessionUserId(): string {
    // Note: supabase.auth.getSession() is async, so we need a different approach for sync access
    // This helper is mainly for documentation - use the service layer instead
    throw new Error('Use getCurrentUserId() or access user from auth context');
}
