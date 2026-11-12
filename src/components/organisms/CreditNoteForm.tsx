import React, { useEffect, useMemo, useState } from 'react';
import Button from '../atoms/Button';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import { AJUSTE_LABELS, estimateCreditLine } from '../../lib/invoices';
import { formatCOP, toNumber } from '../../lib/orders';
import type { BackendAcreditable, BackendFactura, BackendNotaCreditoCompleta, TipoAjusteNota } from '../../lib/types';

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onCreated: (nota: BackendNotaCreditoCompleta) => void;
  onCancel: () => void;
  facturaId?: string;
}

const inputClass = 'w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]';

export default function CreditNoteForm({ session, addToast, onCreated, onCancel, facturaId: initialFactura }: Props) {
  const [facturas, setFacturas] = useState<BackendFactura[]>([]);
  const [facturaId, setFacturaId] = useState(initialFactura ?? '');
  const [acreditable, setAcreditable] = useState<BackendAcreditable | null>(null);
  const [tipo, setTipo] = useState<TipoAjusteNota>('PARCIAL');
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<ApiListResponse<BackendFactura>>('/facturas?estadoDian=VALIDADA&limit=200', session)
      .then(response => {
        setFacturas(response.data);
        if (!initialFactura && response.data[0]) setFacturaId(response.data[0].id);
      })
      .catch(error => addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar las facturas', type: 'error' }));
  }, [session.token]);

  useEffect(() => {
    if (!facturaId) return;
    setAcreditable(null);
    setCantidades({});
    apiRequest<ApiEntityResponse<BackendAcreditable>>(`/facturas/${facturaId}/acreditable`, session)
      .then(response => setAcreditable(response.data))
      .catch(error => addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar la factura', type: 'error' }));
  }, [facturaId, session.token]);

  const lineas = acreditable?.lineas ?? [];
  const pendiente = lineas.some(l => toNumber(l.disponible) > 0);

  const seleccion = useMemo(() => lineas
    .map(linea => ({
      linea,
      cantidad: tipo === 'TOTAL' ? toNumber(linea.disponible) : Number(cantidades[linea.id] || 0),
    }))
    .filter(item => item.cantidad > 0), [lineas, cantidades, tipo]);

  const estimado = seleccion.reduce(
    (acc, { linea, cantidad }) => {
      const valores = estimateCreditLine(linea, cantidad);
      return { subtotal: acc.subtotal + valores.subtotal, impuesto: acc.impuesto + valores.impuesto, total: acc.total + valores.total };
    },
    { subtotal: 0, impuesto: 0, total: 0 },
  );

  const excedidas = seleccion.filter(({ linea, cantidad }) => cantidad > toNumber(linea.disponible));
  const valido = !!acreditable?.puedeAcreditar && seleccion.length > 0 && excedidas.length === 0 && motivo.trim().length >= 5;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setSaving(true);
    try {
      const response = await apiRequest<ApiEntityResponse<BackendNotaCreditoCompleta>>('/notas-credito', session, {
        method: 'POST',
        body: JSON.stringify({
          facturaId,
          tipoAjuste: tipo,
          motivo: motivo.trim(),
          ...(tipo === 'PARCIAL'
            ? { lineas: seleccion.map(({ linea, cantidad }) => ({ detalleFacturaId: linea.id, cantidad })) }
            : {}),
        }),
      });
      addToast({ message: `Nota crédito ${response.data.numero} creada`, type: 'success' });
      onCreated(response.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo crear la nota crédito', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (facturas.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[#6e7681]">
        Solo se emiten notas crédito sobre facturas validadas por la DIAN, y todavía no hay ninguna.
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <label htmlFor="nc-factura" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Factura validada</label>
        <select id="nc-factura" value={facturaId} onChange={e => setFacturaId(e.target.value)} className={inputClass}>
          {facturas.map(f => (
            <option key={f.id} value={f.id} className="bg-[#161b22]">
              {f.numero} · {f.cliente.nombreRazonSocial} · {formatCOP(f.total)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Tipo de nota</span>
        <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-sm">
          {(['PARCIAL', 'TOTAL'] as TipoAjusteNota[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex-1 whitespace-nowrap px-3 py-2 transition-colors ${tipo === t ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >
              {AJUSTE_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#6e7681]">
          {tipo === 'TOTAL'
            ? 'Acredita todo lo que queda de la factura. Cuando la DIAN valida la nota, la factura queda anulada y sale de la cartera.'
            : 'Elige cuánto devolver o descontar de cada línea.'}
        </p>
      </div>

      {!acreditable ? (
        <div className="py-6 text-center text-sm text-[#6e7681]">Cargando líneas...</div>
      ) : !pendiente ? (
        <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/25 rounded-[6px] text-sm text-yellow-300">
          Esta factura ya está totalmente acreditada por notas anteriores.
        </div>
      ) : (
        <div className="rounded-[6px] border border-[#30363d] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1c2128] text-xs text-[#8b949e] uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Ítem</th>
                <th className="hidden sm:table-cell px-3 py-2 text-right">Facturado</th>
                <th className="px-3 py-2 text-right">Disponible</th>
                <th className="px-3 py-2 text-right">A acreditar</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map(linea => {
                const disponible = toNumber(linea.disponible);
                const valor = tipo === 'TOTAL' ? linea.disponible : (cantidades[linea.id] ?? '');
                const excede = Number(valor || 0) > disponible;
                return (
                  <tr key={linea.id} className="border-t border-[#30363d]/60">
                    <td className="px-3 py-2 text-[#e6edf3]">
                      {linea.descripcion}
                      <div className="font-mono text-xs text-[#6e7681]">{formatCOP(linea.precioUnitario)} c/u</div>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2 text-right font-mono text-xs text-[#8b949e]">{Number(linea.cantidad)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-[#8b949e]">{disponible}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={disponible}
                        step="any"
                        aria-label={`Cantidad a acreditar de ${linea.descripcion}`}
                        disabled={tipo === 'TOTAL' || disponible === 0}
                        value={valor}
                        onChange={e => setCantidades(prev => ({ ...prev, [linea.id]: e.target.value }))}
                        className={`w-20 bg-[#0d1117] border rounded-[6px] px-2 py-1 text-right font-mono text-sm text-[#e6edf3] disabled:opacity-60 ${excede ? 'border-[#ef4444]' : 'border-[#30363d]'}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {excedidas.length > 0 && (
        <div className="text-xs text-[#ef4444]">No puedes acreditar más de lo disponible en {excedidas.map(e => e.linea.descripcion).join(', ')}.</div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="nc-motivo" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Motivo *</label>
        <textarea
          id="nc-motivo"
          rows={2}
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Ej.: el cliente devolvió el filtro sin usar"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1 text-sm self-end w-full sm:w-72">
        <div className="flex justify-between text-[#8b949e]"><span>Subtotal</span><span className="font-mono">{formatCOP(estimado.subtotal)}</span></div>
        <div className="flex justify-between text-[#8b949e]"><span>IVA</span><span className="font-mono">{formatCOP(estimado.impuesto)}</span></div>
        <div className="flex justify-between text-[#e6edf3] font-semibold border-t border-[#30363d] pt-1 mt-1">
          <span>Total a acreditar</span><span className="font-mono text-[#f97316]">{formatCOP(estimado.total)}</span>
        </div>
        <span className="text-[11px] text-[#6e7681]">Valor estimado; el definitivo lo calcula el sistema al crear la nota.</span>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={saving} disabled={!valido}>Crear nota crédito</Button>
      </div>
    </form>
  );
}
