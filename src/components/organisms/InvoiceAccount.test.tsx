// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));

import InvoiceAccount from './InvoiceAccount';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cuenta = { pagos: [], notasCredito: [], total: '100000', acreditado: '0', pagado: '0', saldo: '100000', estadoPago: 'PENDIENTE', diasVencida: 3, antiguedad: 'DIAS_1_30', vencimiento: '2026-11-30' };
let host: HTMLDivElement;
let root: Root;
const addToast = vi.fn();
const onChanged = vi.fn();
beforeEach(() => {
  api.apiRequest.mockReset(); addToast.mockReset(); onChanged.mockReset();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const boton = (texto: string) => [...host.querySelectorAll('button')].find(b => b.textContent === texto)!;
const montar = () => act(async () => root.render(<InvoiceAccount facturaId="f1" session={{ token: 't' }} addToast={addToast} onChanged={onChanged} />));

describe('InvoiceAccount', () => {
  it('registra un pago eligiendo como le pagaron', async () => {
    api.apiRequest.mockImplementation((_p: string, _s: unknown, init?: { method?: string }) =>
      Promise.resolve({ data: init?.method === 'POST' ? { ...cuenta, pagado: '100000', saldo: '0', estadoPago: 'PAGADA' } : cuenta }));
    await montar();
    expect(host.textContent).toContain('Estado de cuenta');
    await act(async () => boton('Registrar pago').click());
    expect(host.textContent).toContain('¿Cómo le pagaron?');
    const metodos = [...host.querySelectorAll('button[aria-pressed]')] as HTMLButtonElement[];
    expect(metodos.length).toBeGreaterThan(1);
    await act(async () => metodos[1]!.click());
    expect(metodos[1]!.getAttribute('aria-pressed')).toBe('true');
    await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const post = api.apiRequest.mock.calls.find(c => c[2]?.method === 'POST')!;
    expect(post[0]).toBe('/facturas/f1/pagos');
    expect(JSON.parse(post[2].body).monto).toBe(100000);
    expect(onChanged).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('avisa si no se puede cargar el estado de cuenta', async () => {
    api.apiRequest.mockRejectedValue(new Error('sin conexion'));
    await montar();
    expect(addToast).toHaveBeenCalledWith({ message: 'sin conexion', type: 'error' });
  });
});
