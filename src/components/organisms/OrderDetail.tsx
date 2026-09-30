import React from 'react';
import Badge from '../atoms/Badge';
import { Order, OrderStatus } from '../../types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  open: 'Abierta',
  in_process: 'En proceso',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
};

const STATUS_BADGE: Record<OrderStatus, 'active' | 'warning' | 'service' | 'inactive'> = {
  open: 'active',
  in_process: 'warning',
  finished: 'service',
  cancelled: 'inactive',
};

interface Props { order: Order; compact?: boolean; }

export default function OrderDetail({ order, compact = false }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-col gap-5">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {!compact && (
          <>
            <div><span className="text-[#6e7681]">Cliente:</span> <span className="ml-1 font-medium text-[#e6edf3]">{order.customerName}</span></div>
            <div><span className="text-[#6e7681]">Identificación:</span> <span className="ml-1 font-mono text-xs">{order.customerIdNumber}</span></div>
            <div><span className="text-[#6e7681]">Motocicleta:</span> <span className="ml-1 font-mono text-xs text-[#f97316]">{order.motorcyclePlate}</span> <span className="text-[#8b949e]">{order.motorcycleBrand} {order.motorcycleModel} {order.motorcycleYear}</span></div>
          </>
        )}
        <div><span className="text-[#6e7681]">Fecha:</span> <span className="ml-1 font-mono text-xs">{new Date(order.createdAt).toLocaleString('es-CO')}</span></div>
        <div><span className="text-[#6e7681]">Kilometraje:</span> <span className="ml-1 font-mono text-xs">{order.kilometrage.toLocaleString('es-CO')} km</span></div>
        <div><span className="text-[#6e7681]">Estado:</span> <span className="ml-2"><Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge></span></div>
      </div>

      <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
        <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Motivo de ingreso</div>
        <p className="text-sm text-[#e6edf3]">{order.problem}</p>
      </div>

      {order.observations && (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
          <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Observaciones</div>
          <p className="text-sm text-[#8b949e]">{order.observations}</p>
        </div>
      )}

      {/* Items */}
      <div>
        <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
          Servicios y repuestos ({order.items.length})
        </div>
        <div className="border border-[#30363d] rounded-[6px] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1c2128] border-b border-[#30363d]">
                <th className="px-3 py-2 text-left text-[#6e7681]">Elemento</th>
                <th className="px-3 py-2 text-center text-[#6e7681]">Cant.</th>
                <th className="px-3 py-2 text-right text-[#6e7681]">P. Unit.</th>
                <th className="px-3 py-2 text-right text-[#6e7681]">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]/60">
              {order.items.map(item => (
                <tr key={item.id} className="hover:bg-[#1c2128]/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === 'service' ? 'service' : 'part'}>
                        {item.type === 'service' ? 'SRV' : 'REP'}
                      </Badge>
                      <div>
                        <div className="font-medium text-[#e6edf3]">{item.name}</div>
                        <div className="font-mono text-[#6e7681]">{item.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-[#8b949e]">{item.quantity}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#8b949e]">{fmt(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-[#e6edf3]">{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#8b949e]">Subtotal servicios</span>
          <span className="font-mono text-blue-400">{fmt(order.subtotalServices)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8b949e]">Subtotal repuestos</span>
          <span className="font-mono text-violet-400">{fmt(order.subtotalParts)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8b949e]">IVA 19% (repuestos)</span>
          <span className="font-mono text-yellow-400">{fmt(order.tax)}</span>
        </div>
        <div className="border-t border-[#30363d] pt-2 flex justify-between font-bold text-base">
          <span className="text-[#e6edf3]">Total general</span>
          <span className="font-mono text-[#f97316] text-lg">{fmt(order.total)}</span>
        </div>
        {order.status === 'finished' && (
          <div className="pt-1 text-xs text-[#6e7681] flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span>
            Precios congelados al momento de finalización — válidos para facturación
          </div>
        )}
      </div>
    </div>
  );
}
