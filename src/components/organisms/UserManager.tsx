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

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  active: boolean;
  createdAt: string;
}

const initialUsers: User[] = [
  { id: 1, name: 'Carlos Administrador', email: 'admin@factux.co', role: 'admin', active: true, createdAt: '2025-01-10' },
  { id: 2, name: 'Pedro Mecánico', email: 'pedro.mecanico@factux.co', role: 'operator', active: true, createdAt: '2025-02-15' },
  { id: 3, name: 'Ana Recepción', email: 'ana.recepcion@factux.co', role: 'operator', active: true, createdAt: '2025-03-22' },
  { id: 4, name: 'Luis Antiguo', email: 'luis.antiguo@factux.co', role: 'operator', active: false, createdAt: '2024-08-01' },
];

const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operator', label: 'Operador' },
];

const emptyForm = { name: '', email: '', role: 'operator' as const, password: '', confirmPassword: '' };

interface Props { addToast: (t: Omit<ToastItem, 'id'>) => void; }

export default function UserManager({ addToast }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: '', confirmPassword: '' });
    setErrors({});
    setModalOpen(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    if (!form.email.trim()) e.email = 'El correo es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Correo inválido';
    if (!editingUser) {
      if (users.find(u => u.email === form.email.trim())) e.email = 'Este correo ya está registrado';
      if (!form.password) e.password = 'La contraseña es obligatoria';
      else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    }
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      if (editingUser) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: form.name, email: form.email, role: form.role } : u));
        addToast({ message: 'Usuario actualizado correctamente', type: 'success' });
      } else {
        const newUser: User = {
          id: Date.now(), name: form.name, email: form.email,
          role: form.role, active: true, createdAt: new Date().toISOString().slice(0, 10),
        };
        setUsers(prev => [...prev, newUser]);
        addToast({ message: 'Usuario creado. Contraseña almacenada de forma segura.', type: 'success' });
      }
      setSaving(false);
      setModalOpen(false);
    }, 500);
  }

  function handleToggle() {
    if (!confirmToggle) return;
    setUsers(prev => prev.map(u => u.id === confirmToggle.id ? { ...u, active: !u.active } : u));
    addToast({
      message: confirmToggle.active ? `Cuenta de ${confirmToggle.name} desactivada` : `Cuenta de ${confirmToggle.name} activada`,
      type: confirmToggle.active ? 'warning' : 'success',
    });
    setConfirmToggle(null);
  }

  const columns = [
    { key: 'name', header: 'Usuario', render: (u: User) => (
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${u.active ? 'bg-[#f97316]/20 border-[#f97316]/30 text-[#f97316]' : 'bg-[#30363d]/50 border-[#30363d] text-[#6e7681]'}`}>
          {u.name.charAt(0)}
        </div>
        <div>
          <div className="font-medium text-[#e6edf3]">{u.name}</div>
          <div className="text-xs text-[#6e7681]">{u.email}</div>
        </div>
      </div>
    )},
    { key: 'role', header: 'Rol', render: (u: User) => (
      <Badge variant={u.role === 'admin' ? 'admin' : 'operator'}>
        {u.role === 'admin' ? 'Administrador' : 'Operador'}
      </Badge>
    )},
    { key: 'active', header: 'Estado', render: (u: User) => (
      <Badge variant={u.active ? 'active' : 'inactive'}>{u.active ? 'Activo' : 'Inactivo'}</Badge>
    )},
    { key: 'createdAt', header: 'Creado', mono: true, render: (u: User) => (
      <span className="font-mono text-xs text-[#6e7681]">{u.createdAt}</span>
    )},
    { key: 'actions', header: '', render: (u: User) => (
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Editar</Button>
        <Button size="sm" variant={u.active ? 'ghost' : 'outline'} onClick={() => setConfirmToggle(u)}>
          {u.active ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Gestión de Usuarios</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-12 · Control de acceso y roles del sistema</p>
        </div>
        <Button onClick={openCreate} icon={<span className="text-base leading-none">+</span>}>Nuevo usuario</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total usuarios', value: users.length, color: 'text-[#e6edf3]' },
          { label: 'Administradores', value: users.filter(u => u.role === 'admin' && u.active).length, color: 'text-[#f97316]' },
          { label: 'Operadores activos', value: users.filter(u => u.role === 'operator' && u.active).length, color: 'text-sky-400' },
          { label: 'Desactivados', value: users.filter(u => !u.active).length, color: 'text-[#6e7681]' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o correo..." />

      <div className="bg-[#1c2128]/60 border border-[#f97316]/20 rounded-[6px] px-4 py-3 flex items-start gap-3 text-sm">
        <span className="text-[#f97316] mt-0.5">⚠</span>
        <div className="text-[#8b949e]">
          Las contraseñas se almacenan con hash seguro (bcrypt). Los usuarios desactivados no pueden iniciar sesión pero su información histórica se conserva.
        </div>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No se encontraron usuarios" />

      <Modal
        title={editingUser ? 'Editar usuario' : 'Registrar usuario'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSave}
        loading={saving}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre completo *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
            placeholder="Carlos Rodríguez"
          />
          <Input
            label="Correo electrónico *"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            error={errors.email}
            placeholder="usuario@factux.co"
          />
          <Select
            label="Rol *"
            options={roleOptions}
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'operator' }))}
          />
          {!editingUser && (
            <>
              <Input
                label="Contraseña * (mínimo 8 caracteres)"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                error={errors.password}
                placeholder="••••••••"
              />
              <Input
                label="Confirmar contraseña *"
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                error={errors.confirmPassword}
                placeholder="••••••••"
              />
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.active ? 'Desactivar usuario' : 'Activar usuario'}
        message={confirmToggle?.active
          ? `¿Desactivar la cuenta de "${confirmToggle?.name}"? No podrá iniciar sesión, pero su historial se conserva.`
          : `¿Activar la cuenta de "${confirmToggle?.name}"? Podrá iniciar sesión nuevamente.`
        }
        confirmLabel={confirmToggle?.active ? 'Desactivar' : 'Activar'}
        destructive={confirmToggle?.active}
        onConfirm={handleToggle}
        onClose={() => setConfirmToggle(null)}
      />
    </div>
  );
}
