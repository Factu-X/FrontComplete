import React from 'react';
import { canAccessPage, ROLE_LABELS } from '../../lib/roles';
import type { UserRole } from '../../lib/types';

export type Page =
  | 'dashboard' | 'orders' | 'catalog' | 'customers'
  | 'reminders' | 'invoices' | 'credit-notes' | 'receivables' | 'billing-dashboard'
  | 'settings' | 'users' | 'usability' | 'help';

interface NavItem {
  id: Page;
  label: string;
  icon: string;
  group?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈', group: 'main' },
  { id: 'orders', label: 'Órdenes', icon: '⊞', group: 'main' },
  { id: 'customers', label: 'Clientes', icon: '◎', group: 'main' },
  { id: 'catalog', label: 'Catálogo', icon: '≡', group: 'main' },
  { id: 'reminders', label: 'Recordatorios', icon: '◷', group: 'ops' },
  { id: 'invoices', label: 'Facturación', icon: '₡', group: 'ops' },
  { id: 'credit-notes', label: 'Notas Crédito', icon: '↩', group: 'ops' },
  { id: 'receivables', label: 'Cartera', icon: '◑', group: 'ops' },
  { id: 'billing-dashboard', label: 'Resumen Billing', icon: '▤', group: 'ops' },
  { id: 'settings', label: 'Configuración', icon: '⚙', group: 'admin' },
  { id: 'users', label: 'Usuarios', icon: '⊙', group: 'admin' },
  { id: 'usability', label: 'Usabilidad', icon: '◫', group: 'admin' },
  { id: 'help', label: 'Ayuda', icon: '?', group: 'support' },
];

export const PAGE_LABELS = Object.fromEntries(navItems.map(item => [item.id, item.label])) as Record<Page, string>;

const groupLabels: Record<string, string> = {
  main: 'Operación',
  ops: 'Seguimiento',
  admin: 'Administración',
  support: 'Soporte',
};

interface SidebarProps {
  current: Page;
  onNavigate: (p: Page) => void;
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
  orderCount?: number;
  reminderCount?: number;
  configComplete?: boolean;
  pendingReceivables?: number;
  // En pantallas angostas el menú es un cajón que se abre desde la barra superior.
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({
  current, onNavigate, userRole, userName, onLogout,
  orderCount = 0, reminderCount = 0, configComplete = true, pendingReceivables = 0, open, onClose,
}: SidebarProps) {
  const visibleItems = navItems.filter(i => canAccessPage(userRole, i.id));
  const groups = ['main', 'ops', 'admin', 'support'];

  return (
    <>
    {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } shrink-0 bg-[#161b22] border-r border-[#30363d] flex flex-col h-dvh`}
    >
      <div className="px-5 py-5 border-b border-[#30363d]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#f97316] rounded flex items-center justify-center font-bold text-[#0d1117] text-sm">FX</div>
          <div>
            <div className="font-bold text-[#e6edf3] text-base leading-none">FactuX</div>
            <div className="text-[10px] text-[#6e7681] font-mono uppercase tracking-widest mt-0.5">Taller Motos</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar menú" className="ml-auto lg:hidden text-[#6e7681] hover:text-[#e6edf3] text-lg leading-none p-1">✕</button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 flex flex-col gap-0 overflow-y-auto">
        {groups.map(group => {
          const items = visibleItems.filter(i => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="mb-3">
              <div className="px-3 mb-1 text-[10px] font-semibold text-[#6e7681] uppercase tracking-widest">
                {groupLabels[group]}
              </div>
              {items.map(item => {
                const active = current === item.id;
                const badge = item.id === 'orders' ? orderCount
                  : item.id === 'reminders' ? reminderCount
                  : item.id === 'receivables' ? pendingReceivables
                  : item.id === 'settings' && !configComplete ? '!' : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); onClose(); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-sm transition-all text-left mb-0.5 ${
                      active
                        ? 'bg-[#f97316]/15 text-[#f97316] font-semibold'
                        : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]'
                    }`}
                  >
                    <span className={`text-base leading-none ${active ? 'text-[#f97316]' : ''}`}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {badge !== 0 && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        item.id === 'settings' ? 'bg-yellow-500/20 text-yellow-400' :
                        item.id === 'receivables' ? 'bg-yellow-500/20 text-yellow-400' :
                        active ? 'bg-[#f97316]/30 text-[#f97316]' : 'bg-[#21262d] text-[#6e7681]'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#30363d]">
        <div className="px-3 py-2.5 rounded-[6px] bg-[#1c2128]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center text-xs font-bold text-[#f97316]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#e6edf3] truncate">{userName}</div>
              <div className="text-[10px] text-[#6e7681]">{ROLE_LABELS[userRole]}</div>
            </div>
            <button onClick={onLogout} title="Cerrar sesión" className="text-[#6e7681] hover:text-[#ef4444] transition-colors text-sm">⇥</button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
