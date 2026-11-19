// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));

import OrderDetail from './OrderDetail';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const orden = (estado: string) => ({
  id: 'o1', numero: 'OS-1', clienteId: 'c', motocicletaId: 'm', fechaIngreso: '2026-11-01T10:00:00Z', kilometrajeIngreso: 1000,
  motivoIngreso: 'Ruido', observaciones: null, estado, subtotal: '0', impuestos: '0', total: '0', finalizadaAt: null,
});
const detalle = {
  id: 'd1', ordenId: 'o1', itemCatalogoId: null, proveedorTercero: 'Taller Pepe', codigoItem: 'TER', nombreItem: 'Bujia NGK',
  tipoItem: 'REPUESTO', cantidad: '2', precioUnitario: '15000', tratamientoIva: 'GRAVADO', tarifaIva: '19', subtotal: '30000', impuesto: '5700', total: '35700',
};

let host: HTMLDivElement;
let root: Root;
const addToast = vi.fn();

function servidor(estado: string, facturas: object[] = []) {
  api.apiRequest.mockImplementation((path: string) => {
    if (path === '/ordenes/o1') return Promise.resolve({ data: orden(estado) });
    if (path === '/ordenes/o1/detalles') return Promise.resolve({ data: [detalle] });
    if (path.startsWith('/facturas')) return Promise.resolve({ data: facturas });
    return Promise.resolve({ data: [] });
  });
}

const montar = (role: 'admin' | 'operator', extra: object = {}) =>
  act(async () => root.render(<OrderDetail orderId="o1" session={{ token: 't' }} addToast={addToast} userRole={role} {...extra} />));
const boton = (texto: string) => [...host.querySelectorAll('button')].find(b => b.textContent === texto)!;
const escribir = (id: string, valor: string) => {
  const el = host.querySelector<HTMLInputElement>(`#${id}`)!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(() => {
  api.apiRequest.mockReset();
  addToast.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Repuesto de tercero en la orden', () => {
  it('valida el formulario y envia el repuesto con su proveedor', async () => {
    servidor('EN_PROCESO');
    await montar('admin');
    expect(host.textContent).toContain('Tercero · Taller Pepe');

    await act(async () => boton('+ Repuesto de tercero').click());
    await act(async () => boton('Agregar repuesto').click());
    expect(host.textContent).toContain('Escriba qué repuesto es');
    expect(host.textContent).toContain('Escriba a quién se le compró');

    await act(async () => { escribir('tercero-desc', 'Bujia NGK'); escribir('tercero-prov', 'Taller Pepe'); escribir('tercero-precio', '15000'); escribir('tercero-cant', '2'); });
    await act(async () => boton('Agregar repuesto').click());
    const post = api.apiRequest.mock.calls.find(c => c[2]?.method === 'POST')!;
    expect(post[0]).toBe('/ordenes/o1/detalles');
    expect(JSON.parse(post[2].body)).toEqual({
      tercero: { descripcion: 'Bujia NGK', proveedor: 'Taller Pepe', precio: 15000, tratamientoIva: 'GRAVADO', tarifaIva: 19 },
      cantidad: 2,
    });
  });
});

describe('Facturar desde la orden finalizada', () => {
  it('ofrece facturar a quien puede y lleva la orden a facturas', async () => {
    servidor('FINALIZADA');
    const onInvoiceOrder = vi.fn();
    await montar('admin', { onInvoiceOrder });
    await act(async () => boton('Facturar esta orden').click());
    expect(onInvoiceOrder).toHaveBeenCalledWith('o1');
  });

  it('no ofrece facturar si ya tiene factura', async () => {
    servidor('FINALIZADA', [{ ordenId: 'o1' }]);
    await montar('admin', { onInvoiceOrder: vi.fn() });
    expect(host.textContent).not.toContain('Facturar esta orden');
  });

  it('al operario le indica avisar a quien factura', async () => {
    servidor('FINALIZADA');
    await montar('operator', { onInvoiceOrder: vi.fn() });
    expect(host.textContent).toContain('Lista para facturar: avise a quien factura');
    expect(host.textContent).not.toContain('Facturar esta orden');
  });
});
