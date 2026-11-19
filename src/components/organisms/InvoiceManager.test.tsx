// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));
vi.mock('./InvoiceForm', () => ({ default: (p: { initialOrderId?: string }) => <div>form-orden:{p.initialOrderId}</div> }));
vi.mock('./InvoiceDetail', () => ({ default: () => <div>detalle</div> }));

import InvoiceManager from './InvoiceManager';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const addToast = vi.fn();
const servidor = (puedeEmitir: boolean) => api.apiRequest.mockImplementation((path: string) => Promise.resolve({
  data: path === '/configuracion' ? { estado: { puedeEmitir, faltantesEmision: ['NIT'] } } : path.startsWith('/ordenes') ? [{ id: 'o9', estado: 'FINALIZADA' }] : [],
}));
beforeEach(() => { api.apiRequest.mockReset(); addToast.mockReset(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const montar = (extra: object) => act(async () => root.render(<InvoiceManager session={{ token: 't' }} addToast={addToast} {...extra} />));

describe('InvoiceManager', () => {
  it('abre el formulario con la orden elegida y avisa que ya atendio la peticion', async () => {
    servidor(true);
    const onOpenHandled = vi.fn();
    await montar({ openOrderId: 'o9', onOpenHandled });
    expect(host.textContent).toContain('form-orden:o9');
    expect(onOpenHandled).toHaveBeenCalled();
  });

  it('no abre el formulario si falta configuracion, pero igual avisa', async () => {
    servidor(false);
    const onOpenHandled = vi.fn();
    await montar({ openOrderId: 'o9', onOpenHandled });
    expect(host.textContent).not.toContain('form-orden');
    expect(onOpenHandled).toHaveBeenCalled();
  });

  it('muestra el mensaje de lista vacia y avisa si falla la carga', async () => {
    servidor(true);
    await montar({});
    expect(host.textContent).toContain('Aún no hay facturas');
    api.apiRequest.mockRejectedValue(new Error('caido'));
    await act(async () => { root.unmount(); root = createRoot(host); });
    await montar({});
    expect(addToast).toHaveBeenCalledWith({ message: 'caido', type: 'error' });
  });
});
