// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));

import DashboardPage from './DashboardPage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  api.apiRequest.mockImplementation((path: string) => Promise.resolve({ data: path === '/ordenes'
    ? [{ id: 'o1', numero: 'OS-1', estado: 'FINALIZADA', total: '1000', fechaIngreso: '2026-11-01T10:00:00Z', motivoIngreso: 'x' }]
    : [] }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const atajo = (texto: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.includes(texto))!;

describe('DashboardPage', () => {
  it('muestra los atajos de cobro y navega a cada pantalla', async () => {
    const onNavigate = vi.fn();
    await act(async () => root.render(<DashboardPage userRole="admin" userName="Ana Gomez" onNavigate={onNavigate} session={{ token: 't' }} />));
    expect(host.textContent).toContain('Valor de órdenes finalizadas');
    for (const [texto, page] of [['Cobrar / registrar pago', 'receivables'], ['Pagos recibidos', 'payments'], ['Ver ingresos por fechas', 'billing-dashboard']]) {
      await act(async () => atajo(texto!).click());
      expect(onNavigate).toHaveBeenLastCalledWith(page);
    }
  });
});
