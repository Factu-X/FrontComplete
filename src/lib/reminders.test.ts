import { describe, expect, it } from 'vitest';

import { emptyReminderForm, nextReminderForm, toRecordatorioPayload, validateReminderForm } from './reminders';
import type { BackendRecordatorio } from './types';

const form = (cambios: Partial<ReturnType<typeof emptyReminderForm>>) => ({ ...emptyReminderForm(), motocicletaId: 'moto-1', ...cambios });

describe('reminders: validación', () => {
  it('pide moto y la fecha cuando el recordatorio es por fecha', () => {
    expect(validateReminderForm(emptyReminderForm())).toMatchObject({ motocicletaId: expect.any(String), fechaObjetivo: expect.any(String) });
    expect(validateReminderForm(form({ fechaObjetivo: '2026-12-01' }))).toEqual({});
  });

  it('pide kilometraje mayor a cero cuando es por kilometraje o por ambos', () => {
    expect(validateReminderForm(form({ triggerType: 'km' }))).toHaveProperty('kilometrajeObjetivo');
    expect(validateReminderForm(form({ triggerType: 'km', kilometrajeObjetivo: 0 }))).toHaveProperty('kilometrajeObjetivo');
    expect(validateReminderForm(form({ triggerType: 'km', kilometrajeObjetivo: 9000 }))).toEqual({});
    expect(validateReminderForm(form({ triggerType: 'both', fechaObjetivo: '2026-12-01' }))).toHaveProperty('kilometrajeObjetivo');
  });

  it('exige describir el tipo cuando se elige "Otro"', () => {
    expect(validateReminderForm(form({ maintenanceType: 'Otro', fechaObjetivo: '2026-12-01' }))).toHaveProperty('customMaintenanceType');
  });
});

describe('reminders: cuerpo del POST', () => {
  it('por fecha no envía kilometraje aunque haya quedado escrito', () => {
    expect(toRecordatorioPayload(form({ fechaObjetivo: '2026-12-01', kilometrajeObjetivo: 5000 }))).toMatchObject({
      fechaObjetivo: '2026-12-01',
      kilometrajeObjetivo: null,
    });
  });

  it('por kilometraje no envía fecha', () => {
    expect(toRecordatorioPayload(form({ triggerType: 'km', fechaObjetivo: '2026-12-01', kilometrajeObjetivo: 5000 }))).toMatchObject({
      fechaObjetivo: null,
      kilometrajeObjetivo: 5000,
    });
  });

  it('usa el tipo personalizado cuando se elige "Otro" y recorta espacios', () => {
    expect(toRecordatorioPayload(form({ maintenanceType: 'Otro', customMaintenanceType: ' Amortiguadores ', fechaObjetivo: '2026-12-01' })).tipoMantenimiento).toBe('Amortiguadores');
  });
});

describe('reminders: siguiente servicio', () => {
  const anterior = {
    motocicletaId: 'moto-1',
    tipoMantenimiento: 'Revisión de frenos',
    fechaObjetivo: '2026-01-01',
    kilometrajeObjetivo: 4000,
  } as BackendRecordatorio;

  it('parte de la misma moto, el mismo tipo y el mismo modo de aviso', () => {
    expect(nextReminderForm(anterior)).toMatchObject({ motocicletaId: 'moto-1', maintenanceType: 'Revisión de frenos', triggerType: 'both' });
  });

  it('un tipo que no está en la lista vuelve como "Otro" con su texto', () => {
    expect(nextReminderForm({ ...anterior, tipoMantenimiento: 'Pintura', kilometrajeObjetivo: null })).toMatchObject({
      maintenanceType: 'Otro',
      customMaintenanceType: 'Pintura',
      triggerType: 'date',
    });
  });
});
