import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest } from './api';

const mockFetch = (status: number, body: string) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  }));

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('falls back to a generic message on empty error bodies', async () => {
    mockFetch(500, '');

    await expect(apiRequest('/ordenes', { token: 'jwt' })).rejects.toMatchObject({
      message: 'No fue posible completar la solicitud',
      status: 500,
    });
  });
});
