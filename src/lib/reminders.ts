import type { BackendRecordatorio, EstadoRecordatorio } from './types';

export const MAINTENANCE_TYPES = [
  'Cambio de aceite',
  'Afinación general',
  'Revisión de frenos',
  'Cambio de llantas',
  'Cambio de cadena y piñones',
  'Revisión de suspensión',
  'Cambio de filtro de aire',
  'Revisión eléctrica',
  'Mantenimiento preventivo',
  'Otro',
];

export type ReminderTrigger = 'date' | 'km' | 'both';

export const TRIGGER_OPTIONS: { value: ReminderTrigger; label: string }[] = [
  { value: 'date', label: 'Por fecha' },
  { value: 'km', label: 'Por kilometraje' },
  { value: 'both', label: 'Fecha y kilometraje' },
];

export const ESTADO_BADGE: Record<EstadoRecordatorio, { badge: 'active' | 'inactive' | 'warning'; label: string }> = {
  PENDIENTE: { badge: 'warning', label: 'Pendiente' },
  COMPLETADO: { badge: 'active', label: 'Completado' },
  CANCELADO: { badge: 'inactive', label: 'Cancelado' },
};

// Las fechas del backend son YYYY-MM-DD sin hora: se leen como fecha local para que no se corran un día.
export const formatFecha = (fecha: string) => new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CO');

export type ReminderForm = {
  motocicletaId: string;
  maintenanceType: string;
  customMaintenanceType: string;
  triggerType: ReminderTrigger;
  fechaObjetivo: string;
  kilometrajeObjetivo: number | '';
  descripcion: string;
};

export const emptyReminderForm = (): ReminderForm => ({
  motocicletaId: '',
  maintenanceType: MAINTENANCE_TYPES[0] as string,
  customMaintenanceType: '',
  triggerType: 'date',
  fechaObjetivo: '',
  kilometrajeObjetivo: '',
  descripcion: '',
});

// Para programar el siguiente servicio se parte del recordatorio que se acaba de completar.
export const nextReminderForm = (anterior: BackendRecordatorio): ReminderForm => {
  const conocido = MAINTENANCE_TYPES.includes(anterior.tipoMantenimiento);
  const trigger: ReminderTrigger =
    anterior.fechaObjetivo && anterior.kilometrajeObjetivo !== null ? 'both' : anterior.kilometrajeObjetivo !== null ? 'km' : 'date';

  return {
    ...emptyReminderForm(),
    motocicletaId: anterior.motocicletaId,
    maintenanceType: conocido ? anterior.tipoMantenimiento : 'Otro',
    customMaintenanceType: conocido ? '' : anterior.tipoMantenimiento,
    triggerType: trigger,
  };
};

export const validateReminderForm = (form: ReminderForm) => {
  const errors: Record<string, string> = {};
  const usaFecha = form.triggerType === 'date' || form.triggerType === 'both';
  const usaKm = form.triggerType === 'km' || form.triggerType === 'both';

  if (!form.motocicletaId) errors['motocicletaId'] = 'Selecciona una motocicleta';
  if (form.maintenanceType === 'Otro' && !form.customMaintenanceType.trim()) {
    errors['customMaintenanceType'] = 'Escribe el tipo de mantenimiento';
  }
  if (usaFecha && !form.fechaObjetivo) errors['fechaObjetivo'] = 'La fecha es obligatoria';
  if (usaKm && (form.kilometrajeObjetivo === '' || Number(form.kilometrajeObjetivo) <= 0)) {
    errors['kilometrajeObjetivo'] = 'El kilometraje debe ser mayor a 0';
  }

  return errors;
};

// Cuerpo de POST /recordatorios: solo viaja la fecha o el kilometraje que el tipo de recordatorio usa.
export const toRecordatorioPayload = (form: ReminderForm) => ({
  motocicletaId: form.motocicletaId,
  tipoMantenimiento: (form.maintenanceType === 'Otro' ? form.customMaintenanceType : form.maintenanceType).trim(),
  descripcion: form.descripcion.trim() || null,
  fechaObjetivo: form.triggerType === 'km' ? null : form.fechaObjetivo || null,
  kilometrajeObjetivo: form.triggerType === 'date' || form.kilometrajeObjetivo === '' ? null : Number(form.kilometrajeObjetivo),
});
