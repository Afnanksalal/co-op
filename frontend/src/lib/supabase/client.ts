import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function clearSupabaseClient() {
  // No-op - kept for API compatibility
}

// Validate session belongs to expected user
export async function validateSessionIntegrity(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  
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

// Clear all auth storage on logout
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
      key.includes('coop-current-user')
    )) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  sessionStorage.clear();
}
