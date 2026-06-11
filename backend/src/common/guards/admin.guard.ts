import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import type { AuthenticatedRequest } from './auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const supabaseUser = await this.supabase.verifyToken(authHeader.substring(7));

    if (!supabaseUser) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (supabaseUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    request.user = supabaseUser;
    return true;
  }
}
