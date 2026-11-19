// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn(), getPagosRecibidos: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest, getPagosRecibidos: api.getPagosRecibidos, saveBlob: vi.fn() }));

import PaymentsManager from './PaymentsManager';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const respuesta = {
  desde: '2026-11-01', hasta: '2026-11-30',
  pagos: [{
    id: 'p1', fechaPago: '2026-11-10T12:00:00.000Z', monto: '50000.00', metodoPago: 'TRANSFERENCIA', referencia: 'T-77', observaciones: null,
    factura: { id: 'f1', numero: 'FE-1' }, cliente: { id: 'c1', nombre: 'Ana Gomez' },
  }],
  totales: { total: '50000.00', porMetodo: { EFECTIVO: '0.00', TRANSFERENCIA: '50000.00', TARJETA: '0.00', OTRO: '0.00' } },
};

let host: HTMLDivElement;
let root: Root;
const props = { session: { token: 't' }, addToast: vi.fn() };

beforeEach(() => {
  api.getPagosRecibidos.mockReset();
  api.apiRequest.mockReset();
  props.addToast.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const boton = (texto: string) => [...host.querySelectorAll('button')].find(b => b.textContent === texto)!;

describe('Pagos recibidos', () => {
  it('lista los pagos con sus totales y filtra por metodo y rango', async () => {
    api.getPagosRecibidos.mockResolvedValue(respuesta);
    await act(async () => root.render(<PaymentsManager {...props} />));
    expect(host.textContent).toContain('Ana Gomez');
    expect(host.textContent).toContain('FE-1');
    expect(host.textContent).toContain('T-77');
    expect(host.textContent).toContain('Transferencia');

    const select = host.querySelector<HTMLSelectElement>('#pagos-metodo')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, 'EFECTIVO');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(api.getPagosRecibidos.mock.calls.at(-1)![1]).toMatchObject({ metodo: 'EFECTIVO' });

    await act(async () => boton('Hoy').click());
    const filtros = api.getPagosRecibidos.mock.calls.at(-1)![1];
    expect(filtros.desde).toBe(filtros.hasta);
  });

  it('muestra un mensaje claro cuando no hay pagos y avisa si falla', async () => {
    api.getPagosRecibidos.mockResolvedValueOnce({ ...respuesta, pagos: [] });
    await act(async () => root.render(<PaymentsManager {...props} />));
    expect(host.textContent).toContain('No hay pagos en estas fechas');

    api.getPagosRecibidos.mockRejectedValueOnce(new Error('sin conexion'));
    await act(async () => boton('Este año').click());
    expect(props.addToast).toHaveBeenCalledWith({ message: 'sin conexion', type: 'error' });
  });

  it('abre la factura al pulsar su numero', async () => {
    api.getPagosRecibidos.mockResolvedValue(respuesta);
    api.apiRequest.mockImplementation(() => new Promise(() => undefined));
    await act(async () => root.render(<PaymentsManager {...props} />));
    await act(async () => boton('FE-1').click());
    expect(api.apiRequest.mock.calls[0]![0]).toBe('/facturas/f1');
  });
});
