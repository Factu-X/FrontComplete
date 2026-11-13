import type { NivelSus, PrioridadHallazgo } from './types';

export const SUS_QUESTIONS = [
  'Creo que me gustaría usar este sistema frecuentemente.',
  'Encontré el sistema innecesariamente complejo.',
  'Pensé que el sistema era fácil de usar.',
  'Creo que necesitaría el apoyo de una persona técnica para usar este sistema.',
  'Encontré que las funciones del sistema estaban bien integradas.',
  'Pensé que había demasiada inconsistencia en el sistema.',
  'Imagino que la mayoría de personas aprenderían a usar este sistema rápidamente.',
  'Encontré el sistema muy complicado de usar.',
  'Me sentí muy confiado usando el sistema.',
  'Necesité aprender muchas cosas antes de poder usar el sistema.',
];

// Misma fórmula del backend (que es quien guarda el puntaje definitivo): se usa para mostrar el valor provisional.
export const calcSus = (respuestas: number[]) =>
  respuestas.length === SUS_QUESTIONS.length
    ? respuestas.reduce((total, r, i) => total + (i % 2 === 0 ? r - 1 : 5 - r), 0) * 2.5
    : 0;

export const susLabel = (puntaje: number): { label: string; color: string } =>
  puntaje >= 85
    ? { label: 'Excelente', color: 'text-emerald-400' }
    : puntaje >= 71
      ? { label: 'Bueno', color: 'text-blue-400' }
      : puntaje >= 51
        ? { label: 'Regular', color: 'text-yellow-400' }
        : { label: 'Deficiente', color: 'text-red-400' };

export const NIVEL_LABEL: Record<NivelSus, string> = {
  EXCELENTE: 'Excelente',
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  DEFICIENTE: 'Deficiente',
};

export const PRIORIDADES: PrioridadHallazgo[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'];

export const PRIORIDAD_LABEL: Record<PrioridadHallazgo, string> = {
  CRITICA: 'Crítico',
  ALTA: 'Alto',
  MEDIA: 'Medio',
  BAJA: 'Bajo',
};

export const PRIORIDAD_BADGE: Record<PrioridadHallazgo, 'admin' | 'warning' | 'service' | 'inactive'> = {
  CRITICA: 'admin',
  ALTA: 'warning',
  MEDIA: 'service',
  BAJA: 'inactive',
};

export const ordenarPorPrioridad = <T extends { prioridad: PrioridadHallazgo }>(hallazgos: T[]) =>
  [...hallazgos].sort((a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad));
