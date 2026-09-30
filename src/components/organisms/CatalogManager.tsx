import React, { useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import ConfirmDialog from '../molecules/ConfirmDialog';
import { ToastItem } from '../molecules/ToastContainer';
import { CatalogItem } from '../../types';

const typeOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'service', label: 'Servicio' },
  { value: 'part', label: 'Repuesto' },
];

const formTypeOptions = [
  { value: 'service', label: 'Servicio' },
  { value: 'part', label: 'Repuesto' },
];

const emptyForm = { code: '', name: '', description: '', type: 'service' as 'service' | 'part', price: 0 };

interface Props {
  catalog: CatalogItem[];
  setCatalog: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function CatalogManager({ catalog, setCatalog, addToast }: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmToggle, setConfirmToggle] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = catalog.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
    const matchType = !filterType || i.type === filterType;
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? i.active : !i.active);
    return matchSearch && matchType && matchActive;
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(item: CatalogItem) {
    setEditing(item);
    setForm({ code: item.code, name: item.name, description: item.description, type: item.type, price: item.price });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'El código es obligatorio';
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    if (!form.type) e.type = 'El tipo es obligatorio';
    if (!form.price || form.price <= 0) e.price = 'El precio debe ser mayor a 0';
    if (!editing && catalog.find(i => i.code.toLowerCase() === form.code.toLowerCase()))
      e.code = 'El código ya existe en el catálogo';
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      if (editing) {
        setCatalog(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
        addToast({ message: 'Elemento actualizado correctamente', type: 'success' });
      } else {
        setCatalog(prev => [...prev, { ...form, id: Date.now(), active: true }]);
        addToast({ message: 'Elemento registrado en el catálogo', type: 'success' });
      }
      setSaving(false);
      setModalOpen(false);
    }, 600);
  }

  function handleToggle() {
    if (!confirmToggle) return;
    setCatalog(prev => prev.map(i => i.id === confirmToggle.id ? { ...i, active: !i.active } : i));
    addToast({ message: confirmToggle.active ? 'Elemento desactivado' : 'Elemento activado', type: 'warning' });
    setConfirmToggle(null);
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

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
      <span className="font-mono text-xs text-[#e6edf3]">{fmt(r.price)}</span>
    )},
    { key: 'active', header: 'Estado', render: (r: CatalogItem) => (
      <Badge variant={r.active ? 'active' : 'inactive'}>{r.active ? 'Activo' : 'Inactivo'}</Badge>
    )},
    { key: 'actions', header: '', render: (r: CatalogItem) => (
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Editar</Button>
        <Button size="sm" variant={r.active ? 'ghost' : 'outline'} onClick={() => setConfirmToggle(r)}>
          {r.active ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Catálogo de Servicios y Repuestos</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-01 · Gestión del catálogo comercial del taller</p>
        </div>
        <Button onClick={openCreate} icon={<span className="text-base leading-none">+</span>}>Nuevo elemento</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48"><SearchBar value={search} onChange={setSearch} placeholder="Buscar por código o nombre..." /></div>
        <Select options={typeOptions} value={filterType} onChange={e => setFilterType(e.target.value)} className="w-40" />
        <div className="flex rounded-[6px] border border-[#30363d] overflow-hidden text-xs">
          {[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterActive(v)}
              className={`px-3 py-2 transition-colors ${filterActive === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total elementos', value: catalog.length, color: 'text-[#e6edf3]' },
          { label: 'Servicios activos', value: catalog.filter(i => i.type === 'service' && i.active).length, color: 'text-blue-400' },
          { label: 'Repuestos activos', value: catalog.filter(i => i.type === 'part' && i.active).length, color: 'text-violet-400' },
          { label: 'Inactivos', value: catalog.filter(i => !i.active).length, color: 'text-[#6e7681]' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No se encontraron elementos" />

      <Modal
        title={editing ? 'Editar elemento del catálogo' : 'Nuevo elemento del catálogo'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        loading={saving}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
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
            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Descripción</label>
            <textarea
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
