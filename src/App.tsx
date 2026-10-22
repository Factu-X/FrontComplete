import React, { useState, useCallback, useEffect } from 'react';
import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import HelpPage from './components/pages/HelpPage';
import CatalogManager from './components/organisms/CatalogManager';
import CustomerManager from './components/organisms/CustomerManager';
import OrderManager from './components/organisms/OrderManager';
import RemindersManager from './components/organisms/RemindersManager';
import InvoiceManager from './components/organisms/InvoiceManager';
import CreditNoteManager from './components/organisms/CreditNoteManager';
import AccountsReceivable from './components/organisms/AccountsReceivable';
import BillingDashboard from './components/organisms/BillingDashboard';
import CompanyConfigPage from './components/organisms/CompanyConfig';
import UserManager from './components/organisms/UserManager';
import UsabilityTest from './components/organisms/UsabilityTest';
import Sidebar, { Page, PAGE_LABELS } from './components/organisms/Sidebar';
import ToastContainer, { ToastItem } from './components/molecules/ToastContainer';
import DemoNotice from './components/molecules/DemoNotice';
import { apiRequest, setUnauthorizedHandler } from './lib/api';
import { supabase } from './lib/supabase';
import { canAccessPage, ROLE_LABELS, roleFromProfile } from './lib/roles';
import type { AuthUser, BackendCartera, BackendConfiguracion, BackendProfile } from './lib/types';
import { Customer, Reminder, UsabilitySession } from './types';
import {
  initialCustomers, initialReminders, initialUsabilitySessions,
} from './data/initialData';

type AuthState = { user: AuthUser; token: string } | null;

