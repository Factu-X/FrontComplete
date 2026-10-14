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
import { canAccessPage, ROLE_LABELS, roleFromProfile } from './lib/roles';
import type { AuthUser, BackendProfile } from './lib/types';
import { Customer, Order, Reminder, CompanyConfig, Invoice, CreditNote, UsabilitySession } from './types';
import {
  initialCustomers, initialOrders,
  initialReminders, initialCompanyConfig, initialInvoices,
  initialCreditNotes, initialUsabilitySessions,
} from './data/initialData';

type AuthState = { user: AuthUser; token: string } | null;

export default function App() {
  const [auth, setAuth] = useState<AuthState>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // shortcut: recordatorios, facturación DIAN, notas crédito, cartera y usabilidad siguen con datos de prueba;
  // conectarlos cuando el backend exponga esos módulos. Clientes, catálogo, órdenes y usuarios ya usan la API.
  const [mockCustomers] = useState<Customer[]>(initialCustomers);
  const [mockOrders] = useState<Order[]>(initialOrders);
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
    addToast({ message: `Bienvenido a FactuX — ${ROLE_LABELS[user.role]}`, type: 'success' });
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
  const pendingReminderCount = reminders.filter(r => r.status === 'pending').length;
  const pendingReceivables = invoices.filter(i => i.status !== 'cancelled' && i.paymentStatus !== 'paid').length;
  const configComplete = !!(
    companyConfig.nit && companyConfig.businessName && companyConfig.resolutionNumber &&
    companyConfig.invoicePrefix && companyConfig.rangeFrom && companyConfig.rangeTo &&
    companyConfig.dianClientId && companyConfig.dianClientSecret
  );

  const session = { token: auth.token };
  const role = auth.user.role;
  const canView = (p: Page) => page === p && canAccessPage(role, p);

  return (
    <div className="flex min-h-screen bg-[#0d1117]">
      <Sidebar
        current={page}
        onNavigate={setPage}
        userRole={auth.user.role}
        userName={userName}
        onLogout={handleLogout}
        reminderCount={pendingReminderCount}
        configComplete={configComplete}
        pendingReceivables={pendingReceivables}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-7">
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
            <RemindersManager
              reminders={reminders}
              setReminders={setReminders}
              customers={mockCustomers}
              addToast={addToast}
            />
          )}
          {canView('invoices') && (
            <InvoiceManager
              invoices={invoices}
              setInvoices={setInvoices}
              orders={mockOrders}
              config={companyConfig}
              setConfig={setCompanyConfig}
              addToast={addToast}
            />
          )}
          {canView('credit-notes') && (
            <CreditNoteManager
              creditNotes={creditNotes}
              setCreditNotes={setCreditNotes}
              invoices={invoices}
              setInvoices={setInvoices}
              addToast={addToast}
            />
          )}
          {canView('receivables') && (
            <AccountsReceivable
              invoices={invoices}
              setInvoices={setInvoices}
            />
          )}
          {canView('billing-dashboard') && (
            <BillingDashboard
              invoices={invoices}
              orders={mockOrders}
              creditNotes={creditNotes}
            />
          )}
          {canView('settings') && (
            <CompanyConfigPage
              config={companyConfig}
              setConfig={setCompanyConfig}
              addToast={addToast}
            />
          )}
          {canView('users') && (
            <UserManager addToast={addToast} session={session} currentUserId={auth.user.id} />
          )}
          {canView('usability') && (
            <UsabilityTest
              sessions={usabilitySessions}
              setSessions={setUsabilitySessions}
              addToast={addToast}
            />
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

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
