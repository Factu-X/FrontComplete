import React, { useEffect, useState } from 'react';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiSession } from '../../lib/api';
import { AJUSTE_LABELS, ANTIGUEDAD_LABELS, DIAN_LABELS, METODO_LABELS, PAGO_BADGE, PAGO_LABELS } from '../../lib/invoices';
import { formatCOP, toNumber } from '../../lib/orders';
import type { EstadoCuentaFactura, MetodoPago } from '../../lib/types';

interface Props {
  facturaId: string;
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onChanged?: () => void;
}

const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const metodoOptions = (Object.keys(METODO_LABELS) as MetodoPago[]).map(m => ({ value: m, label: METODO_LABELS[m] }));

// Saldo de una factura: lo facturado menos notas crédito validadas y pagos, con el registro de abonos.
export default function InvoiceAccount({ facturaId, session, addToast, onChanged }: Props) {
  const [cuenta, setCuenta] = useState<EstadoCuentaFactura | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await apiRequest<ApiEntityResponse<EstadoCuentaFactura>>(`/facturas/${facturaId}/cuenta`, session);
      setCuenta(response.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar el estado de cuenta', type: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, [facturaId, session.token]);

  if (!cuenta) return <div className="text-xs text-[#6e7681]">Cargando estado de cuenta...</div>;

  const saldo = toNumber(cuenta.saldo);
  const montoNum = Number(monto);
  const montoInvalido = monto !== '' && (!(montoNum > 0) || montoNum > saldo);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (montoInvalido || !monto) return;
    setSaving(true);
    try {
      const response = await apiRequest<ApiEntityResponse<EstadoCuentaFactura>>(`/facturas/${facturaId}/pagos`, session, {
        method: 'POST',
        body: JSON.stringify({
          monto: Math.round(montoNum * 100) / 100,
          metodoPago: metodo,
          referencia: referencia.trim() || null,
          fechaPago: fecha,
        }),
      });
      setCuenta(response.data);
      setFormOpen(false);
      setMonto('');
      setReferencia('');
      addToast({ message: `Pago de ${formatCOP(montoNum)} registrado`, type: 'success' });
      onChanged?.();
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo registrar el pago', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-[#6e7681] uppercase tracking-wider">Estado de cuenta</div>
        <div className="flex items-center gap-2">
          <Badge variant={PAGO_BADGE[cuenta.estadoPago]}>{PAGO_LABELS[cuenta.estadoPago]}</Badge>
          {cuenta.diasVencida > 0 && <Badge variant="warning">Vencida · {ANTIGUEDAD_LABELS[cuenta.antiguedad]}</Badge>}
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        {[
          ['Total', cuenta.total, 'text-[#e6edf3]'],
          ['Notas crédito', cuenta.acreditado, 'text-[#8b949e]'],
          ['Pagado', cuenta.pagado, 'text-emerald-400'],
          ['Saldo', cuenta.saldo, saldo > 0 ? 'text-[#f97316]' : 'text-emerald-400'],
        ].map(([label, valor, color]) => (
          <div key={label} className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 min-w-0">
            <dt className="text-[11px] text-[#6e7681] uppercase tracking-wider">{label}</dt>
            <dd className={`font-mono font-semibold truncate ${color}`}>{formatCOP(valor)}</dd>
          </div>
        ))}
      </dl>
      <div className="text-xs text-[#6e7681]">Vence el {cuenta.vencimiento}. Solo las notas crédito validadas por la DIAN reducen el saldo.</div>

      {saldo > 0 && !formOpen && (
        <div><Button size="sm" variant="outline" onClick={() => { setMonto(String(saldo)); setFormOpen(true); }}>Registrar pago</Button></div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0d1117] border border-[#30363d] rounded-[6px] p-3">
          <Input
            id="pago-monto"
            label="Monto *"
            type="number"
            min={0.01}
            max={saldo}
            step="0.01"
            value={monto}
            error={montoInvalido ? `Debe ser mayor que cero y máximo ${formatCOP(saldo)}` : undefined}
            onChange={e => setMonto(e.target.value)}
          />
          <Select id="pago-metodo" label="Método *" value={metodo} onChange={e => setMetodo(e.target.value as MetodoPago)} options={metodoOptions} />
          <Input id="pago-fecha" label="Fecha" type="date" max={todayISO()} value={fecha} onChange={e => setFecha(e.target.value)} />
          <Input id="pago-ref" label="Referencia" placeholder="N° de transferencia o recibo" value={referencia} onChange={e => setReferencia(e.target.value)} />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" size="sm" loading={saving} disabled={!monto || montoInvalido}>Guardar pago</Button>
          </div>
        </form>
      )}

      {(cuenta.pagos.length > 0 || cuenta.notasCredito.length > 0) && (
        <ul className="flex flex-col divide-y divide-[#30363d]/60 border border-[#30363d] rounded-[6px] text-sm">
          {cuenta.pagos.map(p => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-[#8b949e]">
                Pago · {METODO_LABELS[p.metodoPago]} · {new Date(p.fechaPago).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}
                {p.referencia && <span className="font-mono text-xs"> · {p.referencia}</span>}
              </span>
              <span className="font-mono text-emerald-400">− {formatCOP(p.monto)}</span>
            </li>
          ))}
          {cuenta.notasCredito.map(n => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-[#8b949e]">
                <span className="font-mono">{n.numero}</span> · {AJUSTE_LABELS[n.tipoAjuste]} · {DIAN_LABELS[n.estadoDian]}
              </span>
              <span className={`font-mono ${n.estadoDian === 'VALIDADA' ? 'text-[#e6edf3]' : 'text-[#6e7681] line-through'}`}>− {formatCOP(n.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
