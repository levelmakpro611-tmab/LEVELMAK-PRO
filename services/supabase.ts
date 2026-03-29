import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing in .env');
}

// Build Version: 0.1.76 - Supabase Resilience Fix
let supabaseInstance: any;

if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'levelmak-auth-token',
            flowType: 'implicit',
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
                return await fn();
            },
        }
    });
} else {
    console.error('Supabase client could not be initialized: missing URL or Key');
    // Mock minimal pour éviter les erreurs d'importation
    supabaseInstance = {
        from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Missing Config') }) }) }), insert: () => Promise.resolve({ error: new Error('Missing Config') }), upsert: () => Promise.resolve({ error: new Error('Missing Config') }) }),
        auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getSession: () => Promise.resolve({ data: { session: null } }), signOut: () => Promise.resolve() }
    };
}

export const supabase = supabaseInstance;
