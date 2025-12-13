import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // Check onboarding status from backend
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (res.ok) {
          const json = await res.json();
          const user = json.data;
          
          // Redirect based on onboarding status
          if (!user.onboardingCompleted) {
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }
      } catch (e) {
        // If API call fails, still redirect to dashboard (it will handle the check)
        console.error('Failed to check onboarding status:', e);
      }
      
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
