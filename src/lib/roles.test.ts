import { describe, expect, it } from 'vitest';

import {
  BACKEND_ROLE,
  canAccessPage,
  canCancelOrders,
  canCreateOrders,
  canEditSettings,
  canInvoice,
  canManageCatalog,
  canManageCustomers,
  roleFromProfile,
} from './roles';

describe('roles', () => {
  it('maps backend roles to UI roles and back', () => {
    expect(roleFromProfile('ADMINISTRADOR')).toBe('admin');
    expect(roleFromProfile('FACTURACION')).toBe('billing');
    expect(roleFromProfile('OPERADOR')).toBe('operator');
    expect(BACKEND_ROLE[roleFromProfile('FACTURACION')]).toBe('FACTURACION');
  });

  it('gives the administrator every page', () => {
    for (const page of ['users', 'settings', 'usability', 'catalog', 'invoices']) {
      expect(canAccessPage('admin', page)).toBe(true);
    }
  });

  it('keeps billing out of administration pages', () => {
    expect(canAccessPage('billing', 'customers')).toBe(true);
    expect(canAccessPage('billing', 'invoices')).toBe(true);
    expect(canAccessPage('billing', 'users')).toBe(false);
  });

  it('lets billing read the settings but only the administrator edit them (HU-13)', () => {
    expect(canAccessPage('billing', 'settings')).toBe(true);
    expect(canAccessPage('operator', 'settings')).toBe(false);
    expect(canEditSettings('admin')).toBe(true);
    expect(canEditSettings('billing')).toBe(false);
    expect(canInvoice('billing')).toBe(true);
    expect(canInvoice('operator')).toBe(false);
  });

  it('limits the operator to orders', () => {
    expect(canAccessPage('operator', 'orders')).toBe(true);
    expect(canAccessPage('operator', 'customers')).toBe(false);
    expect(canAccessPage('operator', 'invoices')).toBe(false);
  });

  it('mirrors backend write permissions', () => {
    expect(canManageCatalog('admin')).toBe(true);
    expect(canManageCatalog('billing')).toBe(false);
    expect(canManageCustomers('billing')).toBe(true);
    expect(canManageCustomers('operator')).toBe(false);
    expect(canCreateOrders('operator')).toBe(false);
    expect(canCancelOrders('operator')).toBe(false);
    expect(canCancelOrders('billing')).toBe(true);
  });
});
