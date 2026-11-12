import type { ReporteFacturacion } from './types';
import { toNumber } from './orders';

export type Punto = { clave: string; etiqueta: string; total: number; facturas: number };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Hasta 62 días se grafica por día; en rangos más largos se agrupa por mes para que las barras se lean.
export const agruparSerie = (serie: ReporteFacturacion['serie']): Punto[] => {
  if (serie.length <= 62) {
    return serie.map(d => {
      const [, m, dia] = d.fecha.split('-');
      return { clave: d.fecha, etiqueta: `${Number(dia)} ${MESES[Number(m) - 1]}`, total: toNumber(d.total), facturas: d.facturas };
    });
  }

  const porMes = new Map<string, Punto>();
  for (const d of serie) {
    const clave = d.fecha.slice(0, 7);
    const [anio, m] = clave.split('-');
    const punto = porMes.get(clave) ?? { clave, etiqueta: `${MESES[Number(m) - 1]} ${anio!.slice(2)}`, total: 0, facturas: 0 };
    punto.total += toNumber(d.total);
    punto.facturas += d.facturas;
    porMes.set(clave, punto);
  }
  return [...porMes.values()];
};

// Tope "redondo" del eje y y sus marcas: 0, 1/4, 1/2, 3/4 y el tope.
export const escalaY = (maximo: number) => {
  if (maximo <= 0) return { tope: 1, marcas: [0] };
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  const paso = [1, 2, 2.5, 5, 10].map(f => f * magnitud).find(p => p * 4 >= maximo) ?? magnitud * 10;
  return { tope: paso * 4, marcas: [0, 1, 2, 3, 4].map(i => i * paso) };
};

export const compactCOP = (valor: number) =>
  valor >= 1_000_000 ? `$${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
    : valor >= 1_000 ? `$${Math.round(valor / 1_000).toLocaleString('es-CO')} K`
      : `$${Math.round(valor).toLocaleString('es-CO')}`;

const iso = (fecha: Date) => fecha.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export type Preset = 'mes' | 'mes-anterior' | '30-dias' | 'anio';

export const rangoPreset = (preset: Preset, hoy = new Date()): { desde: string; hasta: string } => {
  const [y, m] = iso(hoy).split('-').map(Number) as [number, number];
  switch (preset) {
    case 'mes':
      return { desde: `${y}-${String(m).padStart(2, '0')}-01`, hasta: iso(hoy) };
    case 'mes-anterior': {
      const anio = m === 1 ? y - 1 : y;
      const mes = m === 1 ? 12 : m - 1;
      const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
      const mm = String(mes).padStart(2, '0');
      return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${ultimo}` };
    }
    case '30-dias':
      return { desde: iso(new Date(hoy.getTime() - 29 * 86_400_000)), hasta: iso(hoy) };
    case 'anio':
      return { desde: `${y}-01-01`, hasta: iso(hoy) };
  }
};
