export type ApiSession = {
  token: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

type ApiErrorBody = {
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  session: ApiSession,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...options.headers,
    },
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as ApiErrorBody & T) : null;

  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? 'No fue posible completar la solicitud',
      response.status,
      body?.error?.code,
    );
  }

  return body as T;
}

export type ApiListResponse<T> = {
  data: T[];
};

export type ApiEntityResponse<T> = {
  data: T;
};
