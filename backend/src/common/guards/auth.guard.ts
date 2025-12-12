import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // TODO: Implement JWT verification
      // const decoded = jwt.verify(token, this.configService.get('JWT_SECRET'));
      // request.user = decoded;

      // Stub: Set mock user for development
      request.user = {
        id: 'stub-user-id',
        email: 'stub@example.com',
        role: 'user',
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
