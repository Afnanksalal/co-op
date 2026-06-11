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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private async headers(authenticated: boolean): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authenticated) {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new ApiError('Sign in required', 401);
      }

      headers.Authorization = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit & { authenticated?: boolean } = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(await this.headers(Boolean(options.authenticated))),
          ...options.headers,
        },
      });

      const requestId = response.headers.get('X-Request-Id') ?? undefined;
      const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

      if (!response.ok || !payload?.success) {
        throw new ApiError(payload?.error || payload?.message || `Request failed with ${response.status}`, response.status, requestId);
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
