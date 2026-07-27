import { loadSession, clearSession } from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  /** Only needed for pre-authentication requests (sign-up, login) that carry no bearer token yet. */
  readonly tenantId?: string;
}

/**
 * Thin fetch wrapper for the Wisdum API: attaches the bearer token from
 * the current session automatically, falls back to an explicit
 * `tenantId` header for pre-auth requests, normalizes network failures,
 * and converts error responses into `ApiError`.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const session = loadSession();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (session !== null) {
    headers.authorization = `Bearer ${session.token}`;
  }
  if (options.tenantId !== undefined) {
    headers['x-tenant-id'] = options.tenantId;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause: unknown) {
    throw new ApiError(
      `Unable to connect to Wisdum API at ${API_URL}. Please ensure the backend server is running.`,
      0,
      'network_error',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data: unknown = text.length > 0 ? JSON.parse(text) : undefined;

  if (!response.ok) {
    if (response.status === 401 && path !== '/v1/auth/login') {
      clearSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
    }

    const envelope = data as { error?: { message?: string; code?: string } } | undefined;
    throw new ApiError(
      envelope?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      envelope?.error?.code ?? 'unknown_error',
    );
  }

  return data as T;
}
