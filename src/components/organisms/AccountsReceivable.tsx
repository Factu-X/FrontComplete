import React, { useEffect, useState } from 'react';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import DataTable from '../molecules/DataTable';
import Modal from '../molecules/Modal';
import SearchBar from '../molecules/SearchBar';
import { ToastItem } from '../molecules/ToastContainer';
import InvoiceAccount from './InvoiceAccount';
import { apiRequest, ApiEntityResponse, ApiSession } from '../../lib/api';
import { ANTIGUEDAD_LABELS, PAGO_BADGE, PAGO_LABELS } from '../../lib/invoices';
import { formatCOP, toNumber } from '../../lib/orders';
import type { Antiguedad, BackendCartera, CuentaFactura } from '../../lib/types';

type Filtro = 'CON_SALDO' | 'VENCIDAS' | 'TODAS';

const filtros: [Filtro, string][] = [
  ['CON_SALDO', 'Con saldo'],
  ['VENCIDAS', 'Vencidas'],
  ['TODAS', 'Todas'],
];

const BUCKET_COLOR: Record<Antiguedad, string> = {
  AL_DIA: 'bg-emerald-500',
  D1_30: 'bg-yellow-400',
  D31_60: 'bg-orange-500',
  D61_90: 'bg-red-500',
  MAS_90: 'bg-red-700',
};

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onChanged?: () => void;
}

export default function AccountsReceivable({ session, addToast, onChanged }: Props) {
  const [cartera, setCartera] = useState<BackendCartera | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('CON_SALDO');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CuentaFactura | null>(null);

  async function load() {
    try {
      const response = await apiRequest<ApiEntityResponse<BackendCartera>>(`/cartera?filtro=${filtro}`, session);
      setCartera(response.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar la cartera', type: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, [filtro, session.token]);

  const resumen = cartera?.resumen;
  const q = search.trim().toLowerCase();
  const filas = (cartera?.facturas ?? []).filter(f => !q
    || f.numero.toLowerCase().includes(q)
    || f.cliente.nombreRazonSocial.toLowerCase().includes(q)
    || f.cliente.numeroIdentificacion.includes(q));

  const totalBuckets = resumen ? Object.values(resumen.porAntiguedad).reduce((t, v) => t + toNumber(v), 0) : 0;

  const columns = [
    { key: 'numero', header: 'Factura', render: (f: CuentaFactura) => (
      <div>
        <div className="font-mono text-xs text-[#f97316]">{f.numero}</div>
        <div className="text-xs text-[#6e7681]">{new Date(f.fechaEmision).toLocaleDateString('es-CO')}</div>
      </div>
    )},
    { key: 'cliente', header: 'Cliente', render: (f: CuentaFactura) => (
      <div>
        <div className="text-sm text-[#e6edf3]">{f.cliente.nombreRazonSocial}</div>
        <div className="font-mono text-xs text-[#6e7681]">{f.cliente.telefono ?? f.cliente.numeroIdentificacion}</div>
      </div>
    )},
    { key: 'vence', header: 'Vence', render: (f: CuentaFactura) => (
      <div>
        <div className="font-mono text-xs text-[#8b949e]">{f.vencimiento}</div>
        {f.diasVencida > 0 && <div className="text-xs text-red-400">{f.diasVencida} días</div>}
      </div>
    )},
    { key: 'total', header: 'Total', render: (f: CuentaFactura) => <span className="font-mono text-xs text-[#8b949e]">{formatCOP(f.total)}</span> },
    { key: 'saldo', header: 'Saldo', render: (f: CuentaFactura) => <span className="font-mono text-sm font-semibold text-[#e6edf3]">{formatCOP(f.saldo)}</span> },
    { key: 'estado', header: 'Estado', render: (f: CuentaFactura) => <Badge variant={PAGO_BADGE[f.estadoPago]}>{PAGO_LABELS[f.estadoPago]}</Badge> },
    { key: 'actions', header: '', render: (f: CuentaFactura) => (
      <div className="flex justify-end">
        <Button size="sm" variant={toNumber(f.saldo) > 0 ? 'outline' : 'ghost'} onClick={() => setSelected(f)}>
          {toNumber(f.saldo) > 0 ? 'Cobrar' : 'Ver'}
        </Button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Cartera</h1>
        <p className="text-sm text-[#6e7681] mt-0.5">HU-10 · Cuentas por cobrar, abonos y antigüedad de la deuda</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Por cobrar', value: formatCOP(resumen?.porCobrar ?? 0), color: 'text-[#f97316]' },
          { label: 'Vencido', value: formatCOP(resumen?.vencido ?? 0), color: 'text-red-400' },
          { label: 'Facturas con saldo', value: String(resumen?.facturasConSaldo ?? 0), color: 'text-[#e6edf3]' },
          { label: 'Facturas vencidas', value: String(resumen?.facturasVencidas ?? 0), color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3 min-w-0">
            <div className={`text-xl font-bold font-mono truncate ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {resumen && totalBuckets > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3 flex flex-col gap-3">
          <div className="text-xs text-[#6e7681] uppercase tracking-wider">Antigüedad de la deuda</div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#21262d]" aria-hidden="true">
            {(Object.keys(resumen.porAntiguedad) as Antiguedad[]).map(b => (
              <div key={b} className={BUCKET_COLOR[b]} style={{ width: `${(toNumber(resumen.porAntiguedad[b]) / totalBuckets) * 100}%` }} />
            ))}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {(Object.keys(resumen.porAntiguedad) as Antiguedad[]).map(b => (
              <div key={b} className="flex items-start gap-2 min-w-0">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${BUCKET_COLOR[b]}`} />
                <div className="min-w-0">
                  <dt className="text-[#8b949e]">{ANTIGUEDAD_LABELS[b]}</dt>
                  <dd className="font-mono text-[#e6edf3] truncate">{formatCOP(resumen.porAntiguedad[b])}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por factura, cliente o documento..." />
        </div>
        <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-xs">
          {filtros.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFiltro(v)}
              className={`whitespace-nowrap px-3 py-2 transition-colors ${filtro === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filas} emptyMessage={cartera ? 'No hay facturas con este filtro' : 'Cargando cartera...'} />

      {selected && (
        <Modal title={`Cuenta de ${selected.numero} · ${selected.cliente.nombreRazonSocial}`} open={!!selected} onClose={() => setSelected(null)} width="max-w-2xl">
          <InvoiceAccount
            facturaId={selected.id}
            session={session}
            addToast={addToast}
            onChanged={() => { load(); onChanged?.(); }}
          />
        </Modal>
      )}
    </div>
  );
}
