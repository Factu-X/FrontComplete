// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Sidebar from './Sidebar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const montar = (userRole: 'admin' | 'billing' | 'operator', onNavigate = vi.fn()) =>
  act(async () => root.render(<Sidebar current="dashboard" onNavigate={onNavigate} userRole={userRole} userName="Ana" onLogout={vi.fn()} open onClose={vi.fn()} />));

describe('Sidebar', () => {
  it('muestra Pagos recibidos solo a los roles con acceso y navega al pulsarlo', async () => {
    const onNavigate = vi.fn();
    await montar('billing', onNavigate);
    const boton = [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Pagos recibidos'))!;
    await act(async () => boton.click());
    expect(onNavigate).toHaveBeenCalledWith('payments');
    expect(host.textContent).toContain('Inicio');
    expect(host.textContent).toContain('Por cobrar');
  });

  it('oculta Pagos recibidos al operario', async () => {
    await montar('operator');
    expect(host.textContent).not.toContain('Pagos recibidos');
  });
});
