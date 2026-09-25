import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks to avoid crashes
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : "") || "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : "") || "").trim().replace(/\r?\n/g, '');

// DIAGNOSTIC LOGS (Dev only — not exposed in production)
if (import.meta.env.DEV) {
    console.log('--- [SYSTEM] Supabase Configuration Check ---');
    console.log('URL present:', !!supabaseUrl);
    if (supabaseUrl) console.log('URL domain:', supabaseUrl.split('/')[2]);
    console.log('Key present:', !!supabaseAnonKey);
    console.log('Platform:', typeof window !== 'undefined' ? 'Web/Capacitor' : 'Node');
    console.log('-------------------------------------------');
}

let supabaseInstance: any;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'levelmak-auth-token',
                flowType: 'pkce', // PKCE is generally better for mobile
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
                    return await fn();
                },
            }
        });
        console.log('✅ Supabase client initialized successfully');
    } catch (e) {
        console.error('❌ Supabase initialization error:', e);
    }
}

// If initialization failed or keys are missing, use a safe mock that reports the error
if (!supabaseInstance) {
    console.error('⚠️ Supabase client could not be initialized: missing URL or Key. Using mock.');
    const mockError = (method: string) => {
        console.warn(`Supabase mock called: ${method} - Config is missing!`);
        return Promise.resolve({ 
            data: null, 
            error: { 
                message: 'Configuration Supabase manquante ou invalide. Vérifiez vos variables d\'environnement (VITE_SUPABASE_URL).',
                code: 'MISSING_CONFIG'
            } 
        });
    };

    supabaseInstance = {
        from: (table: string) => ({ 
            select: () => ({ 
                eq: () => ({ 
                    single: () => mockError(`from(${table}).select().eq().single()`),
                    maybeSingle: () => mockError(`from(${table}).select().eq().maybeSingle()`),
                    order: () => ({ limit: () => mockError(`from(${table}).select().eq().order().limit()`) }) 
                }),
                maybeSingle: () => mockError(`from(${table}).select().maybeSingle()`),
            }), 
            insert: () => mockError(`from(${table}).insert()`), 
            upsert: () => mockError(`from(${table}).upsert()`),
            update: () => ({ eq: () => mockError(`from(${table}).update().eq()`) }),
            delete: () => ({ eq: () => mockError(`from(${table}).delete().eq()`) })
        }),
        auth: { 
            onAuthStateChange: () => {
                console.warn('Supabase auth.onAuthStateChange called on mock');
                return { data: { subscription: { unsubscribe: () => {} } } };
            }, 
            getSession: () => {
                console.warn('Supabase auth.getSession called on mock');
                return Promise.resolve({ data: { session: null }, error: null });
            },
            getUser: () => {
                console.warn('Supabase auth.getUser called on mock');
                return Promise.resolve({ data: { user: null }, error: null });
            },
            signOut: () => Promise.resolve({ error: null }),
            signUp: () => mockError('auth.signUp'),
            signInWithPassword: () => mockError('auth.signInWithPassword'),
            signInWithOtp: () => mockError('auth.signInWithOtp'),
            signInWithOAuth: () => mockError('auth.signInWithOAuth'),
            updateUser: () => mockError('auth.updateUser')
        },
        storage: {
            from: (bucket: string) => ({
                upload: () => mockError(`storage.from(${bucket}).upload()`),
                getPublicUrl: () => ({ data: { publicUrl: '' } })
            })
        },
        functions: {
            invoke: () => mockError('functions.invoke')
        },
        channel: (name: string, _opts?: any) => {
            console.warn(`Supabase channel("${name}") called on fallback mock`);
            const mockChannel: any = {
                on: () => mockChannel,
                subscribe: (cb?: (status: string) => void) => {
                    if (cb) setTimeout(() => cb('SUBSCRIBED'), 0);
                    return mockChannel;
                },
                unsubscribe: () => Promise.resolve('ok'),
                send: () => Promise.resolve('ok'),
                track: () => Promise.resolve('ok'),
                untrack: () => Promise.resolve('ok')
            };
            return mockChannel;
        },
        removeChannel: (_channel: any) => Promise.resolve('ok')
    };
}

export const supabase = supabaseInstance;
