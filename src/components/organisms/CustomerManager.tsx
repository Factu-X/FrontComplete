import React, { useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import ConfirmDialog from '../molecules/ConfirmDialog';
import MotorcycleHistory from './MotorcycleHistory';
import { ToastItem } from '../molecules/ToastContainer';
import { Customer, Motorcycle, Order } from '../../types';

const idTypes = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'PAS', label: 'Pasaporte' },
];

const emptyCustomer = { idType: 'CC', idNumber: '', name: '', phone: '', email: '' };
const emptyMoto = { plate: '', brand: '', model: '', year: new Date().getFullYear() };

interface Props {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: Order[];
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function CustomerManager({ customers, setCustomers, orders, addToast }: Props) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyCustomer);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [motoModal, setMotoModal] = useState(false);
  const [motoCustomer, setMotoCustomer] = useState<Customer | null>(null);
  const [motoForm, setMotoForm] = useState(emptyMoto);
  const [motoErrors, setMotoErrors] = useState<Record<string, string>>({});
  const [motoSaving, setMotoSaving] = useState(false);

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ customer: Customer; moto: Motorcycle } | null>(null);

  const [historyMoto, setHistoryMoto] = useState<{ moto: Motorcycle; customerName: string } | null>(null);

  const allPlates = customers.flatMap(c => c.motorcycles.map(m => m.plate));

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.idNumber.includes(q) || c.phone.includes(q);
  });

  function openCreate() {
    setEditingCustomer(null);
    setForm(emptyCustomer);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setForm({ idType: c.idType, idNumber: c.idNumber, name: c.name, phone: c.phone, email: c.email });
    setErrors({});
    setModalOpen(true);
  }

  function validateCustomer() {
    const e: Record<string, string> = {};
    if (!form.idType) e.idType = 'Requerido';
    if (!form.idNumber.trim()) e.idNumber = 'El número de identificación es obligatorio';
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    if (!form.phone.trim()) e.phone = 'El teléfono es obligatorio';
    if (!editingCustomer) {
      const dup = customers.find(c => c.idNumber === form.idNumber.trim());
      if (dup) e.idNumber = 'Este número de identificación ya está registrado';
    }
    return e;
  }

  function handleSaveCustomer() {
    const e = validateCustomer();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      if (editingCustomer) {
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...form } : c));
        if (detailCustomer?.id === editingCustomer.id) setDetailCustomer(prev => prev ? { ...prev, ...form } : null);
        addToast({ message: 'Cliente actualizado correctamente', type: 'success' });
      } else {
        const newC: Customer = { ...form, id: Date.now(), motorcycles: [] };
        setCustomers(prev => [...prev, newC]);
        addToast({ message: 'Cliente registrado exitosamente', type: 'success' });
      }
      setSaving(false);
      setModalOpen(false);
    }, 500);
  }

  function openAddMoto(c: Customer) {
    setMotoCustomer(c);
    setMotoForm(emptyMoto);
    setMotoErrors({});
    setMotoModal(true);
  }

  function validateMoto() {
    const e: Record<string, string> = {};
    if (!motoForm.plate.trim()) e.plate = 'La placa es obligatoria';
    if (!motoForm.brand.trim()) e.brand = 'La marca es obligatoria';
    if (!motoForm.model.trim()) e.model = 'El modelo es obligatorio';
    if (!motoForm.year || motoForm.year < 1990 || motoForm.year > new Date().getFullYear() + 1) e.year = 'Año inválido';
    const plateUp = motoForm.plate.toUpperCase().trim();
    if (allPlates.some(p => p === plateUp)) e.plate = 'Esta placa ya está registrada en el sistema';
    return e;
  }

  function handleSaveMoto() {
    const e = validateMoto();
    if (Object.keys(e).length) { setMotoErrors(e); return; }
    setMotoSaving(true);
    setTimeout(() => {
      const newMoto: Motorcycle = { ...motoForm, id: Date.now(), plate: motoForm.plate.toUpperCase().trim() };
      setCustomers(prev => prev.map(c => c.id === motoCustomer!.id ? { ...c, motorcycles: [...c.motorcycles, newMoto] } : c));
      if (detailCustomer?.id === motoCustomer!.id)
        setDetailCustomer(prev => prev ? { ...prev, motorcycles: [...prev.motorcycles, newMoto] } : null);
      addToast({ message: `Motocicleta ${newMoto.plate} registrada`, type: 'success' });
      setMotoSaving(false);
      setMotoModal(false);
    }, 500);
  }

  function handleDeleteMoto() {
    if (!deleteConfirm) return;
    const { customer, moto } = deleteConfirm;
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, motorcycles: c.motorcycles.filter(m => m.id !== moto.id) } : c));
    if (detailCustomer?.id === customer.id)
      setDetailCustomer(prev => prev ? { ...prev, motorcycles: prev.motorcycles.filter(m => m.id !== moto.id) } : null);
    addToast({ message: `Motocicleta ${moto.plate} eliminada`, type: 'warning' });
    setDeleteConfirm(null);
  }

  const motoColumns = [
    { key: 'plate', header: 'Placa', mono: true },
    { key: 'brand', header: 'Marca' },
    { key: 'model', header: 'Modelo' },
    { key: 'year', header: 'Año', mono: true },
    { key: 'orders', header: 'Órdenes', render: (m: Motorcycle) => {
      const count = orders.filter(o => o.motorcycleId === m.id).length;
      return <span className="font-mono text-xs text-[#8b949e]">{count}</span>;
    }},
    { key: 'actions', header: '', render: (m: Motorcycle) => (
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="outline" onClick={() => setHistoryMoto({ moto: m, customerName: detailCustomer!.name })}>
          Historial
        </Button>
        <button
          onClick={() => setDeleteConfirm({ customer: detailCustomer!, moto: m })}
          className="text-xs text-[#ef4444]/70 hover:text-[#ef4444] transition-colors px-2"
        >Eliminar</button>
      </div>
    )},
  ];

  const customerColumns = [
    { key: 'idNumber', header: 'Identificación', render: (c: Customer) => (
      <span className="font-mono text-xs">{c.idType} {c.idNumber}</span>
    )},
    { key: 'name', header: 'Nombre / Razón social', render: (c: Customer) => (
      <div className="font-medium text-[#e6edf3]">{c.name}</div>
    )},
    { key: 'contact', header: 'Contacto', render: (c: Customer) => (
      <div>
        <div className="text-xs font-mono">{c.phone}</div>
        <div className="text-xs text-[#6e7681]">{c.email}</div>
      </div>
    )},
    { key: 'motos', header: 'Motos', render: (c: Customer) => (
      <Badge variant="warning">{c.motorcycles.length} moto{c.motorcycles.length !== 1 ? 's' : ''}</Badge>
    )},
    { key: 'actions', header: '', render: (c: Customer) => (
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setDetailCustomer(c)}>Ver</Button>
        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Editar</Button>
        <Button size="sm" variant="outline" onClick={() => openAddMoto(c)}>+ Moto</Button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Clientes y Motocicletas</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-04 · Registro de clientes y vehículos del taller</p>
        </div>
        <Button onClick={openCreate} icon={<span className="text-base leading-none">+</span>}>Nuevo cliente</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Clientes registrados', value: customers.length, color: 'text-[#e6edf3]' },
          { label: 'Motocicletas activas', value: customers.reduce((s, c) => s + c.motorcycles.length, 0), color: 'text-[#f97316]' },
          { label: 'Con historial de servicios', value: customers.filter(c => c.motorcycles.some(m => orders.some(o => o.motorcycleId === m.id))).length, color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, identificación o teléfono..." />
      <DataTable columns={customerColumns} data={filtered} emptyMessage="No se encontraron clientes" />

      {/* Customer Form Modal */}
      <Modal
        title={editingCustomer ? 'Editar cliente' : 'Registrar cliente'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSaveCustomer}
        loading={saving}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo ID *"
              options={idTypes}
              value={form.idType}
              onChange={e => setForm(f => ({ ...f, idType: e.target.value }))}
              error={errors.idType}
            />
            <Input
              label="Número de identificación *"
              value={form.idNumber}
              onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))}
              error={errors.idNumber}
              placeholder="1098765432"
              disabled={!!editingCustomer}
            />
          </div>
          <Input
            label="Nombre / Razón social *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
            placeholder="Juan Carlos Pérez"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Teléfono *"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              error={errors.phone}
              placeholder="3201234567"
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal
        title={detailCustomer?.name ?? ''}
        open={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        width="max-w-2xl"
      >
        {detailCustomer && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#6e7681]">Identificación:</span> <span className="font-mono ml-1">{detailCustomer.idType} {detailCustomer.idNumber}</span></div>
              <div><span className="text-[#6e7681]">Teléfono:</span> <span className="font-mono ml-1">{detailCustomer.phone}</span></div>
              <div className="col-span-2"><span className="text-[#6e7681]">Email:</span> <span className="ml-1">{detailCustomer.email || '—'}</span></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#e6edf3]">Motocicletas ({detailCustomer.motorcycles.length})</h3>
                <Button size="sm" variant="outline" onClick={() => { setMotoCustomer(detailCustomer); setMotoForm(emptyMoto); setMotoErrors({}); setMotoModal(true); }}>
                  + Agregar moto
                </Button>
              </div>
              <DataTable columns={motoColumns} data={detailCustomer.motorcycles} emptyMessage="Sin motocicletas registradas" />
            </div>
          </div>
        )}
      </Modal>

      {/* Moto Form Modal */}
      <Modal
        title={`Registrar motocicleta — ${motoCustomer?.name ?? ''}`}
        open={motoModal}
        onClose={() => setMotoModal(false)}
        onConfirm={handleSaveMoto}
        loading={motoSaving}
        confirmLabel="Registrar moto"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Placa *"
            value={motoForm.plate}
            onChange={e => setMotoForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))}
            error={motoErrors.plate}
            placeholder="BYK456"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Marca *"
              value={motoForm.brand}
              onChange={e => setMotoForm(f => ({ ...f, brand: e.target.value }))}
              error={motoErrors.brand}
              placeholder="Yamaha"
            />
            <Input
              label="Modelo *"
              value={motoForm.model}
              onChange={e => setMotoForm(f => ({ ...f, model: e.target.value }))}
              error={motoErrors.model}
              placeholder="FZ25"
            />
          </div>
          <Input
            label="Año *"
            type="number"
            value={motoForm.year}
            onChange={e => setMotoForm(f => ({ ...f, year: Number(e.target.value) }))}
            error={motoErrors.year}
            placeholder="2022"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Eliminar motocicleta"
        message={`¿Eliminar la motocicleta ${deleteConfirm?.moto.plate} (${deleteConfirm?.moto.brand} ${deleteConfirm?.moto.model})? Esta acción no afecta el historial de órdenes.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDeleteMoto}
        onClose={() => setDeleteConfirm(null)}
      />

      {historyMoto && (
        <MotorcycleHistory
          motorcycle={historyMoto.moto}
          customerName={historyMoto.customerName}
          orders={orders}
          open={!!historyMoto}
          onClose={() => setHistoryMoto(null)}
        />
      )}
    </div>
  );
}
