import type { BackendRol, UserRole } from './types';

// Debe reflejar los requireRole del backend; el backend sigue siendo quien autoriza.
const ROLE_BY_BACKEND: Record<BackendRol, UserRole> = {
  ADMINISTRADOR: 'admin',
  FACTURACION: 'billing',
  OPERADOR: 'operator',
};

export const BACKEND_ROLE: Record<UserRole, BackendRol> = {
  admin: 'ADMINISTRADOR',
  billing: 'FACTURACION',
  operator: 'OPERADOR',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  billing: 'Facturación',
  operator: 'Operario',
};

export const roleFromProfile = (rol: BackendRol): UserRole => ROLE_BY_BACKEND[rol];

const PAGES_BY_ROLE: Record<UserRole, readonly string[] | 'all'> = {
  admin: 'all',
  billing: [
    'dashboard', 'orders', 'customers', 'catalog', 'reminders', 'invoices',
    'credit-notes', 'receivables', 'billing-dashboard', 'settings', 'help',
  ],
  operator: ['dashboard', 'orders', 'help'],
};

export const canAccessPage = (role: UserRole, page: string) => {
  const pages = PAGES_BY_ROLE[role];
  return pages === 'all' || pages.includes(page);
};

export const canManageCustomers = (role: UserRole) => role !== 'operator';
export const canManageCatalog = (role: UserRole) => role === 'admin';
export const canCreateOrders = (role: UserRole) => role !== 'operator';
export const canCancelOrders = (role: UserRole) => role !== 'operator';
// HU-13: Facturacion consulta la numeracion pero solo el administrador modifica la configuracion.
export const canEditSettings = (role: UserRole) => role === 'admin';
export const canInvoice = (role: UserRole) => role !== 'operator';
