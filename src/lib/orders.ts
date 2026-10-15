import type { BackendDetalleOrden, BackendOrden, EstadoOrden } from './types';

export const STATUS_LABELS: Record<EstadoOrden, string> = {
  ABIERTA: 'Abierta',
  EN_PROCESO: 'En proceso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const STATUS_BADGE: Record<EstadoOrden, 'active' | 'warning' | 'service' | 'inactive'> = {
  ABIERTA: 'active',
  EN_PROCESO: 'warning',
  FINALIZADA: 'service',
  CANCELADA: 'inactive',
};

// Espejo de TRANSICIONES en backend/src/modules/ordenes/ordenes.policy.ts.
const NEXT_STATES: Record<EstadoOrden, EstadoOrden[]> = {
  ABIERTA: ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO: ['ABIERTA', 'FINALIZADA', 'CANCELADA'],
  FINALIZADA: [],
  CANCELADA: [],
};

export const nextStates = (estado: EstadoOrden, canCancel: boolean) =>
  NEXT_STATES[estado].filter(next => canCancel || next !== 'CANCELADA');

export const isOrderEditable = (estado: EstadoOrden) => NEXT_STATES[estado].length > 0;

export const toNumber = (value: string | number) => Number(value);

export const formatCOP = (value: string | number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
    .format(toNumber(value));

export const subtotalsByType = (detalles: BackendDetalleOrden[]) =>
  detalles.reduce(
    (acc, detalle) => {
      const key = detalle.tipoItem === 'SERVICIO' ? 'services' : 'parts';
      return { ...acc, [key]: acc[key] + toNumber(detalle.subtotal) };
    },
    { services: 0, parts: 0 },
  );

export const matchesOrderSearch = (orden: BackendOrden, query: string) => {
  const q = query.trim().toLowerCase();
  return !q
    || orden.numero.toLowerCase().includes(q)
    || (orden.cliente?.nombreRazonSocial.toLowerCase().includes(q) ?? false)
    || (orden.motocicleta?.placa.toLowerCase().includes(q) ?? false);
};
