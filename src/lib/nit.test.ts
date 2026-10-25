import { describe, expect, it } from 'vitest';

import { calcularDigitoVerificacion } from './nit';

describe('calcularDigitoVerificacion', () => {
  it.each([
    ['900123456', '8'],
    ['800197268', '4'],
    ['860034313', '7'],
  ])('NIT %s -> DV %s', (nit, dv) => {
    expect(calcularDigitoVerificacion(nit)).toBe(dv);
  });

  it('ignora puntos y guiones', () => {
    expect(calcularDigitoVerificacion('900.123.456')).toBe('8');
  });

  it('devuelve null sin digitos', () => {
    expect(calcularDigitoVerificacion('')).toBeNull();
  });
});
