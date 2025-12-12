import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ApiKeyData {
  id: string;
  name: string;
  userId: string;
  scopes: string[];
  createdAt: string;
}

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyData | null => {
    const request = ctx.switchToHttp().getRequest<{ apiKeyData?: ApiKeyData }>();
    return request.apiKeyData ?? null;
  },
);
