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

// En errores de validación el backend manda el motivo en details; se muestra el primero.
const errorMessage = (body: ApiErrorBody | null) => {
  const message = body?.error?.message ?? 'No fue posible completar la solicitud';
  const details = body?.error?.details;
  const first = Array.isArray(details) ? (details[0] as { message?: unknown } | undefined) : undefined;
  return typeof first?.message === 'string' ? `${message}: ${first.message}` : message;
};

// La app registra aquí qué hacer cuando el backend dice que la sesión ya no es válida.
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

// Solo rutas relativas de la API: una ruta armada con datos externos nunca lleva el token a otro host.
const apiUrl = (path: string) => {
  if (!/^\/[\w\-/?=&.%]*$/.test(path) || path.startsWith('//') || path.includes('..')) {
    throw new Error(`Ruta de API inválida: ${path}`);
  }
  return `${API_URL}${path}`;
};

export async function apiRequest<T>(
  path: string,
  session: ApiSession,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
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
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(errorMessage(body), response.status, body?.error?.code);
  }

  return body as T;
}

// Trae un archivo protegido (PDF, XML) con el token, para mostrarlo o descargarlo.
export async function apiBlob(path: string, session: ApiSession): Promise<Blob> {
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${session.token}` },
  });

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    const text = await response.text();
    const body = text ? (JSON.parse(text) as ApiErrorBody) : null;
    throw new ApiError(body ? errorMessage(body) : 'No fue posible obtener el archivo', response.status, body?.error?.code);
  }

  return response.blob();
}

export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export type ApiListResponse<T> = {
  data: T[];
};

export type ApiEntityResponse<T> = {
  data: T;
};

export const apiDownload = async (path: string, session: ApiSession, fileName: string) =>
  saveBlob(await apiBlob(path, session), fileName);