export default function App() {
  const [auth, setAuth] = useState<AuthState>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // shortcut: recordatorios (HU-11) y usabilidad (HU-14) siguen con datos de prueba y se marcan con
  // DemoNotice; conectarlos cuando exista su API. Todo lo demás ya usa la API.
  const [mockCustomers] = useState<Customer[]>(initialCustomers);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [menuOpen, setMenuOpen] = useState(false);
  const [configComplete, setConfigComplete] = useState(true);
  const [overdueInvoices, setOverdueInvoices] = useState(0);
  const [usabilitySessions, setUsabilitySessions] = useState<UsabilitySession[]>(initialUsabilitySessions);

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
  }, []);

  // Si el backend rechaza el token (vencido o revocado) se cierra la sesión una sola vez.
  useEffect(() => {
    if (!auth) return;
    let handled = false;
    setUnauthorizedHandler(() => {
      if (handled) return;
      handled = true;
      addToast({ message: 'Tu sesión venció. Inicia sesión de nuevo.', type: 'warning' });
      supabase.auth.signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [auth?.user.id, addToast]);

  // El número junto a "Cartera" son las facturas vencidas reales (HU-10).
  const refreshOverdue = useCallback((token: string) => {
    apiRequest<{ data: BackendCartera }>('/cartera?filtro=VENCIDAS', { token })
      .then(response => setOverdueInvoices(response.data.resumen.facturasVencidas))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!auth || auth.user.role === 'operator') return;
    refreshOverdue(auth.token);
  }, [auth?.token, auth?.user.role, refreshOverdue]);

  // El aviso del menú refleja la configuración real (HU-13); el operario no la consulta.
  useEffect(() => {
    if (!auth || auth.user.role === 'operator') return;
    apiRequest<{ data: BackendConfiguracion }>('/configuracion', { token: auth.token })
      .then(response => setConfigComplete(response.data.estado.puedeEmitir))
      .catch(() => setConfigComplete(false));
  }, [auth?.token, auth?.user.role]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Restaura la sesión de Supabase al cargar y mantiene el token actualizado
  useEffect(() => {
    let active = true;

    async function loadProfile(token: string, email: string) {
      const profile = await apiRequest<{ data: BackendProfile }>('/auth/me', { token });
      if (!active) return;
      setAuth({
        token,
        user: { id: profile.data.id, email, name: profile.data.nombre, role: roleFromProfile(profile.data.rol) },
      });
    }

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const email = data.session?.user.email;
        if (token && email) await loadProfile(token, email);
      } catch {
        await supabase.auth.signOut();
      } finally {
        if (active) setCheckingSession(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuth(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setAuth(prev => (prev ? { ...prev, token: session.access_token } : prev));
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function handleLogin(user: AuthUser, token: string) {
    setAuth({ user, token });
    setPage('dashboard');
    addToast({ message: `Bienvenido a FactuX — ${ROLE_LABELS[user.role]}`, type: 'success' });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuth(null);
    setPage('dashboard');
  }

  if (checkingSession) {
    return (
      <div className="min-h-dvh bg-[#0d1117] flex items-center justify-center text-[#8b949e] text-sm">
        Validando sesión...
      </div>
    );
  }

  if (!auth) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  const userName = auth.user.name;
  const pendingReminderCount = reminders.filter(r => r.status === 'pending').length;

  const session = { token: auth.token };
  const role = auth.user.role;
  const canView = (p: Page) => page === p && canAccessPage(role, p);

  return (
    <div className="flex min-h-dvh bg-[#0d1117]">
      <Sidebar
        current={page}
        onNavigate={setPage}
        userRole={auth.user.role}
        userName={userName}
        onLogout={handleLogout}
        reminderCount={pendingReminderCount}
        configComplete={configComplete}
        pendingReceivables={overdueInvoices}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
      <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-14 px-4 bg-[#161b22] border-b border-[#30363d]">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="-ml-1 p-1.5 rounded-[6px] text-[#e6edf3] text-xl leading-none hover:bg-[#21262d]"
        >☰</button>
        <div className="w-7 h-7 bg-[#f97316] rounded flex items-center justify-center font-bold text-[#0d1117] text-xs shrink-0">FX</div>
        <span className="font-semibold text-[#e6edf3] truncate">{PAGE_LABELS[page]}</span>
      </header>

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          {canView('dashboard') && (
            <DashboardPage
              userRole={role}
              userName={userName}
              onNavigate={p => setPage(p as Page)}
              session={session}
            />
          )}
          {canView('orders') && <OrderManager session={session} userRole={role} addToast={addToast} />}
          {canView('catalog') && <CatalogManager session={session} userRole={role} addToast={addToast} />}
          {canView('customers') && <CustomerManager session={session} addToast={addToast} />}
          {canView('reminders') && (
            <>
              <DemoNotice hu="HU-11" />
              <RemindersManager
                reminders={reminders}
                setReminders={setReminders}
                customers={mockCustomers}
                addToast={addToast}
              />
            </>
          )}
          {canView('invoices') && (
            <InvoiceManager session={session} addToast={addToast} />
          )}
          {canView('credit-notes') && (
            <CreditNoteManager session={session} addToast={addToast} />
          )}
          {canView('receivables') && (
            <AccountsReceivable session={session} addToast={addToast} onChanged={() => refreshOverdue(auth.token)} />
          )}
          {canView('billing-dashboard') && (
            <BillingDashboard session={session} addToast={addToast} />
          )}
          {canView('settings') && (
            <CompanyConfigPage
              session={session}
              userRole={role}
              addToast={addToast}
              onChanged={config => setConfigComplete(config.estado.puedeEmitir)}
            />
          )}
          {canView('users') && (
            <UserManager addToast={addToast} session={session} currentUserId={auth.user.id} />
          )}
          {canView('usability') && (
            <>
              <DemoNotice hu="HU-14" />
              <UsabilityTest
                sessions={usabilitySessions}
                setSessions={setUsabilitySessions}
                addToast={addToast}
              />
            </>
          )}
          {canView('help') && (
            <HelpPage />
          )}
          {!canAccessPage(role, page) && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <span className="text-4xl">⊘</span>
              <div className="text-[#e6edf3] font-semibold">Acceso restringido</div>
              <div className="text-sm text-[#6e7681]">No tienes permisos para ver esta sección.</div>
            </div>
          )}
        </div>
      </main>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
