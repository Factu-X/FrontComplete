import React, { useEffect, useState, useRef } from 'react';
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
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import type { BackendCliente, BackendMotocicleta } from '../../lib/types';
import { isValidMotorcyclePlate, normalizeMotorcyclePlate } from '../../lib/plates';

interface Motorcycle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  active: boolean;
}

interface Customer {
  id: string;
  idType: string;
  idNumber: string;
  name: string;
  phone: string;
  email: string;
  motorcycles: Motorcycle[];
}

const idTypes = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const emptyCustomer = { idType: 'CC', idNumber: '', name: '', phone: '', email: '' };
const emptyMoto = { plate: '', brand: '', model: '', year: new Date().getFullYear() };

interface Props {
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  session: ApiSession;
}

const mapMoto = (moto: BackendMotocicleta): Motorcycle => ({
  id: moto.id,
  plate: moto.placa,
  brand: moto.marca,
  model: moto.modelo,
  year: moto.anio,
  active: moto.activa,
});

const mapCustomer = (customer: BackendCliente, motorcycles: Motorcycle[]): Customer => ({
  id: customer.id,
  idType: customer.tipoIdentificacion,
  idNumber: customer.numeroIdentificacion,
  name: customer.nombreRazonSocial,
  phone: customer.telefono ?? '',
  email: customer.email ?? '',
  motorcycles,
});

