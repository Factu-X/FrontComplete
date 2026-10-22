import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import SearchBar from '../molecules/SearchBar';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import OrderForm from './OrderForm';
import OrderDetail from './OrderDetail';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiListResponse, ApiSession } from '../../lib/api';
import { formatCOP, isOrderEditable, matchesOrderSearch, STATUS_BADGE, STATUS_LABELS } from '../../lib/orders';
import { canCreateOrders } from '../../lib/roles';
import type { BackendOrden, EstadoOrden, UserRole } from '../../lib/types';

const statusFilterOptions: [EstadoOrden | 'all', string][] = [
  ['all', 'Todos'],
  ['ABIERTA', 'Abiertas'],
  ['EN_PROCESO', 'En proceso'],
  ['FINALIZADA', 'Finalizadas'],
  ['CANCELADA', 'Canceladas'],
];

interface Props {
  session: ApiSession;
  userRole: UserRole;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function OrderManager({ session, userRole, addToast }: Props) {
  const [orders, setOrders] = useState<BackendOrden[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<EstadoOrden | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<BackendOrden | null>(null);

  async function loadOrders() {
    try {
      const response = await apiRequest<ApiListResponse<BackendOrden>>('/ordenes', session);
      setOrders(response.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar las órdenes', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [session.token]);

  const filtered = orders.filter(o =>
    matchesOrderSearch(o, search) && (filterStatus === 'all' || o.estado === filterStatus),
  );

  function handleCreated(orden: BackendOrden) {
    setFormOpen(false);
    setDetailOrder(orden);
    void loadOrders();
  }

  const columns = [
    { key: 'numero', header: 'N° Orden', render: (o: BackendOrden) => (
      <span className="font-mono text-xs text-[#f97316]">{o.numero}</span>
    )},
    { key: 'date', header: 'Fecha', render: (o: BackendOrden) => (
      <span className="font-mono text-xs text-[#6e7681]">{new Date(o.fechaIngreso).toLocaleDateString('es-CO')}</span>
    )},
    { key: 'customer', header: 'Cliente / Moto', render: (o: BackendOrden) => (
      <div>
        <div className="text-sm font-medium text-[#e6edf3]">{o.cliente?.nombreRazonSocial}</div>
        <div className="font-mono text-xs text-[#6e7681]">{o.motocicleta?.placa} · {o.motocicleta?.marca} {o.motocicleta?.modelo}</div>
      </div>
    )},
    { key: 'km', header: 'Km', render: (o: BackendOrden) => (
      <span className="font-mono text-xs text-[#8b949e]">{o.kilometrajeIngreso.toLocaleString('es-CO')}</span>
    )},
    { key: 'total', header: 'Total', render: (o: BackendOrden) => (
      <span className="font-mono text-sm font-semibold text-[#e6edf3]">{formatCOP(o.total)}</span>
    )},
    { key: 'status', header: 'Estado', render: (o: BackendOrden) => (
      <Badge variant={STATUS_BADGE[o.estado]}>{STATUS_LABELS[o.estado]}</Badge>
    )},
    { key: 'actions', header: '', render: (o: BackendOrden) => (
      <div className="flex justify-end">
        <Button size="sm" variant={isOrderEditable(o.estado) ? 'outline' : 'ghost'} onClick={() => setDetailOrder(o)}>
          {isOrderEditable(o.estado) ? 'Trabajar' : 'Ver'}
        </Button>
      </div>
    )},
  ];

  const statsData = [
    { label: 'Total órdenes', value: orders.length, color: 'text-[#e6edf3]' },
    { label: 'Abiertas', value: orders.filter(o => o.estado === 'ABIERTA').length, color: 'text-emerald-400' },
    { label: 'En proceso', value: orders.filter(o => o.estado === 'EN_PROCESO').length, color: 'text-yellow-400' },
    { label: 'Finalizadas', value: orders.filter(o => o.estado === 'FINALIZADA').length, color: 'text-blue-400' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Órdenes de Servicio</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-02 · HU-03 · Registro y cálculo automático de órdenes</p>
        </div>
        {canCreateOrders(userRole) && (
          <Button onClick={() => setFormOpen(true)} icon={<span className="text-base leading-none">+</span>}>
            Nueva orden
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsData.map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por N° orden, cliente o placa..." />
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

      <DataTable columns={columns} data={filtered} emptyMessage={loading ? 'Cargando órdenes...' : 'No se encontraron órdenes de servicio'} />

      <Modal title="Nueva orden de servicio" open={formOpen} onClose={() => setFormOpen(false)} width="max-w-3xl">
        {formOpen && (
          <OrderForm session={session} addToast={addToast} onCreated={handleCreated} onCancel={() => setFormOpen(false)} />
        )}
      </Modal>

      {detailOrder && (
        <Modal
          title={`Orden ${detailOrder.numero}`}
          open={!!detailOrder}
          onClose={() => setDetailOrder(null)}
          width="max-w-3xl"
        >
          <OrderDetail
            orderId={detailOrder.id}
            session={session}
            addToast={addToast}
            userRole={userRole}
            onChanged={loadOrders}
          />
        </Modal>
      )}
    </div>
  );
}
