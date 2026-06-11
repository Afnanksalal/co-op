import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService, SupabaseUser } from '@/common/supabase/supabase.service';

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: SupabaseUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new ForbiddenException('Missing or invalid authorization header');
    }

    const supabaseUser = await this.supabase.verifyToken(authHeader.substring(7));

    if (!supabaseUser) {
      throw new ForbiddenException('Invalid or expired token');
    }

    request.user = supabaseUser;
    return true;
  }
}
