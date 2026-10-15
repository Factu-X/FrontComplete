import { describe, expect, it } from 'vitest';

import { isOrderEditable, matchesOrderSearch, nextStates, subtotalsByType } from './orders';
import type { BackendDetalleOrden, BackendOrden } from './types';

const detalle = (tipoItem: BackendDetalleOrden['tipoItem'], subtotal: string): BackendDetalleOrden => ({
  id: subtotal,
  ordenId: 'o-1',
  itemCatalogoId: 'i-1',
  codigoItem: 'X',
  nombreItem: 'Item',
  tipoItem,
  cantidad: '1.00',
  precioUnitario: subtotal,
  tratamientoIva: 'GRAVADO',
  tarifaIva: '19.00',
  subtotal,
  impuesto: '0.00',
  total: subtotal,
});

const orden = {
  numero: 'OS-2026-ABC',
  cliente: { nombreRazonSocial: 'Carlos Perez' },
  motocicleta: { placa: 'ABC12D' },
} as BackendOrden;

describe('order helpers', () => {
  it('offers the next workflow states', () => {
    expect(nextStates('ABIERTA', true)).toEqual(['EN_PROCESO', 'CANCELADA']);
    expect(nextStates('EN_PROCESO', true)).toEqual(['ABIERTA', 'FINALIZADA', 'CANCELADA']);
  });

  it('hides cancel for roles that cannot cancel', () => {
    expect(nextStates('EN_PROCESO', false)).toEqual(['ABIERTA', 'FINALIZADA']);
  });

  it('treats finalized and cancelled orders as read only', () => {
    expect(isOrderEditable('FINALIZADA')).toBe(false);
    expect(isOrderEditable('CANCELADA')).toBe(false);
    expect(isOrderEditable('ABIERTA')).toBe(true);
    expect(nextStates('FINALIZADA', true)).toEqual([]);
  });

  it('splits subtotals between services and parts', () => {
    expect(
      subtotalsByType([
        detalle('SERVICIO', '50000.00'),
        detalle('REPUESTO', '10000.00'),
        detalle('REPUESTO', '2500.50'),
      ]),
    ).toEqual({ services: 50000, parts: 12500.5 });
  });

  it('searches by number, customer or plate', () => {
    expect(matchesOrderSearch(orden, '')).toBe(true);
    expect(matchesOrderSearch(orden, 'os-2026')).toBe(true);
    expect(matchesOrderSearch(orden, 'carlos')).toBe(true);
    expect(matchesOrderSearch(orden, 'abc12d')).toBe(true);
    expect(matchesOrderSearch(orden, 'zzz')).toBe(false);
  });
});
