import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function isMobileRequest(searchParams: URLSearchParams, userAgent: string): boolean {
  return searchParams.get('mobile') === 'true' || 
         userAgent.includes('CoOpMobile');
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const userAgent = request.headers.get('user-agent') || '';
  
  const isMobile = isMobileRequest(searchParams, userAgent);
  
  // Handle OAuth error responses
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  if (errorParam) {
    const errorMsg = errorDescription || errorParam;
    
    if (isMobile) {
      return NextResponse.redirect(`${origin}/auth/mobile-redirect?error=${encodeURIComponent(errorMsg)}`);
    }
    
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`);
  }

  // For mobile implicit flow: tokens come in URL fragment (handled client-side)
  // This route won't receive them directly, so redirect to a client page that can read the fragment
  if (isMobile && !code) {
    // Redirect to mobile-callback which will read tokens from URL fragment
    return NextResponse.redirect(`${origin}/auth/mobile-callback`);
  }

  // For web PKCE flow: exchange code for session
  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // For web: Redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
    
    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'auth_failed')}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
