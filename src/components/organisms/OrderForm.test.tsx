// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));

import OrderForm from './OrderForm';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  api.apiRequest.mockResolvedValue({ data: [{ id: 'c1', nombreRazonSocial: 'Ana Gomez', numeroIdentificacion: '1', activo: true, motocicletas: [] }] });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const montar = (onNavigate?: () => void) =>
  act(async () => root.render(<OrderForm session={{ token: 't' }} addToast={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} onNavigate={onNavigate as never} />));
const elegirCliente = () => act(async () => {
  const select = host.querySelector('select')!;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, 'c1');
  select.dispatchEvent(new Event('change', { bubbles: true }));
});

describe('OrderForm', () => {
  it('guia a registrar la moto en Clientes cuando el cliente no tiene', async () => {
    const onNavigate = vi.fn();
    await montar(onNavigate);
    await elegirCliente();
    expect(host.textContent).toContain('Este cliente no tiene motos');
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Registre la moto en Clientes')!.click());
    expect(onNavigate).toHaveBeenCalledWith('customers');
  });

  it('muestra el aviso como texto si no hay forma de navegar', async () => {
    await montar();
    await elegirCliente();
    expect(host.textContent).toContain('Registre la moto en Clientes');
    expect([...host.querySelectorAll('button')].some(b => b.textContent === 'Registre la moto en Clientes')).toBe(false);
  });
});
