import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Check if user needs onboarding
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Redirect to onboarding check - the dashboard layout will handle the redirect
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
