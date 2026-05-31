const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function extractApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return { message: fallback, code: undefined };
  }

  const data = payload as {
    detail?: string | { message?: string; code?: string };
    message?: string;
    code?: string;
  };

  if (typeof data.detail === 'object' && data.detail !== null) {
    return {
      message: data.detail.message || fallback,
      code: data.detail.code || data.code
    };
  }

  return {
    message: data.detail || data.message || fallback,
    code: data.code
  };
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: HttpMethod;
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers || {}) };

  if (options.token) {
    headers.Authorization = 'Bearer ' + options.token;
  }

  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store'
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;
    try {
      const payload = await response.json();
      const parsed = extractApiError(payload, message);
      message = parsed.message;
      code = parsed.code;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
