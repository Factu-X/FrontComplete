import React, { useState, useMemo } from 'react';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Modal from '../molecules/Modal';
import OrderDetail from './OrderDetail';
import { Order, Motorcycle, OrderStatus } from '../../types';

const STATUS_BADGE: Record<OrderStatus, 'active' | 'warning' | 'service' | 'inactive'> = {
  open: 'active',
  in_process: 'warning',
  finished: 'service',
  cancelled: 'inactive',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  open: 'Abierta',
  in_process: 'En proceso',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
};

interface Props {
  motorcycle: Motorcycle;
  customerName: string;
  orders: Order[];
  open: boolean;
  onClose: () => void;
}

export default function MotorcycleHistory({ motorcycle, customerName, orders, open, onClose }: Props) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const motoOrders = useMemo(() => {
    return orders
      .filter(o => o.motorcycleId === motorcycle.id)
      .filter(o => {
        const d = new Date(o.createdAt);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, motorcycle.id, dateFrom, dateTo]);

  const lastOrder = motoOrders.find(o => o.status !== 'cancelled');
  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <Modal
        title={`Historial — ${motorcycle.plate}`}
        open={open}
        onClose={onClose}
        width="max-w-3xl"
      >
        <div className="flex flex-col gap-5">
          {/* Moto info */}
          <div className="flex items-center gap-4 bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#f97316]">{motorcycle.plate}</span>
                <span className="text-[#6e7681]">·</span>
                <span className="text-sm text-[#e6edf3]">{motorcycle.brand} {motorcycle.model} {motorcycle.year}</span>
              </div>
              <div className="text-xs text-[#6e7681] mt-0.5">Cliente: {customerName}</div>
            </div>
            {lastOrder && (
              <div className="text-right">
                <div className="text-xs text-[#6e7681]">Último servicio</div>
                <div className="font-mono text-xs text-[#e6edf3]">{new Date(lastOrder.createdAt).toLocaleDateString('es-CO')}</div>
                <div className="font-mono text-xs text-[#8b949e]">{lastOrder.kilometrage.toLocaleString('es-CO')} km</div>
              </div>
            )}
          </div>

          {/* Date filter */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6e7681] shrink-0">Filtrar por fecha:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#e6edf3] focus:outline-none focus:border-[#f97316]"
            />
            <span className="text-xs text-[#6e7681]">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#e6edf3] focus:outline-none focus:border-[#f97316]"
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-[#6e7681] hover:text-[#ef4444] transition-colors">✕ Limpiar</button>
            )}
          </div>

          {/* Orders list */}
          {motoOrders.length === 0 ? (
            <div className="py-10 text-center text-[#6e7681] text-sm">
              {orders.filter(o => o.motorcycleId === motorcycle.id).length === 0
                ? 'Esta motocicleta no tiene órdenes de servicio registradas.'
                : 'Ninguna orden en el rango de fechas seleccionado.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-[#6e7681]">{motoOrders.length} orden{motoOrders.length !== 1 ? 'es' : ''} encontrada{motoOrders.length !== 1 ? 's' : ''}</div>
              {motoOrders.map((order, idx) => (
                <div
                  key={order.id}
                  className={`border rounded-[6px] overflow-hidden transition-colors ${order.status === 'cancelled' ? 'border-[#30363d] opacity-70' : 'border-[#30363d] hover:border-[#f97316]/30'}`}
                >
                  <div className="flex items-center gap-4 px-4 py-3 bg-[#161b22]">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-3 h-3 rounded-full border-2 ${order.status === 'cancelled' ? 'border-[#6e7681] bg-transparent' : 'border-[#f97316] bg-[#f97316]/30'}`} />
                      {idx < motoOrders.length - 1 && <div className="w-px h-8 bg-[#30363d] mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-[#f97316] font-semibold">{order.orderNumber}</span>
                        <Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                      </div>
                      <div className="text-xs text-[#6e7681]">
                        {new Date(order.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                        <span className="mx-1.5">·</span>
                        <span className="font-mono">{order.kilometrage.toLocaleString('es-CO')} km</span>
                      </div>
                      <div className="text-xs text-[#8b949e] mt-1 truncate">{order.problem}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-bold text-[#e6edf3]">{fmt(order.total)}</div>
                      <div className="text-xs text-[#6e7681]">{order.items.length} ítem{order.items.length !== 1 ? 's' : ''}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>Ver detalle</Button>
                  </div>

                  {/* Quick services/parts summary */}
                  {order.items.length > 0 && (
                    <div className="px-4 py-2 bg-[#0d1117]/50 border-t border-[#30363d]/60 flex flex-wrap gap-1.5">
                      {order.items.map(item => (
                        <span key={item.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">
                          <span className={item.type === 'service' ? 'text-blue-400' : 'text-violet-400'}>●</span>
                          {item.name}
                          {item.quantity > 1 && <span className="font-mono text-[#6e7681]">×{item.quantity}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Order detail nested modal */}
      {selectedOrder && (
        <Modal
          title={`Detalle — ${selectedOrder.orderNumber}`}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          width="max-w-2xl"
        >
          <OrderDetail order={selectedOrder} compact />
        </Modal>
      )}
    </>
  );
}
