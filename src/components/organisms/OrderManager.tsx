import React, { useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import SearchBar from '../molecules/SearchBar';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import OrderForm from './OrderForm';
import OrderDetail from './OrderDetail';
import { Customer, CatalogItem, Order, OrderStatus } from '../../types';
import { ToastItem } from '../molecules/ToastContainer';

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

const statusFilterOptions = [
  ['all', 'Todos'],
  ['open', 'Abiertas'],
  ['in_process', 'En proceso'],
  ['finished', 'Finalizadas'],
  ['cancelled', 'Canceladas'],
];

interface Props {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  customers: Customer[];
  catalog: CatalogItem[];
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function OrderManager({ orders, setOrders, customers, catalog, addToast }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  const nextNumber = `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchQ = !q || o.orderNumber.toLowerCase().includes(q)
      || o.customerName.toLowerCase().includes(q)
      || o.motorcyclePlate.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || o.status === filterStatus;
    return matchQ && matchS;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function handleSave(data: Omit<Order, 'id'>) {
    setSaving(true);
    setTimeout(() => {
      if (editingOrder) {
        setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...data, id: editingOrder.id } : o));
        addToast({ message: `Orden ${data.orderNumber} actualizada`, type: 'success' });
      } else {
        setOrders(prev => [...prev, { ...data, id: Date.now() }]);
        addToast({ message: `Orden ${data.orderNumber} creada exitosamente`, type: 'success' });
      }
      setSaving(false);
      setFormOpen(false);
      setEditingOrder(null);
    }, 600);
  }

  function openEdit(o: Order) {
    setEditingOrder(o);
    setFormOpen(true);
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const columns = [
    { key: 'orderNumber', header: 'N° Orden', render: (o: Order) => (
      <span className="font-mono text-xs text-[#f97316]">{o.orderNumber}</span>
    )},
    { key: 'date', header: 'Fecha', render: (o: Order) => (
      <span className="font-mono text-xs text-[#6e7681]">{new Date(o.createdAt).toLocaleDateString('es-CO')}</span>
    )},
    { key: 'customer', header: 'Cliente / Moto', render: (o: Order) => (
      <div>
        <div className="text-sm font-medium text-[#e6edf3]">{o.customerName}</div>
        <div className="font-mono text-xs text-[#6e7681]">{o.motorcyclePlate} · {o.motorcycleBrand} {o.motorcycleModel}</div>
      </div>
    )},
    { key: 'km', header: 'Km', render: (o: Order) => (
      <span className="font-mono text-xs text-[#8b949e]">{o.kilometrage.toLocaleString('es-CO')}</span>
    )},
    { key: 'items', header: 'Ítems', render: (o: Order) => (
      <span className="font-mono text-xs text-[#8b949e]">{o.items.length}</span>
    )},
    { key: 'total', header: 'Total', render: (o: Order) => (
      <span className="font-mono text-sm font-semibold text-[#e6edf3]">{fmt(o.total)}</span>
    )},
    { key: 'status', header: 'Estado', render: (o: Order) => (
      <Badge variant={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge>
    )},
    { key: 'actions', header: '', render: (o: Order) => (
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setDetailOrder(o)}>Ver</Button>
        {o.status !== 'finished' && o.status !== 'cancelled' && (
          <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>Editar</Button>
        )}
      </div>
    )},
  ];

  const statsData = [
    { label: 'Total órdenes', value: orders.length, color: 'text-[#e6edf3]' },
    { label: 'Abiertas', value: orders.filter(o => o.status === 'open').length, color: 'text-emerald-400' },
    { label: 'En proceso', value: orders.filter(o => o.status === 'in_process').length, color: 'text-yellow-400' },
    { label: 'Finalizadas', value: orders.filter(o => o.status === 'finished').length, color: 'text-blue-400' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Órdenes de Servicio</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-02 · HU-03 · Registro y cálculo automático de órdenes</p>
        </div>
        <Button onClick={() => { setEditingOrder(null); setFormOpen(true); }} icon={<span className="text-base leading-none">+</span>}>
          Nueva orden
        </Button>
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
        <div className="flex rounded-[6px] border border-[#30363d] overflow-hidden text-xs">
          {statusFilterOptions.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`px-3 py-2 transition-colors ${filterStatus === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No se encontraron órdenes de servicio" />

      {/* Form Modal */}
      <Modal
        title={editingOrder ? `Editar ${editingOrder.orderNumber}` : 'Nueva orden de servicio'}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingOrder(null); }}
        width="max-w-3xl"
      >
        <OrderForm
          customers={customers}
          catalog={catalog}
          editing={editingOrder}
          nextOrderNumber={nextNumber}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditingOrder(null); }}
          saving={saving}
        />
      </Modal>

      {/* Detail Modal */}
      {detailOrder && (
        <Modal
          title={`Detalle — ${detailOrder.orderNumber}`}
          open={!!detailOrder}
          onClose={() => setDetailOrder(null)}
          width="max-w-2xl"
        >
          <OrderDetail order={orders.find(o => o.id === detailOrder.id) ?? detailOrder} />
        </Modal>
      )}
    </div>
  );
}
