import React, { useEffect, useMemo, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import ConfirmDialog from '../molecules/ConfirmDialog';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import {
  ESTADO_BADGE, MAINTENANCE_TYPES, TRIGGER_OPTIONS, emptyReminderForm, formatFecha, nextReminderForm,
  toRecordatorioPayload, validateReminderForm, type ReminderForm, type ReminderTrigger,
} from '../../lib/reminders';
import type {
  BackendCliente, BackendRecordatorio, ResultadoNotificacion, ResumenNotificaciones,
} from '../../lib/types';

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  // Avisa a la app para que actualice el número junto a "Recordatorios" en el menú.
  onChanged?: () => void;
}

type MotoOption = { id: string; label: string };

export default function RemindersManager({ session, addToast, onChanged }: Props) {
  const [reminders, setReminders] = useState<BackendRecordatorio[]>([]);
  const [motos, setMotos] = useState<MotoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ReminderForm>(emptyReminderForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ reminder: BackendRecordatorio; action: 'complete' | 'cancel' } | null>(null);
  const [nextReminderModal, setNextReminderModal] = useState<BackendRecordatorio | null>(null);
  const [nextForm, setNextForm] = useState<ReminderForm>(emptyReminderForm());
  const [nextErrors, setNextErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notifyingAll, setNotifyingAll] = useState(false);

  const fail = (error: unknown, fallback: string) =>
    addToast({ message: error instanceof Error ? error.message : fallback, type: 'error' });

  async function load() {
    try {
      const response = await apiRequest<ApiListResponse<BackendRecordatorio>>('/recordatorios', session);
      setReminders(response.data);
    } catch (error) {
      fail(error, 'No se pudieron cargar los recordatorios');
    } finally {
      setLoading(false);
    }
  }

  async function loadMotos() {
    try {
      const response = await apiRequest<ApiListResponse<BackendCliente>>('/clientes', session);
      setMotos(response.data.flatMap(c => (c.motocicletas ?? [])
        .filter(m => m.activa)
        .map(m => ({ id: m.id, label: `${m.placa} — ${m.marca} ${m.modelo} (${c.nombreRazonSocial})` }))));
    } catch (error) {
      fail(error, 'No se pudieron cargar las motocicletas');
    }
  }

  useEffect(() => {
    void load();
    void loadMotos();
  }, [session.token]);

  async function refresh() {
    await load();
    onChanged?.();
  }

  const motoOptions = [{ value: '', label: 'Seleccionar motocicleta...' }, ...motos.map(m => ({ value: m.id, label: m.label }))];

  const overdueCount = reminders.filter(r => r.vencido).length;

  const filtered = useMemo(() => reminders.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q
      || (r.motocicleta?.placa.toLowerCase().includes(q) ?? false)
      || (r.motocicleta?.cliente?.nombreRazonSocial.toLowerCase().includes(q) ?? false)
      || r.tipoMantenimiento.toLowerCase().includes(q);
    const matchS = filterStatus === 'all'
      || (filterStatus === 'overdue' ? r.vencido : r.estado === filterStatus);
    return matchQ && matchS;
  }), [reminders, search, filterStatus]);

  async function handleCreate() {
    const e = validateReminderForm(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const response = await apiRequest<ApiEntityResponse<BackendRecordatorio>>('/recordatorios', session, {
        method: 'POST',
        body: JSON.stringify(toRecordatorioPayload(form)),
      });
      addToast({ message: `Recordatorio creado para ${response.data.motocicleta?.placa ?? 'la motocicleta'}`, type: 'success' });
      setModalOpen(false);
      setForm(emptyReminderForm());
      await refresh();
    } catch (error) {
      fail(error, 'No se pudo crear el recordatorio');
    } finally {
      setSaving(false);
    }
  }

  async function handleAction() {
    if (!confirmAction) return;
    const { reminder, action } = confirmAction;
    setBusyId(reminder.id);
    try {
      await apiRequest(`/recordatorios/${reminder.id}/estado`, session, {
        method: 'PATCH',
        body: JSON.stringify({ estado: action === 'complete' ? 'COMPLETADO' : 'CANCELADO' }),
      });
      addToast({
        message: action === 'complete' ? 'Recordatorio marcado como completado' : 'Recordatorio cancelado',
        type: action === 'complete' ? 'success' : 'warning',
      });
      setConfirmAction(null);
      await refresh();
      if (action === 'complete') {
        setNextReminderModal(reminder);
        setNextForm(nextReminderForm(reminder));
        setNextErrors({});
      }
    } catch (error) {
      fail(error, 'No se pudo actualizar el recordatorio');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReopen(reminder: BackendRecordatorio) {
    setBusyId(reminder.id);
    try {
      await apiRequest(`/recordatorios/${reminder.id}/estado`, session, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'PENDIENTE' }),
      });
      addToast({ message: 'Recordatorio vuelto a pendiente', type: 'success' });
      await refresh();
    } catch (error) {
      fail(error, 'No se pudo reabrir el recordatorio');
    } finally {
      setBusyId(null);
    }
  }

  async function handleNotify(reminder: BackendRecordatorio) {
    setBusyId(reminder.id);
    try {
      const response = await apiRequest<ApiEntityResponse<ResultadoNotificacion>>(`/recordatorios/${reminder.id}/notificar`, session, { method: 'POST' });
      if (response.data.resultado === 'ENVIADO') {
        addToast({ message: `Notificación enviada a ${reminder.motocicleta?.cliente?.email ?? 'el cliente'}`, type: 'success' });
      } else {
        addToast({ message: 'El cliente no tiene correo registrado. El recordatorio sigue pendiente.', type: 'warning' });
      }
      await refresh();
    } catch (error) {
      fail(error, 'No se pudo enviar la notificación');
    } finally {
      setBusyId(null);
    }
  }

  async function handleNotifyAll() {
    setNotifyingAll(true);
    try {
      const response = await apiRequest<ApiEntityResponse<ResumenNotificaciones>>('/recordatorios/notificar', session, { method: 'POST' });
      const { enviados, sinCorreo, fallidos, revisados } = response.data;
      addToast({
        message: revisados === 0
          ? 'No hay vencidos por notificar.'
          : `Enviadas: ${enviados}. Sin correo: ${sinCorreo}. Fallidas: ${fallidos}.`,
        type: fallidos > 0 ? 'warning' : 'success',
      });
      await refresh();
    } catch (error) {
      fail(error, 'No se pudieron enviar las notificaciones');
    } finally {
      setNotifyingAll(false);
    }
  }

  async function handleCreateNext() {
    const e = validateReminderForm(nextForm);
    if (Object.keys(e).length) { setNextErrors(e); return; }
    setSaving(true);
    try {
      await apiRequest('/recordatorios', session, {
        method: 'POST',
        body: JSON.stringify({ ...toRecordatorioPayload(nextForm), ordenOrigenId: nextReminderModal?.ordenOrigenId ?? null }),
      });
      addToast({ message: 'Próximo recordatorio programado', type: 'success' });
      setNextReminderModal(null);
      await refresh();
    } catch (error) {
      fail(error, 'No se pudo programar el próximo recordatorio');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'moto', header: 'Motocicleta / Cliente', render: (r: BackendRecordatorio) => (
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#f97316]">{r.motocicleta?.placa}</span>
          <span className="text-xs text-[#8b949e]">{r.motocicleta?.marca} {r.motocicleta?.modelo}</span>
          {r.vencido && (
            <span className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded font-mono">VENCIDO</span>
          )}
        </div>
        <div className="text-xs text-[#6e7681] mt-0.5">{r.motocicleta?.cliente?.nombreRazonSocial}</div>
      </div>
    )},
    { key: 'type', header: 'Mantenimiento', render: (r: BackendRecordatorio) => (
      <div>
        <span className="text-sm text-[#e6edf3]">{r.tipoMantenimiento}</span>
        {r.descripcion && <div className="text-xs text-[#6e7681] mt-0.5 max-w-xs truncate" title={r.descripcion}>{r.descripcion}</div>}
      </div>
    )},
    { key: 'trigger', header: 'Programado', render: (r: BackendRecordatorio) => (
      <div className="text-xs space-y-0.5">
        {r.fechaObjetivo && (
          <div className={`font-mono ${r.vencidoPorFecha ? 'text-red-400' : 'text-[#8b949e]'}`}>
            📅 {formatFecha(r.fechaObjetivo)}
          </div>
        )}
        {r.kilometrajeObjetivo !== null && (
          <div className={`font-mono ${r.vencidoPorKm ? 'text-red-400' : 'text-[#8b949e]'}`}>
            ⊙ {r.kilometrajeObjetivo.toLocaleString('es-CO')} km
            {r.motocicleta?.kilometrajeActual != null && (
              <span className="text-[#6e7681]"> (actual {r.motocicleta.kilometrajeActual.toLocaleString('es-CO')})</span>
            )}
          </div>
        )}
      </div>
    )},
    { key: 'status', header: 'Estado', render: (r: BackendRecordatorio) => (
      <Badge variant={ESTADO_BADGE[r.estado].badge}>{ESTADO_BADGE[r.estado].label}</Badge>
    )},
    { key: 'notif', header: 'Notif.', render: (r: BackendRecordatorio) => (
      r.estado === 'PENDIENTE' ? (
        <span className={`text-xs font-mono ${r.notificacionEnviadaAt ? 'text-emerald-400' : 'text-[#6e7681]'}`}>
          {r.notificacionEnviadaAt ? '✓ Enviada' : '— Pendiente'}
        </span>
      ) : <span className="text-xs text-[#6e7681]">—</span>
    )},
    { key: 'actions', header: '', render: (r: BackendRecordatorio) => (
      <div className="flex gap-1 justify-end flex-wrap">
        {r.estado === 'PENDIENTE' ? (
          <>
            {!r.notificacionEnviadaAt && (
              <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void handleNotify(r)}>Notificar</Button>
            )}
            <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => setConfirmAction({ reminder: r, action: 'complete' })}>Completar</Button>
            <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => setConfirmAction({ reminder: r, action: 'cancel' })}>Cancelar</Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void handleReopen(r)}>Reabrir</Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Recordatorios de Mantenimiento</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-11 · Seguimiento y alertas de servicios programados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" disabled={notifyingAll || overdueCount === 0} onClick={() => void handleNotifyAll()}>
            {notifyingAll ? 'Enviando...' : 'Notificar vencidos'}
          </Button>
          <Button onClick={() => { setForm(emptyReminderForm()); setErrors({}); setModalOpen(true); }} icon={<span className="text-base">+</span>}>
            Nuevo recordatorio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: reminders.length, color: 'text-[#e6edf3]' },
          { label: 'Pendientes', value: reminders.filter(r => r.estado === 'PENDIENTE').length, color: 'text-yellow-400' },
          { label: 'Vencidos', value: overdueCount, color: overdueCount > 0 ? 'text-red-400' : 'text-[#6e7681]' },
          { label: 'Completados', value: reminders.filter(r => r.estado === 'COMPLETADO').length, color: 'text-emerald-400' },
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
          <span className="text-sm text-red-300 font-medium">
            {overdueCount} recordatorio{overdueCount > 1 ? 's han' : ' ha'} alcanzado su fecha o kilometraje estimado.
          </span>
          <button onClick={() => setFilterStatus('overdue')} className="ml-auto text-xs text-red-400 hover:underline">Ver vencidos</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por placa, cliente o tipo..." />
        </div>
        <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-xs">
          {[['all', 'Todos'], ['PENDIENTE', 'Pendientes'], ['overdue', 'Vencidos'], ['COMPLETADO', 'Completados'], ['CANCELADO', 'Cancelados']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatus(v as string)}
              className={`whitespace-nowrap px-3 py-2 transition-colors ${filterStatus === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} emptyMessage={loading ? 'Cargando recordatorios...' : 'No se encontraron recordatorios'} />

      <Modal title="Nuevo recordatorio de mantenimiento" open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={() => void handleCreate()} loading={saving} width="max-w-lg">
        <ReminderFormFields form={form} setForm={setForm} errors={errors} motoOptions={motoOptions} />
      </Modal>

      <Modal
        title="Programar próximo mantenimiento"
        open={!!nextReminderModal}
        onClose={() => setNextReminderModal(null)}
        onConfirm={() => void handleCreateNext()}
        loading={saving}
        confirmLabel="Programar próximo"
        width="max-w-lg"
      >
        <div className="mb-4 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-300">
          ✓ Mantenimiento "{nextReminderModal?.tipoMantenimiento}" completado. Configura el próximo recordatorio o cierra esta ventana para omitirlo.
        </div>
        <ReminderFormFields form={nextForm} setForm={setNextForm} errors={nextErrors} motoOptions={motoOptions} fixedMoto />
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.action === 'complete' ? 'Marcar como completado' : 'Cancelar recordatorio'}
        message={confirmAction?.action === 'complete'
          ? `¿Confirmar que el mantenimiento "${confirmAction?.reminder.tipoMantenimiento}" fue realizado? Se te ofrecerá programar el próximo recordatorio.`
          : `¿Cancelar el recordatorio de "${confirmAction?.reminder.tipoMantenimiento}" para ${confirmAction?.reminder.motocicleta?.placa}?`}
        confirmLabel={confirmAction?.action === 'complete' ? 'Sí, completado' : 'Cancelar recordatorio'}
        destructive={confirmAction?.action === 'cancel'}
        onConfirm={() => void handleAction()}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}

// ─── Campos del formulario ─────────────────────────────────────────────────

interface FieldsProps {
  form: ReminderForm;
  setForm: React.Dispatch<React.SetStateAction<ReminderForm>>;
  errors: Record<string, string>;
  motoOptions: { value: string; label: string }[];
  fixedMoto?: boolean;
}

function ReminderFormFields({ form, setForm, errors, motoOptions, fixedMoto }: FieldsProps) {
  const set = (cambios: Partial<ReminderForm>) => setForm(f => ({ ...f, ...cambios }));
  const mtOptions = MAINTENANCE_TYPES.map(t => ({ value: t, label: t }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="reminder-motorcycle" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Motocicleta *</label>
        <select
          id="reminder-motorcycle"
          value={form.motocicletaId}
          onChange={e => set({ motocicletaId: e.target.value })}
          disabled={fixedMoto}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316] disabled:opacity-60"
        >
          {motoOptions.map(o => <option key={o.value} value={o.value} className="bg-[#161b22]">{o.label}</option>)}
        </select>
        {errors['motocicletaId'] && <span className="text-xs text-[#ef4444]">{errors['motocicletaId']}</span>}
      </div>

      <Select label="Tipo de mantenimiento *" options={mtOptions} value={form.maintenanceType} onChange={e => set({ maintenanceType: e.target.value })} />
      {form.maintenanceType === 'Otro' && (
        <Input
          label="Especifica el tipo *"
          value={form.customMaintenanceType}
          onChange={e => set({ customMaintenanceType: e.target.value })}
          error={errors['customMaintenanceType']}
          placeholder="Ej: Cambio de amortiguadores"
        />
      )}

      <Select label="Tipo de recordatorio *" options={TRIGGER_OPTIONS} value={form.triggerType} onChange={e => set({ triggerType: e.target.value as ReminderTrigger })} />

      {(form.triggerType === 'date' || form.triggerType === 'both') && (
        <Input label="Fecha estimada *" type="date" value={form.fechaObjetivo} onChange={e => set({ fechaObjetivo: e.target.value })} error={errors['fechaObjetivo']} />
      )}
      {(form.triggerType === 'km' || form.triggerType === 'both') && (
        <Input
          label="Kilometraje estimado *"
          type="number"
          value={form.kilometrajeObjetivo}
          onChange={e => set({ kilometrajeObjetivo: Number(e.target.value) || '' })}
          error={errors['kilometrajeObjetivo']}
          placeholder="14500"
        />
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="reminder-observations" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones</label>
        <textarea
          id="reminder-observations"
          value={form.descripcion}
          onChange={e => set({ descripcion: e.target.value })}
          rows={2}
          maxLength={1000}
          placeholder="Notas adicionales sobre el mantenimiento..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none"
        />
      </div>
    </div>
  );
}
