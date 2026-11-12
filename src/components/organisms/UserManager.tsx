import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import ConfirmDialog from '../molecules/ConfirmDialog';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import { BACKEND_ROLE, ROLE_LABELS, roleFromProfile } from '../../lib/roles';
import type { BackendUsuario, UserRole } from '../../lib/types';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

const roleOptions = (Object.keys(ROLE_LABELS) as UserRole[]).map(value => ({ value, label: ROLE_LABELS[value] }));

const ROLE_BADGE: Record<UserRole, 'admin' | 'billing' | 'operator'> = {
  admin: 'admin',
  billing: 'billing',
  operator: 'operator',
};

type UserForm = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
};

const emptyForm: UserForm = { name: '', email: '', role: 'operator', password: '', confirmPassword: '' };

const mapUser = (usuario: BackendUsuario): User => ({
  id: usuario.id,
  name: usuario.nombre,
  email: usuario.email ?? '',
  role: roleFromProfile(usuario.rol),
  active: usuario.activo,
  createdAt: usuario.createdAt.slice(0, 10),
});

interface Props {
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  session: ApiSession;
  currentUserId: string;
}

export default function UserManager({ addToast, session, currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await apiRequest<ApiListResponse<BackendUsuario>>('/usuarios', session);
      setUsers(response.data.map(mapUser));
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar los usuarios', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [session.token]);

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
    if (form.name.trim().length < 2) e.name = 'El nombre es obligatorio';
    if (!form.email.trim()) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(form.email.trim())) e.email = 'Correo inválido';
    else if (users.find(u => u.email === form.email.trim() && u.id !== editingUser?.id)) e.email = 'Este correo ya está registrado';
    if (!editingUser) {
      if (!form.password) e.password = 'La contraseña es obligatoria';
      else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    }
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      if (editingUser) {
        await apiRequest<ApiEntityResponse<BackendUsuario>>(`/usuarios/${editingUser.id}`, session, {
          method: 'PATCH',
          body: JSON.stringify({
            nombre: form.name.trim(),
            rol: BACKEND_ROLE[form.role],
            ...(form.email.trim() !== editingUser.email ? { email: form.email.trim() } : {}),
          }),
        });
        addToast({ message: 'Usuario actualizado correctamente', type: 'success' });
      } else {
        await apiRequest<ApiEntityResponse<BackendUsuario>>('/usuarios', session, {
          method: 'POST',
          body: JSON.stringify({
            nombre: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            rol: BACKEND_ROLE[form.role],
          }),
        });
        addToast({ message: 'Usuario creado. Ya puede iniciar sesión.', type: 'success' });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo guardar el usuario', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!confirmToggle) return;
    try {
      await apiRequest<ApiEntityResponse<BackendUsuario>>(`/usuarios/${confirmToggle.id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !confirmToggle.active }),
      });
      addToast({
        message: confirmToggle.active ? `Cuenta de ${confirmToggle.name} desactivada` : `Cuenta de ${confirmToggle.name} activada`,
        type: confirmToggle.active ? 'warning' : 'success',
      });
      setConfirmToggle(null);
      await loadUsers();
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cambiar el estado', type: 'error' });
    }
  }

  const columns = [
    { key: 'name', header: 'Usuario', render: (u: User) => (
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${u.active ? 'bg-[#f97316]/20 border-[#f97316]/30 text-[#f97316]' : 'bg-[#30363d]/50 border-[#30363d] text-[#6e7681]'}`}>
          {u.name.charAt(0)}
        </div>
        <div>
          <div className="font-medium text-[#e6edf3]">{u.name}{u.id === currentUserId && <span className="text-xs text-[#6e7681]"> (tú)</span>}</div>
          <div className="text-xs text-[#6e7681]">{u.email || '—'}</div>
        </div>
      </div>
    )},
    { key: 'role', header: 'Rol', render: (u: User) => (
      <Badge variant={ROLE_BADGE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
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
        {u.id !== currentUserId && (
          <Button size="sm" variant={u.active ? 'ghost' : 'outline'} onClick={() => setConfirmToggle(u)}>
            {u.active ? 'Desactivar' : 'Activar'}
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
          { label: 'Facturación / Operarios', value: users.filter(u => u.role !== 'admin' && u.active).length, color: 'text-sky-400' },
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
          Las cuentas se gestionan en Supabase Auth. Los usuarios desactivados no pueden usar el sistema, pero su información histórica se conserva.
        </div>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage={loading ? 'Cargando usuarios...' : 'No se encontraron usuarios'} />

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
            onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
            disabled={editingUser?.id === currentUserId}
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
          ? `¿Desactivar la cuenta de "${confirmToggle?.name}"? No podrá usar el sistema, pero su historial se conserva.`
          : `¿Activar la cuenta de "${confirmToggle?.name}"? Podrá usar el sistema nuevamente.`
        }
        confirmLabel={confirmToggle?.active ? 'Desactivar' : 'Activar'}
        destructive={confirmToggle?.active}
        onConfirm={handleToggle}
        onClose={() => setConfirmToggle(null)}
      />
    </div>
  );
}
