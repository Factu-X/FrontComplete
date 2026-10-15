import React, { useEffect, useState } from 'react';
import { apiRequest, ApiListResponse, ApiSession } from '../../lib/api';
import { formatCOP, STATUS_LABELS } from '../../lib/orders';
import { canAccessPage, canCreateOrders } from '../../lib/roles';
import type { BackendCatalogItem, BackendCliente, BackendOrden, UserRole } from '../../lib/types';

interface DashboardPageProps {
  userRole: UserRole;
  userName: string;
  onNavigate: (p: string) => void;
  session: ApiSession;
}

export default function DashboardPage({ userRole, userName, onNavigate, session }: DashboardPageProps) {
  const [orders, setOrders] = useState<BackendOrden[]>([]);
  const [customers, setCustomers] = useState<BackendCliente[]>([]);
  const [catalog, setCatalog] = useState<BackendCatalogItem[]>([]);

  useEffect(() => {
    // Cada KPI es independiente: si un endpoint falla, los demás se siguen mostrando.
    apiRequest<ApiListResponse<BackendOrden>>('/ordenes', session).then(r => setOrders(r.data)).catch(() => undefined);
    apiRequest<ApiListResponse<BackendCliente>>('/clientes', session).then(r => setCustomers(r.data)).catch(() => undefined);
    apiRequest<ApiListResponse<BackendCatalogItem>>('/catalogo?activo=true', session).then(r => setCatalog(r.data)).catch(() => undefined);
  }, [session.token]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const openOrders = orders.filter(o => o.estado === 'ABIERTA' || o.estado === 'EN_PROCESO');
  const finishedOrders = orders.filter(o => o.estado === 'FINALIZADA');
  const totalRevenue = finishedOrders.reduce((s, o) => s + Number(o.total), 0);
  // El backend ya ordena por fecha de ingreso descendente.
  const recentOrders = orders.slice(0, 5);

  const statusColor: Record<string, string> = {
    ABIERTA: 'text-emerald-400',
    EN_PROCESO: 'text-yellow-400',
    FINALIZADA: 'text-blue-400',
    CANCELADA: 'text-[#6e7681]',
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">{greeting}, {userName.split(' ')[0]}</h1>
        <p className="text-sm text-[#6e7681] mt-0.5">Panel de control · FactuX Taller Motos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Órdenes abiertas', value: openOrders.length, sub: 'requieren atención', accent: '#f97316', icon: '⊞', page: 'orders' },
          { label: 'Clientes registrados', value: customers.filter(c => c.activo).length, sub: 'clientes activos', accent: '#34d399', icon: '◎', page: 'customers' },
          { label: 'Catálogo activo', value: catalog.length, sub: 'servicios y repuestos', accent: '#60a5fa', icon: '≡', page: 'catalog' },
          { label: 'Ingresos finalizados', value: formatCOP(totalRevenue), sub: `${finishedOrders.length} órdenes`, accent: '#a78bfa', icon: '₡', page: 'orders' },
        ].filter(kpi => canAccessPage(userRole, kpi.page)).map(kpi => (
          <button
            key={kpi.label}
            onClick={() => onNavigate(kpi.page)}
            className="bg-[#161b22] border border-[#30363d] hover:border-[#f97316]/30 rounded-[8px] p-5 flex flex-col gap-3 text-left transition-all hover:bg-[#1c2128] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#6e7681] uppercase tracking-wider">{kpi.label}</span>
              <span className="text-lg" style={{ color: kpi.accent }}>{kpi.icon}</span>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono leading-none" style={{ color: kpi.accent }}>{kpi.value}</div>
              <div className="text-xs text-[#6e7681] mt-1">{kpi.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Open orders alert */}
      {openOrders.length > 0 && (
        <div
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-3 px-4 py-3 bg-[#f97316]/10 border border-[#f97316]/25 rounded-[6px] cursor-pointer hover:bg-[#f97316]/15 transition-colors"
        >
          <span className="text-[#f97316] text-lg">⚠</span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-[#f97316]">{openOrders.length} orden{openOrders.length > 1 ? 'es' : ''} activa{openOrders.length > 1 ? 's' : ''}</span>
            <span className="text-sm text-[#8b949e] ml-2">pendiente{openOrders.length > 1 ? 's' : ''} de atención</span>
          </div>
          <span className="text-xs text-[#f97316]">Ver órdenes →</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider">Órdenes recientes</h2>
            <button onClick={() => onNavigate('orders')} className="text-xs text-[#f97316] hover:underline">Ver todas</button>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] divide-y divide-[#30363d]/60">
            {recentOrders.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[#6e7681]">Sin órdenes registradas</div>
            )}
            {recentOrders.map(o => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1c2128]/60 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#f97316]">{o.numero}</span>
                    <span className={`text-xs font-medium ${statusColor[o.estado]}`}>{STATUS_LABELS[o.estado]}</span>
                  </div>
                  <div className="text-xs text-[#6e7681] truncate">{o.cliente?.nombreRazonSocial} · {o.motocicleta?.placa}</div>
                </div>
                <span className="font-mono text-xs text-[#8b949e] shrink-0">{formatCOP(o.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Acciones rápidas</h2>
          <div className="flex flex-col gap-2">
            {[
              canCreateOrders(userRole)
                ? { label: 'Nueva orden de servicio', desc: 'Registrar atención a un vehículo', page: 'orders', color: '#f97316' }
                : { label: 'Trabajar órdenes', desc: 'Actualizar estado, servicios y repuestos', page: 'orders', color: '#f97316' },
              { label: 'Registrar cliente', desc: 'Agregar cliente y motocicleta', page: 'customers', color: '#34d399' },
              { label: 'Actualizar catálogo', desc: 'Servicios y repuestos', page: 'catalog', color: '#60a5fa' },
              { label: 'Gestionar usuarios', desc: 'Control de acceso y roles', page: 'users', color: '#a78bfa' },
            ].filter(action => canAccessPage(userRole, action.page)).map(action => (
              <button
                key={action.page + action.label}
                onClick={() => onNavigate(action.page)}
                className="bg-[#161b22] border border-[#30363d] hover:border-[#f97316]/30 rounded-[6px] px-4 py-3 text-left transition-all hover:bg-[#1c2128] flex items-center gap-3 group"
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: action.color }} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#e6edf3]">{action.label}</div>
                  <div className="text-xs text-[#6e7681]">{action.desc}</div>
                </div>
                <span className="text-[#30363d] group-hover:text-[#f97316] transition-colors">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
