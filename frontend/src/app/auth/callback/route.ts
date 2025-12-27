import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const MOBILE_APP_SCHEME = 'coop';

function isMobileRequest(searchParams: URLSearchParams, userAgent: string): boolean {
  // Check explicit mobile param or user agent
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
      return NextResponse.redirect(`${MOBILE_APP_SCHEME}://auth/error?message=${encodeURIComponent(errorMsg)}`);
    }
    
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`);
  }

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
      const { session } = data;
      
      if (isMobile) {
        // For mobile: Pass tokens via deep link
        const tokenParams = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: String(session.expires_at || ''),
        });
        
        return NextResponse.redirect(`${MOBILE_APP_SCHEME}://auth/callback#${tokenParams.toString()}`);
      }
      
      // For web: Redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
    
    if (error) {
      console.error('Auth callback error:', error.message);
      
      if (isMobile) {
        return NextResponse.redirect(`${MOBILE_APP_SCHEME}://auth/error?message=${encodeURIComponent(error.message)}`);
      }
      
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'auth_failed')}`);
    }
  }

  if (isMobile) {
    return NextResponse.redirect(`${MOBILE_APP_SCHEME}://auth/error?message=no_code`);
  }
  
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
