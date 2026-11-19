// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiRequest: api.apiRequest }));

import CatalogManager from './CatalogManager';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = (id: string, tratamientoIva: string) => ({
  id, codigo: id, nombre: 'Item ' + id, descripcion: null, tipo: 'SERVICIO', precioUnitario: '1000', tratamientoIva, tarifaIva: tratamientoIva === 'GRAVADO' ? '19' : '0', activo: true,
});
let host: HTMLDivElement;
let root: Root;
beforeEach(() => { api.apiRequest.mockReset(); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const montar = async () => { await act(async () => { root.render(<CatalogManager session={{ token: 't' }} addToast={vi.fn()} userRole="admin" />); });
  await act(async () => { await new Promise(r => setTimeout(r, 20)); });
};

describe('CatalogManager', () => {
  it('muestra el IVA con etiquetas claras', async () => {
    api.apiRequest.mockResolvedValue({ data: [item('a', 'GRAVADO'), item('b', 'EXENTO'), item('c', 'EXCLUIDO')] });
    await montar();
    expect(host.textContent).toContain('19%');
    expect(host.textContent).toContain('exento de IVA');
    expect(host.textContent).toContain('sin IVA (excluido)');
    expect(host.textContent).toContain('Servicios y repuestos que se cobran');
  });

  it('indica como agregar el primer elemento cuando el catalogo esta vacio', async () => {
    api.apiRequest.mockResolvedValue({ data: [] });
    await montar();
    expect(host.textContent).toContain('Aún no hay elementos en el catálogo');
  });
});
