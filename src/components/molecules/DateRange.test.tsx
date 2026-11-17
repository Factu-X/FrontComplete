// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DateRange from './DateRange';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

// React escucha "input" y compara con el valor nativo, asi que hay que usar el setter del prototipo.
const escribir = (input: HTMLInputElement, valor: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('DateRange', () => {
  it('limita cada fecha con la otra y avisa los cambios', () => {
    const onDesde = vi.fn();
    const onHasta = vi.fn();
    act(() => root.render(<DateRange desde="2026-11-01" hasta="2026-11-16" onDesde={onDesde} onHasta={onHasta} etiqueta="Emitidas" />));

    const desde = host.querySelector<HTMLInputElement>('[aria-label="Emitidas desde"]')!;
    const hasta = host.querySelector<HTMLInputElement>('[aria-label="Emitidas hasta"]')!;
    expect(desde.max).toBe('2026-11-16');
    expect(hasta.min).toBe('2026-11-01');

    act(() => escribir(desde, '2026-11-05'));
    act(() => escribir(hasta, '2026-11-10'));
    expect(onDesde).toHaveBeenCalledWith('2026-11-05');
    expect(onHasta).toHaveBeenCalledWith('2026-11-10');
  });

  it('muestra Limpiar solo con alguna fecha y sin limites cuando el rango esta vacio', () => {
    const onLimpiar = vi.fn();
    act(() => root.render(<DateRange desde="" hasta="" onDesde={vi.fn()} onHasta={vi.fn()} onLimpiar={onLimpiar} />));
    expect(host.querySelector('button')).toBeNull();
    expect(host.querySelector<HTMLInputElement>('[aria-label="desde"]')!.max).toBe('');

    act(() => root.render(<DateRange desde="2026-11-01" hasta="" onDesde={vi.fn()} onHasta={vi.fn()} onLimpiar={onLimpiar} />));
    act(() => host.querySelector('button')!.click());
    expect(onLimpiar).toHaveBeenCalledOnce();
  });
});
