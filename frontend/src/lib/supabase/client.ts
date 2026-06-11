import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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
