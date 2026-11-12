import { describe, expect, it } from 'vitest';

import { agruparSerie, compactCOP, escalaY, rangoPreset } from './reports';

describe('agruparSerie', () => {
  it('keeps one point per day for short ranges', () => {
    const puntos = agruparSerie([{ fecha: '2026-10-01', facturas: 1, total: '1000.00' }, { fecha: '2026-10-02', facturas: 0, total: '0.00' }]);
    expect(puntos.map(p => p.etiqueta)).toEqual(['1 oct', '2 oct']);
  });

  it('groups long ranges by month', () => {
    const serie = Array.from({ length: 70 }, (_, i) => {
      const fecha = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10);
      return { fecha, facturas: 1, total: '100.00' };
    });
    const puntos = agruparSerie(serie);
    expect(puntos.map(p => [p.etiqueta, p.facturas])).toEqual([['sep 26', 30], ['oct 26', 31], ['nov 26', 9]]);
    expect(puntos[0]!.total).toBe(3000);
  });
});

describe('escalaY', () => {
  it('picks a round top with four even steps', () => {
    expect(escalaY(355810)).toEqual({ tope: 400000, marcas: [0, 100000, 200000, 300000, 400000] });
    expect(escalaY(0).tope).toBe(1);
  });
});

describe('compactCOP', () => {
  it('abbreviates thousands and millions', () => {
    expect([compactCOP(950), compactCOP(91630), compactCOP(1_250_000)]).toEqual(['$950', '$92 K', '$1,3 M']);
  });
});

describe('rangoPreset', () => {
  const hoy = new Date('2026-10-22T15:00:00Z');

  it.each([
    ['mes', '2026-10-01', '2026-10-22'],
    ['mes-anterior', '2026-09-01', '2026-09-30'],
    ['30-dias', '2026-09-23', '2026-10-22'],
    ['anio', '2026-01-01', '2026-10-22'],
  ] as const)('%s', (preset, desde, hasta) => {
    expect(rangoPreset(preset, hoy)).toEqual({ desde, hasta });
  });

  it('wraps January back to December of the previous year', () => {
    expect(rangoPreset('mes-anterior', new Date('2026-01-10T15:00:00Z'))).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
  });
});
