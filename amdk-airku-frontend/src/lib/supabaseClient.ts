import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true, // Persist session in localStorage (default but explicit)
        autoRefreshToken: true, // Auto-refresh token before expiry (default but explicit)
        detectSessionInUrl: true, // Detect session from URL (for magic links, default but explicit)
        storage: window.localStorage, // Use localStorage for session storage
        storageKey: 'supabase.auth.token', // Custom storage key for clarity
    },
    global: {
        headers: {
            'X-Client-Info': 'ku-airku-frontend@1.0.0',
        },
    },
});

// Add global error handler to log Supabase errors without triggering logout
// This helps debug RLS/permission issues that might look like auth problems
const originalFrom = supabase.from.bind(supabase);
supabase.from = (table: string) => {
    const builder = originalFrom(table);
    const methods = ['select', 'insert', 'update', 'delete', 'upsert'];
    
    methods.forEach(method => {
        const original = (builder as any)[method].bind(builder);
        (builder as any)[method] = (...args: any[]) => {
            const result = original(...args);
            // Wrap the promise to add error logging
            if (result && typeof result.then === 'function') {
                return result.then((response: any) => {
                    if (response.error) {
                        console.error(`[Supabase ${method.toUpperCase()}] Error on table '${table}':`, response.error);
                        // Don't throw - let the caller handle it
                    }
                    return response;
                });
            }
            return result;
        };
    });
    
    return builder;
};

