import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest, setUnauthorizedHandler } from './api';

const mockFetch = (status: number, body: string) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  }));

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it('notifies the app when the session is no longer valid', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, JSON.stringify({ error: { message: 'Token invalido o expirado', code: 'UNAUTHORIZED' } }));

    await expect(apiRequest('/ordenes', { token: 'jwt' })).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not end the session on a permission error', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(403, JSON.stringify({ error: { message: 'Sin permisos', code: 'FORBIDDEN' } }));

    await apiRequest('/usuarios', { token: 'jwt' }).catch(() => undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it('sends the bearer token and parses JSON', async () => {
    mockFetch(200, JSON.stringify({ data: { id: 'c-1' } }));

    const result = await apiRequest<{ data: { id: string } }>('/clientes/c-1', { token: 'jwt' });

    expect(result.data.id).toBe('c-1');
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toMatch(/\/clientes\/c-1$/);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer jwt');
  });

  it('raises ApiError with the backend message and code', async () => {
    mockFetch(403, JSON.stringify({ error: { message: 'Sin permisos', code: 'FORBIDDEN' } }));

    const error = await apiRequest('/usuarios', { token: 'jwt' }).catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Sin permisos', status: 403, code: 'FORBIDDEN' });
  });

  it('shows the first validation detail so the user knows what to fix', async () => {
    mockFetch(400, JSON.stringify({
      error: {
        message: 'La solicitud contiene datos invalidos',
        code: 'VALIDATION_ERROR',
        details: [{ path: 'rangoHasta', message: 'rangoDesde debe ser menor o igual a rangoHasta' }],
      },
    }));

    await expect(apiRequest('/configuracion/resolucion', { token: 'jwt' })).rejects.toMatchObject({
      message: 'La solicitud contiene datos invalidos: rangoDesde debe ser menor o igual a rangoHasta',
      status: 400,
    });
  });

  it('falls back to a generic message on empty error bodies', async () => {
    mockFetch(500, '');

    await expect(apiRequest('/ordenes', { token: 'jwt' })).rejects.toMatchObject({
      message: 'No fue posible completar la solicitud',
      status: 500,
    });
  });
});
