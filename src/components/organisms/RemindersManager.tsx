import React, { useState, useMemo } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import ConfirmDialog from '../molecules/ConfirmDialog';
import { ToastItem } from '../molecules/ToastContainer';
import { Reminder, ReminderStatus, ReminderTrigger, Customer } from '../../types';

const MAINTENANCE_TYPES = [
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

const triggerOptions = [
  { value: 'date', label: 'Por fecha' },
  { value: 'km', label: 'Por kilometraje' },
  { value: 'both', label: 'Fecha y kilometraje' },
];

const STATUS_MAP: Record<ReminderStatus, { badge: 'active' | 'inactive' | 'warning'; label: string }> = {
  pending: { badge: 'warning', label: 'Pendiente' },
  completed: { badge: 'active', label: 'Completado' },
  cancelled: { badge: 'inactive', label: 'Cancelado' },
};

function isOverdue(r: Reminder): boolean {
  if (r.status !== 'pending') return false;
  if (r.scheduledDate && new Date(r.scheduledDate) < new Date()) return true;
  return false;
}

const emptyForm = {
  motorcycleId: '' as number | '',
  maintenanceType: 'Cambio de aceite',
  customMaintenanceType: '',
  triggerType: 'date' as ReminderTrigger,
  scheduledDate: '',
  scheduledKm: '' as number | '',
  observations: '',
};

interface Props {
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  customers: Customer[];
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function RemindersManager({ reminders, setReminders, customers, addToast }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ reminder: Reminder; action: 'complete' | 'cancel' } | null>(null);
  const [nextReminderModal, setNextReminderModal] = useState<Reminder | null>(null);
  const [nextForm, setNextForm] = useState(emptyForm);
  const [nextErrors, setNextErrors] = useState<Record<string, string>>({});
  const [nextSaving, setNextSaving] = useState(false);

  // All motorcycles with owner info
  const allMotos = useMemo(() =>
    customers.flatMap(c => c.motorcycles.map(m => ({ ...m, customerId: c.id, customerName: c.name, customerEmail: c.email }))),
    [customers]
  );

  const motoOptions = [
    { value: '', label: 'Seleccionar motocicleta...' },
    ...allMotos.map(m => ({ value: String(m.id), label: `${m.plate} — ${m.brand} ${m.model} (${m.customerName})` })),
  ];

  const overdueCount = reminders.filter(isOverdue).length;

  const filtered = useMemo(() => reminders.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.motorcyclePlate.toLowerCase().includes(q)
      || r.customerName.toLowerCase().includes(q)
      || r.maintenanceType.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || r.status === filterStatus
      || (filterStatus === 'overdue' && isOverdue(r));
    return matchQ && matchS;
  }).sort((a, b) => {
    // Overdue first, then by date
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }), [reminders, search, filterStatus]);

  function validate(f: typeof emptyForm) {
    const e: Record<string, string> = {};
    if (!f.motorcycleId) e.motorcycleId = 'Selecciona una motocicleta';
    if (f.maintenanceType === 'Otro' && !f.customMaintenanceType.trim()) e.customMaintenanceType = 'Escribe el tipo de mantenimiento';
    if ((f.triggerType === 'date' || f.triggerType === 'both') && !f.scheduledDate) e.scheduledDate = 'La fecha es obligatoria';
    if ((f.triggerType === 'km' || f.triggerType === 'both') && (!f.scheduledKm || Number(f.scheduledKm) <= 0)) e.scheduledKm = 'El kilometraje debe ser mayor a 0';
    return e;
  }

  function handleCreate() {
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      const moto = allMotos.find(m => m.id === Number(form.motorcycleId))!;
      const newR: Reminder = {
        id: Date.now(),
        motorcycleId: moto.id,
        motorcyclePlate: moto.plate,
        motorcycleBrand: moto.brand,
        motorcycleModel: moto.model,
        customerId: moto.customerId,
        customerName: moto.customerName,
        customerEmail: moto.customerEmail,
        maintenanceType: form.maintenanceType === 'Otro' ? form.customMaintenanceType : form.maintenanceType,
        triggerType: form.triggerType,
        scheduledDate: form.scheduledDate || undefined,
        scheduledKm: form.scheduledKm ? Number(form.scheduledKm) : undefined,
        observations: form.observations,
        status: 'pending',
        createdAt: new Date().toISOString(),
        notificationSent: false,
      };
      setReminders(prev => [newR, ...prev]);
      addToast({ message: `Recordatorio creado para ${moto.plate}`, type: 'success' });
      setSaving(false);
      setModalOpen(false);
      setForm(emptyForm);
    }, 500);
  }

  function handleAction() {
    if (!confirmAction) return;
    const { reminder, action } = confirmAction;
    setReminders(prev => prev.map(r => r.id === reminder.id
      ? { ...r, status: action === 'complete' ? 'completed' : 'cancelled', completedAt: new Date().toISOString() }
      : r
    ));
    addToast({ message: action === 'complete' ? 'Recordatorio marcado como completado' : 'Recordatorio cancelado', type: action === 'complete' ? 'success' : 'warning' });
    if (action === 'complete') {
      // Open "next reminder" flow
      const moto = allMotos.find(m => m.id === reminder.motorcycleId);
      if (moto) {
        setNextReminderModal(reminder);
        setNextForm({ ...emptyForm, motorcycleId: moto.id, maintenanceType: reminder.maintenanceType, triggerType: reminder.triggerType });
        setNextErrors({});
      }
    }
    setConfirmAction(null);
  }

  function handleSimulateNotification(r: Reminder) {
    if (!r.customerEmail) {
      addToast({ message: 'Cliente sin correo registrado. Recordatorio conservado como pendiente.', type: 'warning' });
      return;
    }
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, notificationSent: true } : x));
    addToast({ message: `Notificación enviada a ${r.customerEmail}`, type: 'success' });
  }

  function handleCreateNext() {
    const e = validate(nextForm);
    if (Object.keys(e).length) { setNextErrors(e); return; }
    setNextSaving(true);
    setTimeout(() => {
      const moto = allMotos.find(m => m.id === Number(nextForm.motorcycleId))!;
      const newR: Reminder = {
        id: Date.now(),
        motorcycleId: moto.id,
        motorcyclePlate: moto.plate,
        motorcycleBrand: moto.brand,
        motorcycleModel: moto.model,
        customerId: moto.customerId,
        customerName: moto.customerName,
        customerEmail: moto.customerEmail,
        maintenanceType: nextForm.maintenanceType === 'Otro' ? nextForm.customMaintenanceType : nextForm.maintenanceType,
        triggerType: nextForm.triggerType,
        scheduledDate: nextForm.scheduledDate || undefined,
        scheduledKm: nextForm.scheduledKm ? Number(nextForm.scheduledKm) : undefined,
        observations: nextForm.observations,
        status: 'pending',
        createdAt: new Date().toISOString(),
        notificationSent: false,
      };
      setReminders(prev => [newR, ...prev]);
      addToast({ message: `Próximo recordatorio programado para ${moto.plate}`, type: 'success' });
      setNextSaving(false);
      setNextReminderModal(null);
    }, 500);
  }

  const columns = [
    { key: 'moto', header: 'Motocicleta / Cliente', render: (r: Reminder) => (
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#f97316]">{r.motorcyclePlate}</span>
          <span className="text-xs text-[#8b949e]">{r.motorcycleBrand} {r.motorcycleModel}</span>
          {isOverdue(r) && (
            <span className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded font-mono">VENCIDO</span>
          )}
        </div>
        <div className="text-xs text-[#6e7681] mt-0.5">{r.customerName}</div>
      </div>
    )},
    { key: 'type', header: 'Mantenimiento', render: (r: Reminder) => (
      <span className="text-sm text-[#e6edf3]">{r.maintenanceType}</span>
    )},
    { key: 'trigger', header: 'Programado', render: (r: Reminder) => (
      <div className="text-xs space-y-0.5">
        {r.scheduledDate && (
          <div className={`font-mono ${isOverdue(r) ? 'text-red-400' : 'text-[#8b949e]'}`}>
            📅 {new Date(r.scheduledDate + 'T00:00:00').toLocaleDateString('es-CO')}
          </div>
        )}
        {r.scheduledKm && (
          <div className="font-mono text-[#8b949e]">⊙ {r.scheduledKm.toLocaleString('es-CO')} km</div>
        )}
      </div>
    )},
    { key: 'status', header: 'Estado', render: (r: Reminder) => (
      <Badge variant={STATUS_MAP[r.status].badge}>{STATUS_MAP[r.status].label}</Badge>
    )},
    { key: 'notif', header: 'Notif.', render: (r: Reminder) => (
      r.status === 'pending' ? (
        <span className={`text-xs font-mono ${r.notificationSent ? 'text-emerald-400' : 'text-[#6e7681]'}`}>
          {r.notificationSent ? '✓ Enviada' : '— Pendiente'}
        </span>
      ) : <span className="text-xs text-[#6e7681]">—</span>
    )},
    { key: 'actions', header: '', render: (r: Reminder) => (
      <div className="flex gap-1 justify-end flex-wrap">
        {r.status === 'pending' && (
          <>
            {!r.notificationSent && (
              <Button size="sm" variant="ghost" onClick={() => handleSimulateNotification(r)}>Notificar</Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setConfirmAction({ reminder: r, action: 'complete' })}>Completar</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ reminder: r, action: 'cancel' })}>Cancelar</Button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Recordatorios de Mantenimiento</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-11 · Seguimiento y alertas de servicios programados</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setErrors({}); setModalOpen(true); }} icon={<span className="text-base">+</span>}>
          Nuevo recordatorio
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: reminders.length, color: 'text-[#e6edf3]' },
          { label: 'Pendientes', value: reminders.filter(r => r.status === 'pending').length, color: 'text-yellow-400' },
          { label: 'Vencidos', value: overdueCount, color: overdueCount > 0 ? 'text-red-400' : 'text-[#6e7681]' },
          { label: 'Completados', value: reminders.filter(r => r.status === 'completed').length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-[6px]">
          <span className="text-red-400 text-lg">⚠</span>
          <span className="text-sm text-red-300 font-medium">{overdueCount} recordatorio{overdueCount > 1 ? 's' : ''} ha{overdueCount > 1 ? 'n' : ''} superado la fecha estimada.</span>
          <button onClick={() => setFilterStatus('overdue')} className="ml-auto text-xs text-red-400 hover:underline">Ver vencidos</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por placa, cliente o tipo..." />
        </div>
        <div className="flex rounded-[6px] border border-[#30363d] overflow-hidden text-xs">
          {[['all','Todos'],['pending','Pendientes'],['overdue','Vencidos'],['completed','Completados'],['cancelled','Cancelados']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-3 py-2 transition-colors ${filterStatus === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage="No se encontraron recordatorios" />

      {/* Create Modal */}
      <Modal title="Nuevo recordatorio de mantenimiento" open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleCreate} loading={saving} width="max-w-lg">
        <ReminderForm form={form} setForm={setForm} errors={errors} motoOptions={motoOptions} />
      </Modal>

      {/* Next Reminder Modal */}
      <Modal
        title="Programar próximo mantenimiento"
        open={!!nextReminderModal}
        onClose={() => setNextReminderModal(null)}
        onConfirm={handleCreateNext}
        loading={nextSaving}
        confirmLabel="Programar próximo"
        width="max-w-lg"
      >
        <div className="mb-4 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-300">
          ✓ Mantenimiento "{nextReminderModal?.maintenanceType}" completado. Configura el próximo recordatorio.
        </div>
        <ReminderForm form={nextForm} setForm={setNextForm} errors={nextErrors} motoOptions={motoOptions} fixedMoto />
      </Modal>

      {/* Confirm action */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.action === 'complete' ? 'Marcar como completado' : 'Cancelar recordatorio'}
        message={confirmAction?.action === 'complete'
          ? `¿Confirmar que el mantenimiento "${confirmAction?.reminder.maintenanceType}" fue realizado? Se te ofrecerá programar el próximo recordatorio.`
          : `¿Cancelar el recordatorio de "${confirmAction?.reminder.maintenanceType}" para ${confirmAction?.reminder.motorcyclePlate}?`
        }
        confirmLabel={confirmAction?.action === 'complete' ? 'Sí, completado' : 'Cancelar recordatorio'}
        destructive={confirmAction?.action === 'cancel'}
        onConfirm={handleAction}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}

// ─── Sub-form component ────────────────────────────────────────────────────

interface ReminderFormProps {
  form: ReturnType<typeof Object.assign> & {
    motorcycleId: number | '';
    maintenanceType: string;
    customMaintenanceType: string;
    triggerType: ReminderTrigger;
    scheduledDate: string;
    scheduledKm: number | '';
    observations: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  errors: Record<string, string>;
  motoOptions: { value: string; label: string }[];
  fixedMoto?: boolean;
}

function ReminderForm({ form, setForm, errors, motoOptions, fixedMoto }: ReminderFormProps) {
  const mtOptions = MAINTENANCE_TYPES.map(t => ({ value: t, label: t }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Motocicleta *</label>
        <select
          value={form.motorcycleId}
          onChange={e => setForm((f: typeof form) => ({ ...f, motorcycleId: Number(e.target.value) || '' }))}
          disabled={fixedMoto}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316] disabled:opacity-60"
        >
          {motoOptions.map(o => <option key={o.value} value={o.value} className="bg-[#161b22]">{o.label}</option>)}
        </select>
        {errors.motorcycleId && <span className="text-xs text-[#ef4444]">{errors.motorcycleId}</span>}
      </div>

      <Select
        label="Tipo de mantenimiento *"
        options={mtOptions}
        value={form.maintenanceType}
        onChange={e => setForm((f: typeof form) => ({ ...f, maintenanceType: e.target.value }))}
      />
      {form.maintenanceType === 'Otro' && (
        <Input
          label="Especifica el tipo *"
          value={form.customMaintenanceType}
          onChange={e => setForm((f: typeof form) => ({ ...f, customMaintenanceType: e.target.value }))}
          error={errors.customMaintenanceType}
          placeholder="Ej: Cambio de amortiguadores"
        />
      )}

      <Select
        label="Tipo de recordatorio *"
        options={triggerOptions}
        value={form.triggerType}
        onChange={e => setForm((f: typeof form) => ({ ...f, triggerType: e.target.value as ReminderTrigger }))}
      />

      {(form.triggerType === 'date' || form.triggerType === 'both') && (
        <Input
          label="Fecha estimada *"
          type="date"
          value={form.scheduledDate}
          onChange={e => setForm((f: typeof form) => ({ ...f, scheduledDate: e.target.value }))}
          error={errors.scheduledDate}
        />
      )}
      {(form.triggerType === 'km' || form.triggerType === 'both') && (
        <Input
          label="Kilometraje estimado *"
          type="number"
          value={form.scheduledKm}
          onChange={e => setForm((f: typeof form) => ({ ...f, scheduledKm: Number(e.target.value) || '' }))}
          error={errors.scheduledKm}
          placeholder="14500"
        />
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones</label>
        <textarea
          value={form.observations}
          onChange={e => setForm((f: typeof form) => ({ ...f, observations: e.target.value }))}
          rows={2}
          placeholder="Notas adicionales sobre el mantenimiento..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none"
        />
      </div>
    </div>
  );
}
