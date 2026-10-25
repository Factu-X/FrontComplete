// Espejo de calcularDvNit en backend/src/modules/configuracion/configuracion.rules.ts: pesos oficiales DIAN, de derecha a izquierda.
const PESOS_DV = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export const calcularDigitoVerificacion = (nit: string): string | null => {
  const digits = nit.replace(/\D/g, '');
  if (!digits || digits.length > PESOS_DV.length) return null;

  const suma = [...digits]
    .reverse()
    .reduce((acc, digit, index) => acc + Number(digit) * PESOS_DV[index]!, 0);
  const residuo = suma % 11;

  return String(residuo > 1 ? 11 - residuo : residuo);
};
