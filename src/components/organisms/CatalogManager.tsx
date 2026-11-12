import React, { useEffect, useState, useRef } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import ConfirmDialog from '../molecules/ConfirmDialog';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiSession, ApiListResponse, ApiEntityResponse } from '../../lib/api';
import { formatCOP } from '../../lib/orders';
import { canManageCatalog } from '../../lib/roles';
import type { BackendCatalogItem, TratamientoIva, UserRole } from '../../lib/types';

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'service' | 'part';
  price: number;
  ivaTreatment: TratamientoIva;
  taxRate: number;
  active: boolean;
}

const typeOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'service', label: 'Servicio' },
  { value: 'part', label: 'Repuesto' },
];

const formTypeOptions = [
  { value: 'service', label: 'Servicio' },
  { value: 'part', label: 'Repuesto' },
];

const ivaOptions = [
  { value: 'GRAVADO', label: 'Gravado' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'EXCLUIDO', label: 'Excluido' },
];

const taxRateOptions = [
  { value: '19', label: '19% (general)' },
  { value: '5', label: '5% (diferencial)' },
];

type CatalogForm = {
  code: string;
  name: string;
  description: string;
  type: CatalogItem['type'];
  price: number;
  ivaTreatment: TratamientoIva;
  taxRate: number;
};

const empty: CatalogForm = {
  code: '', name: '', description: '', type: 'service', price: 0, ivaTreatment: 'GRAVADO', taxRate: 19,
};

interface Props {
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  session: ApiSession;
  userRole: UserRole;
}

const mapCatalogItem = (item: BackendCatalogItem): CatalogItem => ({
  id: item.id,
  code: item.codigo,
  name: item.nombre,
  description: item.descripcion ?? '',
  type: item.tipo === 'SERVICIO' ? 'service' : 'part',
  price: Number(item.precioVenta),
  ivaTreatment: item.tratamientoIva,
  taxRate: Number(item.tarifaIva),
  active: item.activo,
});

const toBackendType = (type: CatalogItem['type']) => (type === 'service' ? 'SERVICIO' : 'REPUESTO');

