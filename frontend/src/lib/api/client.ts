import { createClient } from '@/lib/supabase/client';
import type {
  ActivateLicenseRequest,
  ActivationResponse,
  ApiResponse,
  CreateLicenseRequest,
  CreatedLicense,
  HeartbeatLicenseRequest,
  LicenseEntitlement,
  LicenseSummary,
} from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api/v1' : '');
const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_REFRESH_WINDOW_SECONDS = 60;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private async getAccessToken(forceRefresh = false): Promise<string> {
    const supabase = createClient();

    if (forceRefresh) {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error || !session?.access_token) {
        throw new ApiError('Sign in required', 401);
      }

      return session.access_token;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new ApiError('Sign in required', 401);
    }

    if (
      session.expires_at &&
      session.expires_at - Math.floor(Date.now() / 1000) <= TOKEN_REFRESH_WINDOW_SECONDS
    ) {
      return this.getAccessToken(true);
    }

    return session.access_token;
  }

  private async headers(authenticated: boolean, forceRefresh = false): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authenticated) {
      headers.Authorization = `Bearer ${await this.getAccessToken(forceRefresh)}`;
    }

    return headers;
  }

  private async send<T>(
    endpoint: string,
    options: RequestInit & { authenticated?: boolean } = {},
    forceRefresh = false
  ): Promise<T> {
    if (!API_URL) {
      throw new ApiError('Co-Op API URL is not configured', 500);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(await this.headers(Boolean(options.authenticated), forceRefresh)),
          ...options.headers,
        },
      });

      const requestId = response.headers.get('X-Request-Id') ?? undefined;
      const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

      if (!response.ok || !payload?.success) {
        throw new ApiError(
          payload?.error || payload?.message || `Request failed with ${response.status}`,
          response.status,
          requestId
        );
      }

      return payload.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request timed out', 408);
      }
      throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { authenticated?: boolean } = {}
  ): Promise<T> {
    try {
      return await this.send<T>(endpoint, options);
    } catch (error) {
      if (
        options.authenticated &&
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        return this.send<T>(endpoint, options, true);
      }

      throw error;
    }
  }

  listLicenses(): Promise<LicenseSummary[]> {
    return this.request<LicenseSummary[]>('/licenses', { authenticated: true });
  }

  createLicense(data: CreateLicenseRequest): Promise<CreatedLicense> {
    return this.request<CreatedLicense>('/licenses', {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(data),
    });
  }

  listMyLicenses(): Promise<LicenseSummary[]> {
    return this.request<LicenseSummary[]>('/licenses/mine', { authenticated: true });
  }

  createSelfServiceLicense(): Promise<CreatedLicense> {
    return this.request<CreatedLicense>('/licenses/self-service', {
      method: 'POST',
      authenticated: true,
    });
  }

  activateCloudLicense(data: ActivateLicenseRequest): Promise<ActivationResponse> {
    return this.request<ActivationResponse>('/licenses/activate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  heartbeatLicense(data: HeartbeatLicenseRequest): Promise<LicenseEntitlement> {
    return this.request<LicenseEntitlement>('/licenses/heartbeat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
