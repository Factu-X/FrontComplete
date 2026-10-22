import React, { useEffect, useState } from 'react';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import MotorcycleHistory from './MotorcycleHistory';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import {
  formatCOP, isOrderEditable, nextStates, STATUS_BADGE, STATUS_LABELS, subtotalsByType, toNumber,
} from '../../lib/orders';
import { canCancelOrders } from '../../lib/roles';
import type {
  BackendCatalogItem, BackendDetalleOrden, BackendOrden, EstadoOrden, UserRole,
} from '../../lib/types';

const ACTION_LABELS: Record<EstadoOrden, string> = {
  ABIERTA: 'Reabrir',
  EN_PROCESO: 'Iniciar trabajo',
  FINALIZADA: 'Finalizar orden',
  CANCELADA: 'Cancelar orden',
};

interface Props {
  orderId: string;
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  userRole: UserRole;
  readOnly?: boolean;
  compact?: boolean;
  onChanged?: () => void;
}

export default function OrderDetail({ orderId, session, addToast, userRole, readOnly = false, compact = false, onChanged }: Props) {
  const [order, setOrder] = useState<BackendOrden | null>(null);
  const [items, setItems] = useState<BackendDetalleOrden[]>([]);
  const [catalog, setCatalog] = useState<BackendCatalogItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const editable = !readOnly && !!order && isOrderEditable(order.estado);

  async function load() {
    try {
      const [orden, detalles] = await Promise.all([
        apiRequest<ApiEntityResponse<BackendOrden>>(`/ordenes/${orderId}`, session),
        apiRequest<ApiListResponse<BackendDetalleOrden>>(`/ordenes/${orderId}/detalles`, session),
      ]);
      setOrder(orden.data);
      setItems(detalles.data);
      setNotes(orden.data.observaciones ?? '');
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar la orden', type: 'error' });
    }
  }

  useEffect(() => {
    void load();
  }, [orderId, session.token]);

  useEffect(() => {
    if (!editable || catalog.length) return;
    apiRequest<ApiListResponse<BackendCatalogItem>>('/catalogo?activo=true', session)
      .then(response => setCatalog(response.data))
      .catch(() => addToast({ message: 'No se pudo cargar el catálogo', type: 'error' }));
  }, [editable]);

  // Toda mutación recarga la orden: los totales oficiales siempre vienen del backend (HU-03).
  async function mutate(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: object, success?: string) {
    setBusy(true);
    try {
      await apiRequest(path, session, { method, body: body ? JSON.stringify(body) : undefined });
      await load();
      onChanged?.();
      if (success) addToast({ message: success, type: 'success' });
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo actualizar la orden', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const addItem = (item: BackendCatalogItem) => {
    const existing = items.find(i => i.itemCatalogoId === item.id);
    setCatalogSearch('');
    if (existing) return changeQty(existing, toNumber(existing.cantidad) + 1);
    return mutate(`/ordenes/${orderId}/detalles`, 'POST', { itemCatalogoId: item.id, cantidad: 1 });
  };

  const changeQty = (item: BackendDetalleOrden, cantidad: number) =>
    cantidad >= 1 && mutate(`/ordenes/${orderId}/detalles/${item.id}`, 'PATCH', { cantidad });

  const removeItem = (item: BackendDetalleOrden) =>
    mutate(`/ordenes/${orderId}/detalles/${item.id}`, 'DELETE');

  const changeState = (estado: EstadoOrden) =>
    mutate(`/ordenes/${orderId}`, 'PATCH', { estado }, `Orden ${STATUS_LABELS[estado].toLowerCase()}`);

  const saveNotes = () =>
    mutate(`/ordenes/${orderId}`, 'PATCH', { observaciones: notes.trim() || null }, 'Observaciones guardadas');

  if (!order) {
    return <div className="py-10 text-center text-sm text-[#6e7681]">Cargando orden...</div>;
  }

  const subtotals = subtotalsByType(items);
  const filteredCatalog = catalog.filter(i => {
    const q = catalogSearch.toLowerCase();
    return !q || i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-5">
      {historyOpen && order.motocicleta && order.cliente && (
        <MotorcycleHistory
          motorcycle={{
            id: order.motocicletaId,
            plate: order.motocicleta.placa,
            brand: order.motocicleta.marca,
            model: order.motocicleta.modelo,
            year: order.motocicleta.anio,
          }}
          customerName={order.cliente.nombreRazonSocial}
          session={session}
          addToast={addToast}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {!compact && order.cliente && order.motocicleta && (
          <>
            <div><span className="text-[#6e7681]">Cliente:</span> <span className="ml-1 font-medium text-[#e6edf3]">{order.cliente.nombreRazonSocial}</span></div>
            <div><span className="text-[#6e7681]">Identificación:</span> <span className="ml-1 font-mono text-xs">{order.cliente.numeroIdentificacion}</span></div>
            <div><span className="text-[#6e7681]">Motocicleta:</span> <span className="ml-1 font-mono text-xs text-[#f97316]">{order.motocicleta.placa}</span> <span className="text-[#8b949e]">{order.motocicleta.marca} {order.motocicleta.modelo} {order.motocicleta.anio ?? ''}</span></div>
            <div>
              {/* HU-05: el operario abre el historial desde la orden que atiende */}
              <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>Historial de la moto</Button>
            </div>
          </>
        )}
        <div><span className="text-[#6e7681]">Fecha:</span> <span className="ml-1 font-mono text-xs">{new Date(order.fechaIngreso).toLocaleString('es-CO')}</span></div>
        <div><span className="text-[#6e7681]">Kilometraje:</span> <span className="ml-1 font-mono text-xs">{order.kilometrajeIngreso.toLocaleString('es-CO')} km</span></div>
        <div><span className="text-[#6e7681]">Estado:</span> <span className="ml-2"><Badge variant={STATUS_BADGE[order.estado]}>{STATUS_LABELS[order.estado]}</Badge></span></div>
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2">
          {nextStates(order.estado, canCancelOrders(userRole)).map(estado => (
            <Button
              key={estado}
              size="sm"
              variant={estado === 'CANCELADA' ? 'ghost' : 'primary'}
              disabled={busy}
              onClick={() => changeState(estado)}
            >
              {ACTION_LABELS[estado]}
            </Button>
          ))}
        </div>
      )}

      <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
        <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Motivo de ingreso</div>
        <p className="text-sm text-[#e6edf3]">{order.motivoIngreso}</p>
      </div>

      {editable && (
        <div className="border border-[#30363d] rounded-[6px] overflow-hidden">
          <div className="bg-[#1c2128] px-4 py-2.5 border-b border-[#30363d]">
            <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Agregar servicios y repuestos</span>
          </div>
          <div className="p-3">
            <input
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              placeholder="Buscar en catálogo activo..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] mb-2"
            />
            <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
              {filteredCatalog.length === 0 && (
                <div className="text-xs text-[#6e7681] px-2 py-3 text-center">Sin resultados en catálogo activo</div>
              )}
              {filteredCatalog.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => addItem(cat)}
                  disabled={busy}
                  className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#21262d] transition-colors text-left w-full group disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={cat.tipo === 'SERVICIO' ? 'service' : 'part'}>{cat.tipo === 'SERVICIO' ? 'SRV' : 'REP'}</Badge>
                    <span className="font-mono text-xs text-[#6e7681]">{cat.codigo}</span>
                    <span className="text-sm text-[#e6edf3]">{cat.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[#8b949e]">{formatCOP(cat.precioVenta)}</span>
                    <span className="text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none">+</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
          Servicios y repuestos ({items.length})
        </div>
        <div className="border border-[#30363d] rounded-[6px] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1c2128] border-b border-[#30363d]">
                <th className="px-3 py-2 text-left text-[#6e7681]">Elemento</th>
                <th className="px-3 py-2 text-center text-[#6e7681]">Cant.</th>
                <th className="hidden sm:table-cell px-3 py-2 text-right text-[#6e7681]">P. Unit.</th>
                <th className="hidden sm:table-cell px-3 py-2 text-right text-[#6e7681]">Subtotal</th>
                <th className="hidden sm:table-cell px-3 py-2 text-right text-[#6e7681]">IVA</th>
                <th className="px-3 py-2 text-right text-[#6e7681]">Total</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]/60">
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-[#6e7681]">Sin servicios ni repuestos registrados</td></tr>
              )}
              {items.map(item => (
                <tr key={item.id} className="hover:bg-[#1c2128]/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.tipoItem === 'SERVICIO' ? 'service' : 'part'}>{item.tipoItem === 'SERVICIO' ? 'SRV' : 'REP'}</Badge>
                      <div>
                        <div className="font-medium text-[#e6edf3]">{item.nombreItem}</div>
                        <div className="font-mono text-[#6e7681]">{item.codigoItem}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-[#8b949e]">
                    {editable ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button aria-label="Disminuir cantidad" onClick={() => changeQty(item, toNumber(item.cantidad) - 1)} disabled={busy || toNumber(item.cantidad) <= 1} className="w-6 h-6 rounded bg-[#21262d] hover:bg-[#30363d] disabled:opacity-30">−</button>
                        <span className="w-6">{toNumber(item.cantidad)}</span>
                        <button aria-label="Aumentar cantidad" onClick={() => changeQty(item, toNumber(item.cantidad) + 1)} disabled={busy} className="w-6 h-6 rounded bg-[#21262d] hover:bg-[#30363d] disabled:opacity-30">+</button>
                      </div>
                    ) : toNumber(item.cantidad)}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2 text-right font-mono text-[#8b949e]">{formatCOP(item.precioUnitario)}</td>
                  <td className="hidden sm:table-cell px-3 py-2 text-right font-mono text-[#e6edf3]">{formatCOP(item.subtotal)}</td>
                  <td className="hidden sm:table-cell px-3 py-2 text-right font-mono text-[#8b949e]">{formatCOP(item.impuesto)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-[#e6edf3]">{formatCOP(item.total)}</td>
                  {editable && (
                    <td className="px-2 text-right">
                      <button aria-label={`Quitar ${item.nombreItem}`} onClick={() => removeItem(item)} disabled={busy} className="text-[#6e7681] hover:text-[#ef4444] transition-colors">✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#8b949e]">Subtotal servicios</span>
          <span className="font-mono text-blue-400">{formatCOP(subtotals.services)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8b949e]">Subtotal repuestos</span>
          <span className="font-mono text-violet-400">{formatCOP(subtotals.parts)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-[#30363d] pt-2">
          <span className="text-[#8b949e]">Subtotal</span>
          <span className="font-mono text-[#e6edf3]">{formatCOP(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#8b949e]">IVA (según cada ítem)</span>
          <span className="font-mono text-yellow-400">{formatCOP(order.impuestos)}</span>
        </div>
        <div className="border-t border-[#30363d] pt-2 flex justify-between font-bold text-base">
          <span className="text-[#e6edf3]">Total general</span>
          <span className="font-mono text-[#f97316] text-lg">{formatCOP(order.total)}</span>
        </div>
        {order.estado === 'FINALIZADA' && (
          <div className="pt-1 text-xs text-[#6e7681] flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span>
            Precios congelados al momento de finalización — válidos para facturación
          </div>
        )}
      </div>

      {editable ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="order-notes" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones del trabajo</label>
          <textarea
            id="order-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Notas técnicas, recomendaciones al cliente..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none"
          />
          {notes !== (order.observaciones ?? '') && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={saveNotes} loading={busy}>Guardar observaciones</Button>
            </div>
          )}
        </div>
      ) : order.observaciones && (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
          <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Observaciones</div>
          <p className="text-sm text-[#8b949e]">{order.observaciones}</p>
        </div>
      )}
    </div>
  );
}
