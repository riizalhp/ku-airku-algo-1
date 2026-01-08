import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AppContextType, User } from '../types';
import { supabase } from '../lib/supabaseClient';

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchProfile = async (userId: string) => {
        try {
            console.log("AppContext: fetchProfile called for", userId);
            
            // Add timeout to prevent infinite hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Fetch profile timeout')), 5000)
            );
            
            const fetchPromise = supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            console.log("AppContext: fetchProfile result", { data, error });

            if (error) {
                console.error("Error fetching user profile:", error);
                // If profile not found but auth exists, maybe force logout or handle gracefully
                return null;
            }
            return data as User;
        } catch (err) {
            console.error("AppContext: fetchProfile exception", err);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;
        console.log("AppContext: Initializing...");

        // Check active session
        const checkSession = async () => {
            try {
                console.log("AppContext: Checking session...");
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log("AppContext: getSession result", { session, error });

                if (session?.user) {
                    console.log("AppContext: Session found, fetching profile for", session.user.id);
                    setToken(session.access_token);
                    const user = await fetchProfile(session.user.id);
                    console.log("AppContext: Profile fetched", user);
                    if (mounted) {
                        setCurrentUser(user);
                        console.log("AppContext: currentUser set from checkSession");
                    }
                } else {
                    console.log("AppContext: No session found");
                }
            } catch (err) {
                console.error("AppContext: Session check failed", err);
            } finally {
                console.log("AppContext: Setting isLoading false (session check)");
                if (mounted) {
                    setIsLoading(false);
                    console.log("AppContext: isLoading set to false");
                }
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("AppContext: Auth Change:", event, session ? `Session valid` : 'No session');
            
            // Don't logout on INITIAL_SESSION - this prevents false logouts on page load
            if (event === 'INITIAL_SESSION' && !session) {
                console.log("AppContext: Skipping INITIAL_SESSION without session (normal page load)");
                return;
            }
            
            // Skip processing if event is USER_UPDATED (metadata changes, not auth changes)
            if (event === 'USER_UPDATED') {
                console.log("AppContext: Skipping USER_UPDATED (metadata only)");
                return;
            }
            
            try {
                if (event === 'SIGNED_OUT') {
                    console.log("AppContext: User signed out");
                    setToken(null);
                    if (mounted) {
                        setCurrentUser(null);
                    }
                } else if (event === 'TOKEN_REFRESHED') {
                    console.log("AppContext: Token refreshed successfully");
                    // Token refresh is automatic, just update token - don't refetch profile
                    if (session) {
                        setToken(session.access_token);
                    }
                } else if (event === 'SIGNED_IN' && session?.user) {
                    // Only fetch profile on actual sign in
                    console.log("AppContext: User signed in, fetching profile for", session.user.id);
                    setToken(session.access_token);
                    const user = await fetchProfile(session.user.id);
                    console.log("AppContext: Profile loaded from sign in", user);
                    if (mounted) {
                        setCurrentUser(user);
                        console.log("AppContext: currentUser set");
                    }
                } else if (session?.user && !currentUser) {
                    // Fallback: If we have a session but no currentUser (shouldn't happen but defensive)
                    console.log("AppContext: Session exists but no currentUser, fetching profile");
                    setToken(session.access_token);
                    const user = await fetchProfile(session.user.id);
                    if (mounted && user) {
                        setCurrentUser(user);
                    }
                }
            } catch (err) {
                console.error("AppContext: Error in auth state change", err);
            } finally {
                // Ensure loading is set to false after auth change processing
                console.log("AppContext: Setting isLoading false (auth change)");
                if (mounted) setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        console.log('🔐 Login attempt using SUPABASE AUTH (not railway) - v2024.01.08');
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setIsLoading(false);
            throw error;
        }

        // Profile will be loaded by onAuthStateChange or we can load it here to await
        if (data.session?.user) {
            const user = await fetchProfile(data.session.user.id);
            setCurrentUser(user);
        }
        setIsLoading(false);
    }, []);

    const logout = useCallback(async () => {
        console.log('Logging out...');
        
        // Sign out from Supabase first
        await supabase.auth.signOut();
        
        // Clear local state
        setCurrentUser(null);
        setToken(null);
    }, []);

    const value: AppContextType = {
        currentUser,
        token,
        isLoading,
        login,
        logout,
    };

    return (
        <AppContext.Provider value={value}>
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-brand-background">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                    <span className="ml-4 text-brand-dark font-medium">Memuat Aplikasi...</span>
                </div>
            ) : children}
        </AppContext.Provider>
    );
};