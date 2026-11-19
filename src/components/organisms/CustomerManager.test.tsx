// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));

import CustomerManager from './CustomerManager';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const nuevo = { id: 'c2', tipoIdentificacion: 'CC', numeroIdentificacion: '123', nombreRazonSocial: 'Luis Perez', telefono: '300', email: null, activo: true, motocicletas: [] };
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  api.apiRequest.mockReset();
  api.apiRequest.mockImplementation((_p: string, _s: unknown, init?: { method?: string }) =>
    Promise.resolve({ data: init?.method === 'POST' ? nuevo : [] }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const boton = (texto: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.includes(texto))!;
const escribir = (i: number, valor: string) => {
  const el = host.querySelectorAll<HTMLInputElement>('input:not([placeholder^=Buscar])')[i]!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('CustomerManager', () => {
  it('muestra el mensaje de lista vacia y el formulario sin guardar nada al validar', async () => {
    await act(async () => { root.render(<CustomerManager session={{ token: 't' }} addToast={vi.fn()} />); });
  await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(host.textContent).toContain('Aún no hay clientes');
    await act(async () => boton('Nuevo cliente').click());
    expect(host.textContent).toContain('Tipo de documento');
    await act(async () => boton('Guardar y agregar moto').click());
    expect(host.textContent).toContain('El nombre es obligatorio');
    expect(api.apiRequest.mock.calls.some(c => c[2]?.method === 'POST')).toBe(false);
  });

  it('guarda el cliente y abre de inmediato el registro de su moto', async () => {
    await act(async () => { root.render(<CustomerManager session={{ token: 't' }} addToast={vi.fn()} />); });
  await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    await act(async () => boton('Nuevo cliente').click());
    const campos = [...host.querySelectorAll('input')].filter(i => !i.placeholder.startsWith('Buscar'));
    expect(campos.length).toBeGreaterThanOrEqual(3);
    for (const [i, v] of ['123', 'Luis Perez', '300'].entries()) await act(async () => escribir(i, v));
    await act(async () => boton('Guardar y agregar moto').click());
    expect(api.apiRequest.mock.calls.some(c => c[0] === '/clientes' && c[2]?.method === 'POST')).toBe(true);
    expect(host.textContent).toContain('Registrar motocicleta — Luis Perez');
  });
});
