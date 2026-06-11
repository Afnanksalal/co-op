import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export interface SupabaseUser {
  id: string;
  email: string;
  role: string;
  authProvider: string;
  name: string;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured');
    }

    this.client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log(`Supabase client initialized with ${supabaseServiceKey ? 'service' : 'anon'} key`);
  }

  async verifyToken(token: string): Promise<SupabaseUser | null> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser(token);

    if (error || !user) {
      this.logger.warn(`Token verification failed: ${error?.message ?? 'No user'}`);
      return null;
    }

    return this.mapUser(user);
  }

  private mapUser(user: User): SupabaseUser {
    // Extract auth provider from app_metadata or identities
    let authProvider = 'email';
    if (user.app_metadata?.provider) {
      authProvider = user.app_metadata.provider;
    } else if (user.identities && user.identities.length > 0) {
      authProvider = user.identities[0].provider;
    }

    // Extract name from user_metadata (OAuth providers set this)
    const name = (user.user_metadata?.full_name as string) ??
      (user.user_metadata?.name as string) ??
      (user.email?.split('@')[0] ?? 'User');

    // Extract avatar URL
    const avatarUrl = (user.user_metadata?.avatar_url as string) ??
      (user.user_metadata?.picture as string) ??
      null;

    return {
      id: user.id,
      email: user.email ?? '',
      role: (user.app_metadata?.role as string) ?? 'user',
      authProvider,
      name,
      avatarUrl,
      metadata: user.user_metadata ?? {},
    };
  }
}
