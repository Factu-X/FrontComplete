// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest, saveBlob: vi.fn() }));

import AccountsReceivable from './AccountsReceivable';
import BillingDashboard from './BillingDashboard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom no trae ResizeObserver; la grafica solo lo usa para medir el ancho.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const antiguedad = { AL_DIA: '0.00', D1_30: '0.00', D31_60: '0.00', D61_90: '0.00', MAS_90: '0.00' };
const cartera = { resumen: { porCobrar: '0.00', vencido: '0.00', facturasConSaldo: 0, facturasVencidas: 0, porAntiguedad: antiguedad }, facturas: [] };
const reporte = {
  rango: { desde: '2026-11-01', hasta: '2026-11-16' },
  totales: { facturas: 2, facturado: '100.00', subtotal: '84.03', iva: '15.97', notasCredito: '0.00', neto: '100.00', recaudado: '0.00', ordenesFinalizadas: 3, ticketPromedio: '50.00' },
  porEstadoDian: {}, porFormaPago: {}, recaudoPorMetodo: {}, serie: [], topItems: [], topClientes: [],
  cartera: cartera.resumen,
};

let host: HTMLDivElement;
let root: Root;
const props = { session: { token: 't' }, addToast: vi.fn() };

beforeEach(() => {
  api.apiRequest.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const escribir = (input: HTMLInputElement, valor: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const ultimaRuta = () => String(api.apiRequest.mock.calls.at(-1)?.[0]);
const boton = (texto: string) => [...host.querySelectorAll('button')].find(b => b.textContent === texto)!;

describe('Cartera: filtro por fecha de emision (HU-10)', () => {
  it('envia el rango al backend y lo quita con Limpiar', async () => {
    api.apiRequest.mockResolvedValue({ data: cartera });
    await act(async () => root.render(<AccountsReceivable {...props} />));
    expect(ultimaRuta()).toBe('/cartera?filtro=CON_SALDO');

    await act(async () => escribir(host.querySelector<HTMLInputElement>('[aria-label="Emitidas desde"]')!, '2026-11-01'));
    await act(async () => escribir(host.querySelector<HTMLInputElement>('[aria-label="Emitidas hasta"]')!, '2026-11-30'));
    expect(ultimaRuta()).toBe('/cartera?filtro=CON_SALDO&desde=2026-11-01&hasta=2026-11-30');

    await act(async () => boton('Limpiar').click());
    expect(ultimaRuta()).toBe('/cartera?filtro=CON_SALDO');
  });
});

describe('Resumen de facturacion: Hoy y ordenes finalizadas (HU-09)', () => {
  it('muestra las ordenes finalizadas y consulta solo el dia con Hoy', async () => {
    api.apiRequest.mockResolvedValue({ data: reporte });
    await act(async () => root.render(<BillingDashboard {...props} />));
    expect(host.textContent).toContain('3 órdenes finalizadas');

    await act(async () => boton('Hoy').click());
    const [, query] = ultimaRuta().split('?');
    const params = new URLSearchParams(query);
    expect(params.get('desde')).toBe(params.get('hasta'));

    await act(async () => escribir(host.querySelector<HTMLInputElement>('[aria-label="desde"]')!, '2026-10-01'));
    expect(new URLSearchParams(ultimaRuta().split('?')[1]).get('desde')).toBe('2026-10-01');
  });
});