export default function CustomerManager({ addToast, session }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [historyMoto, setHistoryMoto] = useState<{ moto: Motorcycle; customerName: string } | null>(null);

  const [editingMoto, setEditingMoto] = useState<Motorcycle | null>(null);

  const activePlates = customers.flatMap(c => c.motorcycles.filter(m => m.active).map(m => m.plate));

  // Solo la ultima busqueda pinta resultados: una respuesta vieja que llegue tarde se descarta.
  const latestLoad = useRef(0);

  async function loadCustomers() {
    const loadId = ++latestLoad.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());

      const response = await apiRequest<ApiListResponse<BackendCliente>>(
        `/clientes${params.toString() ? `?${params.toString()}` : ''}`,
        session,
      );

      if (loadId !== latestLoad.current) return;
      const hydrated = response.data.map(customer => mapCustomer(customer, (customer.motocicletas ?? []).map(mapMoto)));

      setCustomers(hydrated);
      if (detailCustomer) {
        setDetailCustomer(hydrated.find(customer => customer.id === detailCustomer.id) ?? null);
      }
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar clientes', type: 'error' });
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }

  // Espera 300 ms a que el usuario deje de escribir antes de consultar.
  useEffect(() => {
    const timer = setTimeout(() => void loadCustomers(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [session.token, search]);

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

  async function handleSaveCustomer() {
    const e = validateCustomer();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        tipoIdentificacion: form.idType,
        numeroIdentificacion: form.idNumber,
        nombreRazonSocial: form.name,
        telefono: form.phone || null,
        email: form.email || null,
        activo: true,
      };

      // Pinta al instante lo que devolvio el backend; la recarga en segundo plano ajusta orden y filtros.
      if (editingCustomer) {
        const response = await apiRequest<ApiEntityResponse<BackendCliente>>(`/clientes/${editingCustomer.id}`, session, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        const saved = mapCustomer(response.data, editingCustomer.motorcycles);
        setCustomers(prev => prev.map(c => (c.id === saved.id ? saved : c)));
        addToast({ message: 'Cliente actualizado correctamente', type: 'success' });
      } else {
        const response = await apiRequest<ApiEntityResponse<BackendCliente>>('/clientes', session, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setCustomers(prev => [mapCustomer(response.data, []), ...prev]);
        addToast({ message: 'Cliente registrado exitosamente', type: 'success' });
      }
      setModalOpen(false);
      void loadCustomers();
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo guardar el cliente', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function openAddMoto(c: Customer) {
    setMotoCustomer(c);
    setEditingMoto(null);
    setMotoForm(emptyMoto);
    setMotoErrors({});
    setMotoModal(true);
  }

  function openEditMoto(c: Customer, m: Motorcycle) {
    setMotoCustomer(c);
    setEditingMoto(m);
    setMotoForm({ plate: m.plate, brand: m.brand, model: m.model, year: m.year ?? new Date().getFullYear() });
    setMotoErrors({});
    setMotoModal(true);
  }

  function validateMoto() {
    const e: Record<string, string> = {};
    if (!motoForm.plate.trim()) e.plate = 'La placa es obligatoria';
    if (!motoForm.brand.trim()) e.brand = 'La marca es obligatoria';
    if (!motoForm.model.trim()) e.model = 'El modelo es obligatorio';
    if (!motoForm.year || motoForm.year < 1990 || motoForm.year > new Date().getFullYear() + 1) e.year = 'Año inválido';
    const plateUp = normalizeMotorcyclePlate(motoForm.plate);
    if (plateUp && !isValidMotorcyclePlate(plateUp)) e.plate = 'La placa debe tener formato AAA00A';
    if (!editingMoto && activePlates.some(p => p === plateUp)) e.plate = 'Esta placa ya está registrada en una moto activa';
    return e;
  }

  async function handleSaveMoto() {
    const e = validateMoto();
    if (Object.keys(e).length) { setMotoErrors(e); return; }
    if (!motoCustomer) return;
    setMotoSaving(true);
    try {
      const descriptive = { marca: motoForm.brand, modelo: motoForm.model, anio: motoForm.year };
      if (editingMoto) {
        await apiRequest<ApiEntityResponse<BackendMotocicleta>>(`/motocicletas/${editingMoto.id}`, session, {
          method: 'PATCH',
          body: JSON.stringify(descriptive),
        });
        addToast({ message: `Motocicleta ${editingMoto.plate} actualizada`, type: 'success' });
      } else {
        const response = await apiRequest<ApiEntityResponse<BackendMotocicleta>>(
          `/clientes/${motoCustomer.id}/motocicletas`,
          session,
          { method: 'POST', body: JSON.stringify({ ...descriptive, placa: motoForm.plate, activa: true }) },
        );
        addToast({ message: `Motocicleta ${response.data.placa} registrada`, type: 'success' });
      }
      setMotoModal(false);
      void loadCustomers();
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo guardar la motocicleta', type: 'error' });
    } finally {
      setMotoSaving(false);
    }
  }

  async function handleDeleteMoto() {
    if (!deleteConfirm) return;
    const { moto } = deleteConfirm;
    try {
      await apiRequest<ApiEntityResponse<BackendMotocicleta>>(`/motocicletas/${moto.id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({ activa: false }),
      });
      addToast({ message: `Motocicleta ${moto.plate} desactivada`, type: 'warning' });
      setDeleteConfirm(null);
      void loadCustomers();
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo desactivar la motocicleta', type: 'error' });
    }
  }

  const motoColumns = [
    { key: 'plate', header: 'Placa', mono: true },
    { key: 'brand', header: 'Marca' },
    { key: 'model', header: 'Modelo' },
    { key: 'year', header: 'Año', mono: true },
    { key: 'active', header: 'Estado', render: (m: Motorcycle) => (
      <Badge variant={m.active ? 'active' : 'inactive'}>{m.active ? 'Activa' : 'Inactiva'}</Badge>
    )},
    { key: 'actions', header: '', render: (m: Motorcycle) => (
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="outline" onClick={() => setHistoryMoto({ moto: m, customerName: detailCustomer!.name })}>
          Historial
        </Button>
        <Button size="sm" variant="ghost" onClick={() => openEditMoto(detailCustomer!, m)}>Editar</Button>
        {m.active && (
          <button
            onClick={() => setDeleteConfirm({ customer: detailCustomer!, moto: m })}
            className="text-xs text-[#ef4444]/70 hover:text-[#ef4444] transition-colors px-2"
          >Desactivar</button>
        )}
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
      <div className="flex flex-wrap items-start justify-between gap-4">
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
          { label: 'Promedio motos/cliente', value: (customers.reduce((s, c) => s + c.motorcycles.length, 0) / customers.length || 0).toFixed(1), color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, identificación o teléfono..." />
      <DataTable columns={customerColumns} data={filtered} emptyMessage={loading ? 'Cargando clientes...' : 'No se encontraron clientes'} />

      {/* Customer Form Modal */}
      <Modal
        title={editingCustomer ? 'Editar cliente' : 'Registrar cliente'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSaveCustomer}
        loading={saving}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        title={`${detailCustomer?.name ?? ''}`}
        open={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        width="max-w-2xl"
      >
        {detailCustomer && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-[#6e7681]">Identificación:</span> <span className="font-mono ml-1">{detailCustomer.idType} {detailCustomer.idNumber}</span></div>
              <div><span className="text-[#6e7681]">Teléfono:</span> <span className="font-mono ml-1">{detailCustomer.phone}</span></div>
              <div className="col-span-2"><span className="text-[#6e7681]">Email:</span> <span className="ml-1">{detailCustomer.email || '—'}</span></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#e6edf3]">Motocicletas ({detailCustomer.motorcycles.length})</h3>
                <Button size="sm" variant="outline" onClick={() => openAddMoto(detailCustomer)}>+ Agregar moto</Button>
              </div>
              <DataTable columns={motoColumns} data={detailCustomer.motorcycles} emptyMessage="Sin motocicletas registradas" />
            </div>
          </div>
        )}
      </Modal>

      {/* Moto Form Modal */}
      <Modal
        title={`${editingMoto ? 'Editar' : 'Registrar'} motocicleta — ${motoCustomer?.name ?? ''}`}
        open={motoModal}
        onClose={() => setMotoModal(false)}
        onConfirm={handleSaveMoto}
        loading={motoSaving}
        confirmLabel={editingMoto ? 'Guardar cambios' : 'Registrar moto'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Placa *"
            value={motoForm.plate}
            onChange={e => setMotoForm(f => ({ ...f, plate: normalizeMotorcyclePlate(e.target.value) }))}
            error={motoErrors.plate}
            placeholder="ABC12D"
            disabled={!!editingMoto}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        message={`¿Desactivar la motocicleta ${deleteConfirm?.moto.plate} (${deleteConfirm?.moto.brand} ${deleteConfirm?.moto.model})? Esta acción conserva el historial de órdenes.`}
        confirmLabel="Desactivar"
        destructive
        onConfirm={handleDeleteMoto}
        onClose={() => setDeleteConfirm(null)}
      />

      {historyMoto && (
        <MotorcycleHistory
          motorcycle={historyMoto.moto}
          customerName={historyMoto.customerName}
          session={session}
          addToast={addToast}
          open={!!historyMoto}
          onClose={() => setHistoryMoto(null)}
        />
      )}
    </div>
  );
}
