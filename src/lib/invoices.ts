import type {
  Antiguedad,
  EstadoPago,
  LineaAcreditable,
  MetodoPago,
  TipoAjusteNota,
  BackendDetalleFactura,
  BackendDetalleOrden,
  BackendEnvioDian,
  BackendFactura,
  BackendOrden,
  EstadoDian,
  FormaPago,
} from './types';
import { toNumber } from './orders';

export const DIAN_LABELS: Record<EstadoDian, string> = {
  PENDIENTE_ENVIO: 'Pendiente envío',
  ENVIADA: 'Enviada',
  VALIDADA: 'Validada',
  RECHAZADA: 'Rechazada',
};

export const DIAN_BADGE: Record<EstadoDian, 'warning' | 'service' | 'active' | 'inactive'> = {
  PENDIENTE_ENVIO: 'warning',
  ENVIADA: 'service',
  VALIDADA: 'active',
  RECHAZADA: 'inactive',
};

export const ENVIO_LABELS: Record<BackendEnvioDian['estado'], string> = {
  PENDIENTE: 'Pendiente',
  ENVIADO: 'Enviado',
  VALIDADO: 'Validado',
  RECHAZADO: 'Rechazado',
  ERROR_CONEXION: 'Error de conexión',
};

// Se puede enviar una factura nueva o reintentar una rechazada; nunca una validada o en curso.
export const canSendToDian = (estado: EstadoDian) => estado === 'PENDIENTE_ENVIO' || estado === 'RECHAZADA';

export const FORMA_PAGO_LABELS: Record<FormaPago, string> = {
  CONTADO: 'Contado',
  CREDITO: 'Crédito',
};

// Órdenes finalizadas que todavía no tienen factura.
export const ordersPendingInvoice = (ordenes: BackendOrden[], facturas: Pick<BackendFactura, 'ordenId'>[]) => {
  const facturadas = new Set(facturas.map(f => f.ordenId));
  return ordenes.filter(o => o.estado === 'FINALIZADA' && !facturadas.has(o.id));
};

type TaxLine = Pick<BackendDetalleFactura, 'subtotal' | 'impuesto' | 'tarifaIva'> & {
  tratamientoIva?: BackendDetalleOrden['tratamientoIva'];
};

export type TaxGroup = { label: string; base: number; impuesto: number };

// Agrupa la base y el IVA por tarifa, como se presenta en la factura.
export const groupTaxes = (lines: TaxLine[]): TaxGroup[] => {
  const groups = new Map<string, TaxGroup>();

  for (const line of lines) {
    const label = line.tratamientoIva === 'EXCLUIDO'
      ? 'Excluido'
      : line.tratamientoIva === 'EXENTO'
        ? 'Exento'
        : `IVA ${toNumber(line.tarifaIva)}%`;
    const current = groups.get(label) ?? { label, base: 0, impuesto: 0 };
    current.base += toNumber(line.subtotal);
    current.impuesto += toNumber(line.impuesto);
    groups.set(label, current);
  }

  return [...groups.values()].sort((a, b) => b.impuesto - a.impuesto);
};

export const matchesInvoiceSearch = (factura: BackendFactura, query: string) => {
  const q = query.trim().toLowerCase();
  return !q
    || factura.numero.toLowerCase().includes(q)
    || factura.cliente.nombreRazonSocial.toLowerCase().includes(q)
    || factura.cliente.numeroIdentificacion.includes(q)
    || factura.orden.numero.toLowerCase().includes(q)
    || factura.orden.motocicleta.placa.toLowerCase().includes(q);
};

export const AJUSTE_LABELS: Record<TipoAjusteNota, string> = {
  TOTAL: 'Total (anula la factura)',
  PARCIAL: 'Parcial',
};

export const PAGO_LABELS: Record<EstadoPago, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Abono parcial',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

export const PAGO_BADGE: Record<EstadoPago, 'warning' | 'service' | 'active' | 'inactive'> = {
  PENDIENTE: 'warning',
  PARCIAL: 'service',
  PAGADA: 'active',
  ANULADA: 'inactive',
};

export const METODO_LABELS: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  OTRO: 'Otro',
};

export const ANTIGUEDAD_LABELS: Record<Antiguedad, string> = {
  AL_DIA: 'Al día',
  D1_30: '1–30 días',
  D31_60: '31–60 días',
  D61_90: '61–90 días',
  MAS_90: 'Más de 90 días',
};

// Estimado en el navegador para la vista previa; el valor oficial lo calcula el backend.
export const estimateCreditLine = (linea: Pick<LineaAcreditable, 'precioUnitario' | 'tarifaIva' | 'tratamientoIva'>, cantidad: number) => {
  const subtotal = Math.round(cantidad * toNumber(linea.precioUnitario) * 100) / 100;
  const impuesto = linea.tratamientoIva === 'GRAVADO' ? Math.round(subtotal * toNumber(linea.tarifaIva)) / 100 : 0;
  return { subtotal, impuesto, total: subtotal + impuesto };
};

// Convierte filas en CSV con separador ";" (Excel en español lo abre en columnas).
export const toCsv = (headers: string[], rows: (string | number)[][]) =>
  [headers, ...rows]
    .map(row => row.map(cell => {
      const text = String(cell);
      return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(';'))
    .join('\n');