export default function CatalogManager({ addToast, session, userRole }: Props) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmToggle, setConfirmToggle] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const canWrite = canManageCatalog(userRole);

  // Solo la ultima busqueda pinta resultados: una respuesta vieja que llegue tarde se descarta.
  const latestLoad = useRef(0);

  // Pinta al instante lo que devolvio el backend y refresca la lista en segundo plano (orden y filtros).
  function showSaved(item: BackendCatalogItem) {
    const saved = mapCatalogItem(item);
    setItems(prev => (prev.some(i => i.id === saved.id) ? prev.map(i => (i.id === saved.id ? saved : i)) : [saved, ...prev]));
    void loadCatalog();
  }

  async function loadCatalog() {
    const loadId = ++latestLoad.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (filterType) params.set('tipo', toBackendType(filterType as CatalogItem['type']));
      if (filterActive !== 'all') params.set('activo', filterActive === 'active' ? 'true' : 'false');

      const response = await apiRequest<ApiListResponse<BackendCatalogItem>>(
        `/catalogo${params.toString() ? `?${params.toString()}` : ''}`,
        session,
      );
      if (loadId !== latestLoad.current) return;
      setItems(response.data.map(mapCatalogItem));
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar el catálogo', type: 'error' });
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }

  // Espera 300 ms a que el usuario deje de escribir antes de consultar.
  useEffect(() => {
    const timer = setTimeout(() => void loadCatalog(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [session.token, search, filterType, filterActive]);

  function openCreate() {
    if (!canWrite) return;
    setEditing(null);
    setForm(empty);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(item: CatalogItem) {
    if (!canWrite) return;
    setEditing(item);
    setForm({
      code: item.code, name: item.name, description: item.description, type: item.type,
      price: item.price, ivaTreatment: item.ivaTreatment, taxRate: item.taxRate,
    });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'El código es obligatorio';
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    if (!form.type) e.type = 'El tipo es obligatorio';
    if (!form.price || form.price <= 0) e.price = 'El precio debe ser mayor a 0';
    if (form.ivaTreatment === 'GRAVADO' && ![19, 5].includes(form.taxRate))
      e.taxRate = 'Un ítem gravado solo admite IVA 19% o 5%';
    if (!editing && items.find(i => i.code.toLowerCase() === form.code.toLowerCase()))
      e.code = 'El código ya existe en el catálogo';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        codigo: form.code,
        nombre: form.name,
        descripcion: form.description || null,
        tipo: toBackendType(form.type),
        precioVenta: form.price,
        tratamientoIva: form.ivaTreatment,
        // El backend exige tarifa 0 para items exentos o excluidos.
        tarifaIva: form.ivaTreatment === 'GRAVADO' ? form.taxRate : 0,
      };

      if (editing) {
        const response = await apiRequest<ApiEntityResponse<BackendCatalogItem>>(`/catalogo/${editing.id}`, session, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showSaved(response.data);
        addToast({ message: 'Elemento actualizado correctamente', type: 'success' });
      } else {
        const response = await apiRequest<ApiEntityResponse<BackendCatalogItem>>('/catalogo', session, {
          method: 'POST',
          body: JSON.stringify({ ...payload, activo: true }),
        });
        showSaved(response.data);
        addToast({ message: 'Elemento registrado en el catálogo', type: 'success' });
      }
      setModalOpen(false);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo guardar el elemento', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!confirmToggle) return;
    try {
      const response = await apiRequest<ApiEntityResponse<BackendCatalogItem>>(`/catalogo/${confirmToggle.id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !confirmToggle.active }),
      });
      showSaved(response.data);
      addToast({ message: confirmToggle.active ? 'Elemento desactivado' : 'Elemento activado', type: 'warning' });
      setConfirmToggle(null);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cambiar el estado', type: 'error' });
    }
  }

  const columns = [
    { key: 'code', header: 'Código', mono: true },
    { key: 'name', header: 'Nombre / Descripción', render: (r: CatalogItem) => (
      <div>
        <div className="font-medium text-[#e6edf3]">{r.name}</div>
        {r.description && <div className="text-xs text-[#6e7681] mt-0.5">{r.description}</div>}
      </div>
    )},
    { key: 'type', header: 'Tipo', render: (r: CatalogItem) => (
      <Badge variant={r.type === 'service' ? 'service' : 'part'}>
        {r.type === 'service' ? 'Servicio' : 'Repuesto'}
      </Badge>
    )},
    { key: 'price', header: 'Precio', render: (r: CatalogItem) => (
      <span className="font-mono text-xs text-[#e6edf3]">{formatCOP(r.price)}</span>
    )},
    { key: 'iva', header: 'IVA', render: (r: CatalogItem) => (
      <span className="font-mono text-xs text-[#8b949e]">
        {r.ivaTreatment === 'GRAVADO' ? `${r.taxRate}%` : r.ivaTreatment.toLowerCase()}
      </span>
    )},
    { key: 'active', header: 'Estado', render: (r: CatalogItem) => (
      <Badge variant={r.active ? 'active' : 'inactive'}>{r.active ? 'Activo' : 'Inactivo'}</Badge>
    )},
    { key: 'actions', header: '', render: (r: CatalogItem) => canWrite ? (
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Editar</Button>
        <Button size="sm" variant={r.active ? 'ghost' : 'outline'} onClick={() => setConfirmToggle(r)}>
          {r.active ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    ) : <span className="text-xs text-[#6e7681]">Solo lectura</span>},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Catálogo de Servicios y Repuestos</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-01 · Gestión del catálogo comercial del taller</p>
        </div>
        {canWrite && <Button onClick={openCreate} icon={<span className="text-base leading-none">+</span>}>Nuevo elemento</Button>}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48"><SearchBar value={search} onChange={setSearch} placeholder="Buscar por código o nombre..." /></div>
        <Select options={typeOptions} value={filterType} onChange={e => setFilterType(e.target.value)} className="w-40" />
        <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-xs">
          {[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterActive(v)}
              className={`whitespace-nowrap px-3 py-2 transition-colors ${filterActive === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total elementos', value: items.length, color: 'text-[#e6edf3]' },
          { label: 'Servicios activos', value: items.filter(i => i.type === 'service' && i.active).length, color: 'text-blue-400' },
          { label: 'Repuestos activos', value: items.filter(i => i.type === 'part' && i.active).length, color: 'text-violet-400' },
          { label: 'Inactivos', value: items.filter(i => !i.active).length, color: 'text-[#6e7681]' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={items} emptyMessage={loading ? 'Cargando catálogo...' : 'No se encontraron elementos'} />

      <Modal
        title={editing ? 'Editar elemento del catálogo' : 'Nuevo elemento del catálogo'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        loading={saving}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Código *"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              error={errors.code}
              placeholder="SRV-001"
              disabled={!!editing}
            />
            <Select
              label="Tipo *"
              options={formTypeOptions}
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as 'service' | 'part' }))}
              error={errors.type}
            />
          </div>
          <Input
            label="Nombre *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
            placeholder="Nombre del servicio o repuesto"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="catalog-description" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Descripción</label>
            <textarea
              id="catalog-description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Descripción opcional..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 transition-colors resize-none"
            />
          </div>
          <Input
            label="Precio de venta (COP) *"
            type="number"
            value={form.price || ''}
            onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
            error={errors.price}
            placeholder="45000"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tratamiento IVA *"
              options={ivaOptions}
              value={form.ivaTreatment}
              onChange={e => setForm(f => ({ ...f, ivaTreatment: e.target.value as TratamientoIva, taxRate: [19, 5].includes(f.taxRate) ? f.taxRate : 19 }))}
            />
            {/* Tarifas vigentes: 19% general (E.T. art. 468) y 5% diferencial; exento/excluido = 0% */}
            <Select
              label="Tarifa IVA (%)"
              options={form.ivaTreatment === 'GRAVADO' ? taxRateOptions : [{ value: '0', label: '0%' }]}
              value={String(form.ivaTreatment === 'GRAVADO' ? form.taxRate : 0)}
              onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))}
              error={errors.taxRate}
              disabled={form.ivaTreatment !== 'GRAVADO'}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.active ? 'Desactivar elemento' : 'Activar elemento'}
        message={confirmToggle?.active
          ? `¿Desactivar "${confirmToggle?.name}"? No podrá usarse en nuevas órdenes, pero permanecerá en el historial.`
          : `¿Activar "${confirmToggle?.name}"? Estará disponible nuevamente para nuevas órdenes.`
        }
        confirmLabel={confirmToggle?.active ? 'Desactivar' : 'Activar'}
        destructive={confirmToggle?.active}
        onConfirm={handleToggle}
        onClose={() => setConfirmToggle(null)}
      />
    </div>
  );
}
