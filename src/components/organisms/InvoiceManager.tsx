import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import InvoiceForm from './InvoiceForm';
import InvoiceDetail from './InvoiceDetail';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import { DIAN_BADGE, DIAN_LABELS, FORMA_PAGO_LABELS, matchesInvoiceSearch, ordersPendingInvoice } from '../../lib/invoices';
import { formatCOP, toNumber } from '../../lib/orders';
import type { BackendConfiguracion, BackendFactura, BackendOrden, EstadoDian } from '../../lib/types';

const statusFilterOptions: [EstadoDian | 'all', string][] = [
  ['all', 'Todas'],
  ['PENDIENTE_ENVIO', 'Pendientes'],
  ['VALIDADA', 'Validadas'],
  ['RECHAZADA', 'Rechazadas'],
];

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function InvoiceManager({ session, addToast }: Props) {
  const [facturas, setFacturas] = useState<BackendFactura[]>([]);
  const [ordenes, setOrdenes] = useState<BackendOrden[]>([]);
  const [bloqueo, setBloqueo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<EstadoDian | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    try {
      const [facturasRes, ordenesRes, configRes] = await Promise.all([
        apiRequest<ApiListResponse<BackendFactura>>('/facturas?limit=200', session),
        apiRequest<ApiListResponse<BackendOrden>>('/ordenes?estado=FINALIZADA', session),
        apiRequest<ApiEntityResponse<BackendConfiguracion>>('/configuracion', session),
      ]);
      setFacturas(facturasRes.data);
      setOrdenes(ordenesRes.data);
      const { estado } = configRes.data;
      setBloqueo(estado.puedeEmitir ? null : `La configuración de facturación está incompleta (falta: ${estado.faltantesEmision.join(', ')})`);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar las facturas', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [session.token]);

  const pendingOrders = ordersPendingInvoice(ordenes, facturas);
  const filtered = facturas.filter(f =>
    matchesInvoiceSearch(f, search) && (filterStatus === 'all' || f.estadoDian === filterStatus),
  );

  function handleCreated(facturaId: string) {
    setFormOpen(false);
    setDetailId(facturaId);
    load();
  }

  const columns = [
    { key: 'numero', header: 'N° Factura', render: (f: BackendFactura) => (
      <span className="font-mono text-xs text-[#f97316]">{f.numero}</span>
    )},
    { key: 'fecha', header: 'Fecha', render: (f: BackendFactura) => (
      <span className="font-mono text-xs text-[#6e7681]">{new Date(f.fechaEmision).toLocaleDateString('es-CO')}</span>
    )},
    { key: 'cliente', header: 'Cliente / Moto', render: (f: BackendFactura) => (
      <div>
        <div className="text-sm font-medium text-[#e6edf3]">{f.cliente.nombreRazonSocial}</div>
        <div className="font-mono text-xs text-[#6e7681]">{f.orden.motocicleta.placa} · {f.orden.numero}</div>
      </div>
    )},
    { key: 'pago', header: 'Pago', render: (f: BackendFactura) => (
      <span className="text-xs text-[#8b949e]">{FORMA_PAGO_LABELS[f.formaPago]}</span>
    )},
    { key: 'total', header: 'Total', render: (f: BackendFactura) => (
      <span className="font-mono text-sm font-semibold text-[#e6edf3]">{formatCOP(f.total)}</span>
    )},
    { key: 'dian', header: 'DIAN', render: (f: BackendFactura) => (
      <Badge variant={DIAN_BADGE[f.estadoDian]}>{DIAN_LABELS[f.estadoDian]}</Badge>
    )},
    { key: 'actions', header: '', render: (f: BackendFactura) => (
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setDetailId(f.id)}>Ver</Button>
      </div>
    )},
  ];

  const totalFacturado = facturas.reduce((acc, f) => acc + toNumber(f.total), 0);
  const statsData = [
    { label: 'Facturas', value: facturas.length.toString(), color: 'text-[#e6edf3]' },
    { label: 'Total facturado', value: formatCOP(totalFacturado), color: 'text-[#f97316]' },
    { label: 'Pendientes DIAN', value: facturas.filter(f => f.estadoDian === 'PENDIENTE_ENVIO').length.toString(), color: 'text-yellow-400' },
    { label: 'Órdenes por facturar', value: pendingOrders.length.toString(), color: 'text-blue-400' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Facturación</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-06 · Factura generada desde la orden finalizada</p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          disabled={!!bloqueo || loading}
          icon={<span className="text-base leading-none">+</span>}
        >
          Facturar orden
        </Button>
      </div>

      {bloqueo && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-[6px] text-sm text-red-300">
          {bloqueo}. Un administrador debe revisarlo en Configuración.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsData.map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3 min-w-0">
            <div className={`text-xl font-bold font-mono truncate ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por N° factura, cliente, documento o placa..." />
        </div>
        <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-xs">
          {statusFilterOptions.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`whitespace-nowrap px-3 py-2 transition-colors ${filterStatus === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage={loading ? 'Cargando facturas...' : 'No se encontraron facturas'} />

      <Modal title="Facturar orden de servicio" open={formOpen} onClose={() => setFormOpen(false)} width="max-w-3xl">
        {formOpen && (
          <InvoiceForm
            session={session}
            pendingOrders={pendingOrders}
            addToast={addToast}
            onCreated={factura => handleCreated(factura.id)}
            onCancel={() => setFormOpen(false)}
          />
        )}
      </Modal>

      {detailId && (
        <Modal title="Detalle de factura" open={!!detailId} onClose={() => setDetailId(null)} width="max-w-5xl">
          <InvoiceDetail facturaId={detailId} session={session} addToast={addToast} onChanged={load} />
        </Modal>
      )}
    </div>
  );
}
