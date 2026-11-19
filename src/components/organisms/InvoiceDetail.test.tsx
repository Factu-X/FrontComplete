// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));
vi.mock('./InvoiceAccount', () => ({ default: () => <div>estado-cuenta</div> }));

import InvoiceDetail from './InvoiceDetail';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const factura = {
  id: 'f1', numero: 'FE-1', fechaEmision: '2026-11-01T10:00:00Z', fechaVencimiento: null, formaPago: 'CONTADO', estadoDian: 'PENDIENTE_ENVIO', cufe: null,
  subtotal: '100', impuestos: '19', total: '119', orden: { numero: 'OS-1', kilometrajeIngreso: 10, motocicleta: { placa: 'ABC12D', marca: 'Honda', modelo: 'CB' } }, cliente: { nombreRazonSocial: 'Ana', numeroIdentificacion: '1', tipoIdentificacion: 'CC' },
  detallesFacturas: [{ id: 'd1', descripcion: 'Bujia', codigoItem: 'TER', cantidad: '1', precioUnitario: '100', subtotal: '100', impuesto: '19', total: '119', tarifaIva: '19',
    detalleOrden: { tratamientoIva: 'GRAVADO', proveedorTercero: 'Taller Pepe' }, proveedorTercero: 'Taller Pepe' }],
};
let host: HTMLDivElement;
let root: Root;
beforeEach(() => { api.apiRequest.mockReset(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe('InvoiceDetail', () => {
  it('muestra el estado de cuenta arriba y el tercero de cada linea', async () => {
    api.apiRequest.mockImplementation((p: string) => Promise.resolve({ data: p.endsWith('/envios') ? [] : factura }));
    await act(async () => root.render(<InvoiceDetail facturaId="f1" session={{ token: 't' }} addToast={vi.fn()} />));
    expect(host.textContent).toContain('estado-cuenta');
    expect(host.textContent).toContain('Tercero · Taller Pepe');
    expect(host.textContent).toContain('Se genera al enviar la factura a la DIAN');
  });

  it('avisa si no se puede cargar', async () => {
    const addToast = vi.fn();
    api.apiRequest.mockRejectedValue(new Error('caido'));
    await act(async () => root.render(<InvoiceDetail facturaId="f1" session={{ token: 't' }} addToast={addToast} />));
    expect(addToast).toHaveBeenCalledWith({ message: 'caido', type: 'error' });
  });
});
