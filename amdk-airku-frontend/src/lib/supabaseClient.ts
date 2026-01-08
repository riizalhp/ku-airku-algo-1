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
