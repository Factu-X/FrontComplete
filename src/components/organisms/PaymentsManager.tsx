import React, { useEffect, useState } from 'react';
import Select from '../atoms/Select';
import DataTable from '../molecules/DataTable';
import DateRange from '../molecules/DateRange';
import Modal from '../molecules/Modal';
import InvoiceDetail from './InvoiceDetail';
import { ToastItem } from '../molecules/ToastContainer';
import { ApiSession, getPagosRecibidos } from '../../lib/api';
import { METODO_LABELS } from '../../lib/invoices';
import { formatCOP } from '../../lib/orders';
import { rangoPreset, type Preset } from '../../lib/reports';
import type { MetodoPago, PagoRecibido, PagosRecibidos } from '../../lib/types';

const presets: [Preset, string][] = [
  ['hoy', 'Hoy'],
  ['mes', 'Este mes'],
  ['mes-anterior', 'Mes anterior'],
  ['30-dias', 'Últimos 30 días'],
  ['anio', 'Este año'],
];

const metodos = Object.keys(METODO_LABELS) as MetodoPago[];
const metodoOptions = [{ value: '', label: 'Todos' }, ...metodos.map(m => ({ value: m, label: METODO_LABELS[m] }))];

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

// Lista de los pagos que entraron en un rango de fechas, con el total por forma de pago.
export default function PaymentsManager({ session, addToast }: Props) {
  const [preset, setPreset] = useState<Preset | 'custom'>('mes');
  const [rango, setRango] = useState(rangoPreset('mes'));
  const [metodo, setMetodo] = useState('');
  const [data, setData] = useState<PagosRecibidos | null>(null);
  const [loading, setLoading] = useState(true);
  const [facturaId, setFacturaId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setLoading(true);
    getPagosRecibidos(session, { ...rango, metodo })
      .then(setData)
      .catch(error => addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar los pagos', type: 'error' }))
      .finally(() => setLoading(false));
  }, [rango.desde, rango.hasta, metodo, session.token, version]);

  const cards = [
    { label: 'Total recibido', value: data?.totales.total ?? 0, color: 'text-emerald-400' },
    ...metodos.map(m => ({ label: METODO_LABELS[m], value: data?.totales.porMetodo[m] ?? 0, color: 'text-[#e6edf3]' })),
  ];

  const columns = [
    { key: 'fecha', header: 'Fecha', render: (p: PagoRecibido) => (
      <span className="font-mono text-xs text-[#6e7681]">{new Date(p.fechaPago).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</span>
    )},
    { key: 'cliente', header: 'Cliente', render: (p: PagoRecibido) => <span className="text-sm text-[#e6edf3]">{p.cliente.nombre}</span> },
    { key: 'factura', header: 'Factura', render: (p: PagoRecibido) => (
      <button className="font-mono text-xs text-[#f97316] hover:underline" onClick={() => setFacturaId(p.factura.id)}>{p.factura.numero}</button>
    )},
    { key: 'metodo', header: 'Método', render: (p: PagoRecibido) => <span className="text-xs text-[#8b949e]">{METODO_LABELS[p.metodoPago]}</span> },
    { key: 'referencia', header: 'Referencia', render: (p: PagoRecibido) => <span className="font-mono text-xs text-[#8b949e]">{p.referencia ?? '—'}</span> },
    { key: 'monto', header: 'Monto', render: (p: PagoRecibido) => <span className="font-mono text-sm font-semibold text-[#e6edf3]">{formatCOP(p.monto)}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Pagos recibidos</h1>
        <p className="text-sm text-[#6e7681] mt-0.5">El dinero que le han pagado sus clientes, por fechas y por forma de pago</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-xs">
          {presets.map(([p, label]) => (
            <button
              key={p}
              onClick={() => { setPreset(p); setRango(rangoPreset(p)); }}
              className={`whitespace-nowrap px-3 py-2 transition-colors ${preset === p ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{label}</button>
          ))}
        </div>
        <DateRange
          desde={rango.desde}
          hasta={rango.hasta}
          onDesde={v => { setPreset('custom'); setRango(r => ({ ...r, desde: v })); }}
          onHasta={v => { setPreset('custom'); setRango(r => ({ ...r, hasta: v })); }}
        >
          {loading && <span className="text-[#6e7681]">Actualizando...</span>}
        </DateRange>
        <div className="w-44">
          <Select id="pagos-metodo" label="Forma de pago" options={metodoOptions} value={metodo} onChange={e => setMetodo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-[#161b22] border border-[#30363d] rounded-[8px] px-4 py-3 min-w-0">
            <div className="text-xs text-[#6e7681] uppercase tracking-wider">{c.label}</div>
            <div className={`text-xl font-bold font-mono truncate mt-1 ${c.color}`}>{formatCOP(c.value)}</div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.pagos ?? []}
        emptyMessage={loading ? 'Cargando pagos...' : 'No hay pagos en estas fechas. Pruebe con otro rango o registre un pago desde una factura.'}
      />

      {facturaId && (
        <Modal title="Detalle de factura" open onClose={() => setFacturaId(null)} width="max-w-5xl">
          <InvoiceDetail facturaId={facturaId} session={session} addToast={addToast} onChanged={() => setVersion(v => v + 1)} />
        </Modal>
      )}
    </div>
  );
}
