import { describe, expect, it } from 'vitest';

import { calcSus, ordenarPorPrioridad, susLabel } from './usability';

describe('usability: SUS', () => {
  it('da 100 con las mejores respuestas, 0 con las peores y 50 con todo neutro', () => {
    expect(calcSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(calcSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
    expect(calcSus(Array(10).fill(3))).toBe(50);
  });

  it('coincide con el caso conocido del backend (85)', () => {
    expect(calcSus([4, 2, 5, 1, 4, 2, 5, 1, 4, 2])).toBe(85);
  });

  it('no calcula con respuestas incompletas', () => {
    expect(calcSus([5, 5])).toBe(0);
  });

  it('etiqueta el puntaje en cuatro niveles', () => {
    expect(susLabel(90).label).toBe('Excelente');
    expect(susLabel(72).label).toBe('Bueno');
    expect(susLabel(55).label).toBe('Regular');
    expect(susLabel(20).label).toBe('Deficiente');
  });
});

describe('usability: hallazgos', () => {
  it('ordena de más a menos grave sin modificar la lista original', () => {
    const lista = [{ prioridad: 'BAJA' as const }, { prioridad: 'CRITICA' as const }, { prioridad: 'MEDIA' as const }];
    expect(ordenarPorPrioridad(lista).map(h => h.prioridad)).toEqual(['CRITICA', 'MEDIA', 'BAJA']);
    expect(lista[0]?.prioridad).toBe('BAJA');
  });
});
