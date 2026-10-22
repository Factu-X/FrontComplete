import { describe, expect, it } from 'vitest';

import { canSendToDian, groupTaxes, matchesInvoiceSearch, ordersPendingInvoice } from './invoices';

describe('canSendToDian', () => {
  it.each([
    ['PENDIENTE_ENVIO', true],
    ['RECHAZADA', true],
    ['ENVIADA', false],
    ['VALIDADA', false],
  ] as const)('%s -> %s', (estado, expected) => {
    expect(canSendToDian(estado)).toBe(expected);
  });
});
import type { BackendFactura, BackendOrden } from './types';

const orden = (id: string, estado: BackendOrden['estado']) => ({ id, estado }) as BackendOrden;

describe('ordersPendingInvoice', () => {
  it('lists finished orders that have no invoice yet', () => {
    const ordenes = [orden('a', 'FINALIZADA'), orden('b', 'FINALIZADA'), orden('c', 'EN_PROCESO')];
    expect(ordersPendingInvoice(ordenes, [{ ordenId: 'a' }]).map(o => o.id)).toEqual(['b']);
  });
});

describe('groupTaxes', () => {
  it('groups base and VAT by rate and treatment', () => {
    const groups = groupTaxes([
      { subtotal: '35000.00', impuesto: '6650.00', tarifaIva: '19.00', tratamientoIva: 'GRAVADO' },
      { subtotal: '42000.00', impuesto: '7980.00', tarifaIva: '19.00', tratamientoIva: 'GRAVADO' },
      { subtotal: '10000.00', impuesto: '500.00', tarifaIva: '5.00', tratamientoIva: 'GRAVADO' },
      { subtotal: '8000.00', impuesto: '0.00', tarifaIva: '0.00', tratamientoIva: 'EXCLUIDO' },
    ]);

    expect(groups).toEqual([
      { label: 'IVA 19%', base: 77000, impuesto: 14630 },
      { label: 'IVA 5%', base: 10000, impuesto: 500 },
      { label: 'Excluido', base: 8000, impuesto: 0 },
    ]);
  });
});

describe('matchesInvoiceSearch', () => {
  const factura = {
    numero: 'SETP990000001',
    cliente: { nombreRazonSocial: 'Carlos Perez', numeroIdentificacion: '1020304050' },
    orden: { numero: 'OS-1', motocicleta: { placa: 'ABC12D' } },
  } as BackendFactura;

  it.each(['setp99', 'carlos', '1020304', 'abc12d', ''])('matches "%s"', query => {
    expect(matchesInvoiceSearch(factura, query)).toBe(true);
  });

  it('rejects unrelated text', () => {
    expect(matchesInvoiceSearch(factura, 'yamaha')).toBe(false);
  });
});
