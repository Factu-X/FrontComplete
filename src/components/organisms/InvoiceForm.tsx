import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import { groupTaxes } from '../../lib/invoices';
import { formatCOP } from '../../lib/orders';
import type { BackendDetalleOrden, BackendFacturaCompleta, BackendOrden, FormaPago } from '../../lib/types';

interface Props {
  session: ApiSession;
  pendingOrders: BackendOrden[];
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onCreated: (factura: BackendFacturaCompleta) => void;
  onCancel: () => void;
}

const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export default function InvoiceForm({ session, pendingOrders, addToast, onCreated, onCancel }: Props) {
  const [ordenId, setOrdenId] = useState(pendingOrders[0]?.id ?? '');
  const [detalles, setDetalles] = useState<BackendDetalleOrden[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [formaPago, setFormaPago] = useState<FormaPago>('CONTADO');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [saving, setSaving] = useState(false);

  const orden = pendingOrders.find(o => o.id === ordenId);

  useEffect(() => {
    if (!ordenId) return;
    setLoadingDetalles(true);
    apiRequest<ApiListResponse<BackendDetalleOrden>>(`/ordenes/${ordenId}/detalles`, session)
      .then(response => setDetalles(response.data))
      .catch(error => addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar los ítems', type: 'error' }))
      .finally(() => setLoadingDetalles(false));
  }, [ordenId, session.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orden) return;
    setSaving(true);
    try {
      const response = await apiRequest<ApiEntityResponse<BackendFacturaCompleta>>('/facturas', session, {
        method: 'POST',
        body: JSON.stringify({
          ordenId: orden.id,
          formaPago,
          ...(formaPago === 'CREDITO' ? { fechaVencimiento } : {}),
        }),
      });
      addToast({ message: `Factura ${response.data.numero} generada`, type: 'success' });
      onCreated(response.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo generar la factura', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (pendingOrders.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[#6e7681]">
        No hay órdenes finalizadas pendientes por facturar.
      </div>
    );
  }

  const taxes = groupTaxes(detalles);

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <label htmlFor="inv-orden" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Orden finalizada</label>
        <select
          id="inv-orden"
          value={ordenId}
          onChange={e => setOrdenId(e.target.value)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]"
        >
          {pendingOrders.map(o => (
            <option key={o.id} value={o.id} className="bg-[#161b22]">
              {o.numero} · {o.cliente?.nombreRazonSocial} · {o.motocicleta?.placa} · {formatCOP(o.total)}
            </option>
          ))}
        </select>
      </div>

      {orden && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Adquirente</div>
            <div className="text-[#e6edf3] font-medium">{orden.cliente?.nombreRazonSocial}</div>
            <div className="font-mono text-xs text-[#8b949e]">{orden.cliente?.tipoIdentificacion} {orden.cliente?.numeroIdentificacion}</div>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Motocicleta</div>
            <div className="text-[#e6edf3] font-medium font-mono">{orden.motocicleta?.placa}</div>
            <div className="text-xs text-[#8b949e]">{orden.motocicleta?.marca} {orden.motocicleta?.modelo} · {orden.kilometrajeIngreso.toLocaleString('es-CO')} km</div>
          </div>
        </div>
      )}

      <div className="rounded-[6px] border border-[#30363d] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1c2128] text-xs text-[#8b949e] uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Ítem</th>
              <th className="px-3 py-2 text-right">Cant.</th>
              <th className="hidden sm:table-cell px-3 py-2 text-right">IVA</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loadingDetalles ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-[#6e7681]">Cargando ítems...</td></tr>
            ) : detalles.map(d => (
              <tr key={d.id} className="border-t border-[#30363d]/60">
                <td className="px-3 py-2 text-[#e6edf3]">{d.nombreItem}<span className="ml-2 font-mono text-xs text-[#6e7681]">{d.codigoItem}</span></td>
                <td className="px-3 py-2 text-right font-mono text-xs text-[#8b949e]">{Number(d.cantidad)}</td>
                <td className="hidden sm:table-cell px-3 py-2 text-right font-mono text-xs text-[#8b949e]">
                  {d.tratamientoIva === 'GRAVADO' ? `${Number(d.tarifaIva)}%` : d.tratamientoIva.toLowerCase()}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[#e6edf3]">{formatCOP(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orden && (
        <div className="flex flex-col gap-1 text-sm self-end w-full sm:w-72">
          <div className="flex justify-between text-[#8b949e]"><span>Subtotal</span><span className="font-mono">{formatCOP(orden.subtotal)}</span></div>
          {taxes.filter(t => t.impuesto > 0).map(t => (
            <div key={t.label} className="flex justify-between text-[#8b949e]"><span>{t.label}</span><span className="font-mono">{formatCOP(t.impuesto)}</span></div>
          ))}
          <div className="flex justify-between text-[#e6edf3] font-semibold border-t border-[#30363d] pt-1 mt-1">
            <span>Total</span><span className="font-mono text-[#f97316]">{formatCOP(orden.total)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Forma de pago</span>
          <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-sm">
            {(['CONTADO', 'CREDITO'] as FormaPago[]).map(fp => (
              <button
                key={fp}
                type="button"
                onClick={() => setFormaPago(fp)}
                className={`flex-1 whitespace-nowrap px-3 py-2 transition-colors ${formaPago === fp ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
              >
                {fp === 'CONTADO' ? 'Contado' : 'Crédito'}
              </button>
            ))}
          </div>
        </div>
        {formaPago === 'CREDITO' && (
          <Input
            id="inv-vencimiento"
            label="Fecha de vencimiento *"
            type="date"
            min={todayISO()}
            required
            value={fechaVencimiento}
            onChange={e => setFechaVencimiento(e.target.value)}
          />
        )}
      </div>

      <p className="text-xs text-[#6e7681]">
        La factura toma el siguiente número de la resolución vigente y queda pendiente de envío a la DIAN.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving} disabled={!orden || loadingDetalles || (formaPago === 'CREDITO' && !fechaVencimiento)}>
          Generar factura
        </Button>
      </div>
    </form>
  );
}
