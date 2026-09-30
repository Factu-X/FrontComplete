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
import Sidebar, { Page } from './components/organisms/Sidebar';
import ToastContainer, { ToastItem } from './components/molecules/ToastContainer';
import { apiRequest } from './lib/api';
import { supabase } from './lib/supabase';
import type { AuthUser, BackendProfile, UserRole } from './lib/types';
import { Customer, CatalogItem, Order, Reminder, CompanyConfig, Invoice, CreditNote, UsabilitySession } from './types';
import {
  initialCustomers, initialCatalog, initialOrders,
  initialReminders, initialCompanyConfig, initialInvoices,
  initialCreditNotes, initialUsabilitySessions,
} from './data/initialData';

type AuthState = { user: AuthUser; token: string } | null;

const roleFromProfile = (rol: BackendProfile['rol']): UserRole =>
  rol === 'ADMINISTRADOR' ? 'admin' : 'operator';

export default function App() {
  const [auth, setAuth] = useState<AuthState>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Global state
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialCatalog);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(initialCompanyConfig);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(initialCreditNotes);
  const [usabilitySessions, setUsabilitySessions] = useState<UsabilitySession[]>(initialUsabilitySessions);

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
  }, []);

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
        user: { id: profile.data.id, email, role: roleFromProfile(profile.data.rol) },
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
    addToast({ message: `Bienvenido a FactuX — ${user.role === 'admin' ? 'Administrador' : 'Operador'}`, type: 'success' });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuth(null);
    setPage('dashboard');
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-[#8b949e] text-sm">
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

  const userName = auth.user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const openOrderCount = orders.filter(o => o.status === 'open' || o.status === 'in_process').length;
  const pendingReminderCount = reminders.filter(r => r.status === 'pending').length;
  const pendingReceivables = invoices.filter(i => i.status !== 'cancelled' && i.paymentStatus !== 'paid').length;
  const configComplete = !!(
    companyConfig.nit && companyConfig.businessName && companyConfig.resolutionNumber &&
    companyConfig.invoicePrefix && companyConfig.rangeFrom && companyConfig.rangeTo &&
    companyConfig.dianClientId && companyConfig.dianClientSecret
  );

  const isAdmin = auth.user.role === 'admin';
  const adminPages: Page[] = ['settings', 'users', 'usability'];
  const isRestrictedPage = adminPages.includes(page);

  return (
    <div className="flex min-h-screen bg-[#0d1117]">
      <Sidebar
        current={page}
        onNavigate={setPage}
        userRole={auth.user.role}
        userName={userName}
        onLogout={handleLogout}
        orderCount={openOrderCount}
        reminderCount={pendingReminderCount}
        configComplete={configComplete}
        pendingReceivables={pendingReceivables}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-7">
          {page === 'dashboard' && (
            <DashboardPage
              userRole={auth.user.role}
              userName={userName}
              onNavigate={p => setPage(p as Page)}
              orders={orders}
              customers={customers}
              catalog={catalog}
            />
          )}
          {page === 'orders' && (
            <OrderManager
              orders={orders}
              setOrders={setOrders}
              customers={customers}
              catalog={catalog}
              addToast={addToast}
            />
          )}
          {page === 'catalog' && (
            <CatalogManager
              catalog={catalog}
              setCatalog={setCatalog}
              addToast={addToast}
            />
          )}
          {page === 'customers' && (
            <CustomerManager
              customers={customers}
              setCustomers={setCustomers}
              orders={orders}
              addToast={addToast}
            />
          )}
          {page === 'reminders' && (
            <RemindersManager
              reminders={reminders}
              setReminders={setReminders}
              customers={customers}
              addToast={addToast}
            />
          )}
          {page === 'invoices' && (
            <InvoiceManager
              invoices={invoices}
              setInvoices={setInvoices}
              orders={orders}
              config={companyConfig}
              setConfig={setCompanyConfig}
              addToast={addToast}
            />
          )}
          {page === 'credit-notes' && (
            <CreditNoteManager
              creditNotes={creditNotes}
              setCreditNotes={setCreditNotes}
              invoices={invoices}
              setInvoices={setInvoices}
              addToast={addToast}
            />
          )}
          {page === 'receivables' && (
            <AccountsReceivable
              invoices={invoices}
              setInvoices={setInvoices}
            />
          )}
          {page === 'billing-dashboard' && (
            <BillingDashboard
              invoices={invoices}
              orders={orders}
              creditNotes={creditNotes}
            />
          )}
          {page === 'settings' && isAdmin && (
            <CompanyConfigPage
              config={companyConfig}
              setConfig={setCompanyConfig}
              addToast={addToast}
            />
          )}
          {page === 'users' && isAdmin && (
            <UserManager addToast={addToast} />
          )}
          {page === 'usability' && isAdmin && (
            <UsabilityTest
              sessions={usabilitySessions}
              setSessions={setUsabilitySessions}
              addToast={addToast}
            />
          )}
          {page === 'help' && (
            <HelpPage />
          )}
          {isRestrictedPage && !isAdmin && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <span className="text-4xl">⊘</span>
              <div className="text-[#e6edf3] font-semibold">Acceso restringido</div>
              <div className="text-sm text-[#6e7681]">No tienes permisos para ver esta sección.</div>
            </div>
          )}
        </div>
      </main>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
