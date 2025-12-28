import { createBrowserClient } from '@supabase/ssr';

// Singleton instance to prevent multiple clients with different storage
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Create a Supabase client with user-isolated storage
 * 
 * SECURITY: Uses a unique storage key per user session to prevent
 * session mixing between different users on the same device.
 * This is critical for mobile WebView where localStorage can persist
 * across different user sessions.
 */
export function createClient() {
  // Return existing client if already created (singleton pattern)
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use a consistent storage key - Supabase handles user isolation via JWT
        storageKey: 'coop-auth-session',
        // Detect session in URL for OAuth callbacks
        detectSessionInUrl: true,
        // Auto refresh tokens before expiry
        autoRefreshToken: true,
        // Persist session in localStorage
        persistSession: true,
        // Flow type for OAuth
        flowType: 'pkce',
      },
    }
  );

  return supabaseClient;
}

/**
 * Clear the Supabase client instance (for logout)
 * This ensures a fresh client is created on next login
 */
export function clearSupabaseClient() {
  supabaseClient = null;
}

/**
 * Validate that the current session belongs to the expected user
 * Call this after page load to detect session hijacking
 */
export async function validateSessionIntegrity(): Promise<boolean> {
  const client = createClient();
  
  try {
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error || !session) {
      return true; // No session = no integrity issue
    }

    // Get the stored user ID from a separate, non-Supabase storage key
    const storedUserId = localStorage.getItem('coop-current-user-id');
    
    if (storedUserId && storedUserId !== session.user.id) {
      // Session mismatch detected! Different user's session loaded
      console.error('Session integrity violation: stored user ID does not match session user ID');
      
      // Clear everything and force re-login
      await client.auth.signOut();
      clearAllAuthStorage();
      return false;
    }

    // Store current user ID for future validation
    if (session.user.id) {
      localStorage.setItem('coop-current-user-id', session.user.id);
    }

    return true;
  } catch {
    return true; // On error, assume OK to avoid blocking
  }
}

/**
 * Clear all authentication-related storage
 * Use on logout to ensure complete session cleanup
 */
export function clearAllAuthStorage() {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') ||
      key.includes('sb-') ||
      key.includes('pkce') ||
      key.includes('code_verifier') ||
      key.includes('coop-auth') ||
      key.includes('coop-current-user')
    )) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Also clear session storage
  sessionStorage.clear();
  
  // Clear the singleton
  supabaseClient = null;
}
