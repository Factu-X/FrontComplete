import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import ConfirmDialog from '../molecules/ConfirmDialog';
import { ToastItem } from '../molecules/ToastContainer';
import { apiDownload, apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import {
  NIVEL_LABEL, PRIORIDADES, PRIORIDAD_BADGE, PRIORIDAD_LABEL, SUS_QUESTIONS, calcSus, ordenarPorPrioridad, susLabel,
} from '../../lib/usability';
import type {
  BackendHallazgoUsabilidad, BackendSesionUsabilidad, PrioridadHallazgo, ResumenUsabilidad, TareasBaseUsabilidad,
} from '../../lib/types';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

type TaskRow = { tarea: string; completada: boolean; errores: number };
type FindingDraft = { id: number; descripcion: string; pantalla: string; prioridad: PrioridadHallazgo };

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function UsabilityTest({ session, addToast }: Props) {
  const [sessions, setSessions] = useState<BackendSesionUsabilidad[]>([]);
  const [summary, setSummary] = useState<ResumenUsabilidad | null>(null);
  const [baseTasks, setBaseTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BackendSesionUsabilidad | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [participantName, setParticipantName] = useState('');
  const [participantRole, setParticipantRole] = useState('');
  const [sessionDate, setSessionDate] = useState(today());
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [observations, setObservations] = useState('');
  const [answers, setAnswers] = useState<number[]>(SUS_QUESTIONS.map(() => 3));
  const [findings, setFindings] = useState<FindingDraft[]>([]);
  const [newFinding, setNewFinding] = useState({ descripcion: '', pantalla: '', prioridad: 'ALTA' as PrioridadHallazgo });
  const [nameError, setNameError] = useState('');

  const fail = (error: unknown, fallback: string) =>
    addToast({ message: error instanceof Error ? error.message : fallback, type: 'error' });

  async function load() {
    try {
      const [list, resumen] = await Promise.all([
        apiRequest<ApiListResponse<BackendSesionUsabilidad>>('/usabilidad/sesiones', session),
        apiRequest<ApiEntityResponse<ResumenUsabilidad>>('/usabilidad/resumen', session),
      ]);
      setSessions(list.data);
      setSummary(resumen.data);
    } catch (error) {
      fail(error, 'No se pudieron cargar las sesiones de usabilidad');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    apiRequest<ApiEntityResponse<TareasBaseUsabilidad>>('/usabilidad/tareas-base', session)
      .then(response => setBaseTasks(response.data.tareas))
      .catch(error => fail(error, 'No se pudieron cargar las tareas base'));
  }, [session.token]);

  const currentSus = calcSus(answers);
  const avgSus = summary?.sus.promedio ?? 0;
  const allFindings = sessions.flatMap(s => s.hallazgos.map(h => ({ ...h, participante: s.participante })));
  const detail = sessions.find(s => s.id === detailId) ?? null;

  function resetForm() {
    setParticipantName(''); setParticipantRole(''); setSessionDate(today()); setObservations('');
    setTasks(baseTasks.map(tarea => ({ tarea, completada: true, errores: 0 })));
    setAnswers(SUS_QUESTIONS.map(() => 3)); setFindings([]); setNameError('');
    setNewFinding({ descripcion: '', pantalla: '', prioridad: 'ALTA' }); setStep(1);
  }

  function next() {
    if (step === 1 && !participantName.trim()) { setNameError('El nombre del participante es obligatorio'); return; }
    setNameError('');
    setStep(step + 1);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await apiRequest<ApiEntityResponse<BackendSesionUsabilidad>>('/usabilidad/sesiones', session, {
        method: 'POST',
        body: JSON.stringify({
          participante: participantName.trim(),
          perfil: participantRole.trim() || null,
          fechaSesion: sessionDate,
          observaciones: observations.trim() || null,
          susRespuestas: answers,
          tareas: tasks,
          hallazgos: findings.map(({ descripcion, pantalla, prioridad }) => ({ descripcion, pantalla: pantalla.trim() || null, prioridad })),
        }),
      });
      addToast({ message: `Sesión de ${response.data.participante} registrada — SUS: ${response.data.susPuntaje.toFixed(1)}`, type: 'success' });
      setModalOpen(false);
      await load();
    } catch (error) {
      fail(error, 'No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }

  function addFinding() {
    if (!newFinding.descripcion.trim()) return;
    setFindings(prev => [...prev, { ...newFinding, descripcion: newFinding.descripcion.trim(), id: Date.now() }]);
    setNewFinding({ descripcion: '', pantalla: '', prioridad: 'ALTA' });
  }

  async function updateFinding(hallazgo: BackendHallazgoUsabilidad, cambios: { enBacklog?: boolean; resuelto?: boolean }) {
    try {
      await apiRequest(`/usabilidad/hallazgos/${hallazgo.id}`, session, { method: 'PATCH', body: JSON.stringify(cambios) });
      await load();
    } catch (error) {
      fail(error, 'No se pudo actualizar el hallazgo');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/usabilidad/sesiones/${deleting.id}`, session, { method: 'DELETE' });
      addToast({ message: 'Sesión eliminada', type: 'warning' });
      setDeleting(null);
      setDetailId(null);
      await load();
    } catch (error) {
      fail(error, 'No se pudo eliminar la sesión');
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await apiDownload('/usabilidad/informe', session, 'informe-usabilidad.md');
    } catch (error) {
      fail(error, 'No se pudo generar el informe');
    } finally {
      setDownloading(false);
    }
  }

  const sessionColumns = [
    { key: 'participant', header: 'Participante', render: (s: BackendSesionUsabilidad) => (
      <div><div className="font-medium text-[#e6edf3]">{s.participante}</div><div className="text-xs text-[#6e7681]">{s.perfil}</div></div>
    )},
    { key: 'date', header: 'Fecha', render: (s: BackendSesionUsabilidad) => <span className="font-mono text-xs text-[#6e7681]">{s.fechaSesion}</span> },
    { key: 'tasks', header: 'Tareas', render: (s: BackendSesionUsabilidad) => (
      <span className="font-mono text-xs">{s.tareas.filter(t => t.completada).length}/{s.tareas.length}</span>
    )},
    { key: 'sus', header: 'Puntaje SUS', render: (s: BackendSesionUsabilidad) => {
      const { label, color } = susLabel(s.susPuntaje);
      return <div><span className={`font-mono font-bold text-lg ${color}`}>{s.susPuntaje.toFixed(1)}</span> <span className={`text-xs ${color}`}>{label}</span></div>;
    }},
    { key: 'findings', header: 'Hallazgos', render: (s: BackendSesionUsabilidad) => <span className="font-mono text-xs text-[#8b949e]">{s.hallazgos.length}</span> },
    { key: 'actions', header: '', render: (s: BackendSesionUsabilidad) => <Button size="sm" variant="ghost" onClick={() => setDetailId(s.id)}>Ver</Button> },
  ];

  const criticalPending = summary?.hallazgos.criticosPendientes ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Pruebas de Usabilidad (SUS)</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-14 · Evaluación de usabilidad con usuarios piloto</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" disabled={downloading || sessions.length === 0} onClick={() => void handleDownload()}>
            {downloading ? 'Generando...' : 'Descargar informe'}
          </Button>
          <Button onClick={() => { resetForm(); setModalOpen(true); }} icon={<span>+</span>} disabled={baseTasks.length === 0}>Nueva sesión</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sesiones realizadas', value: summary?.sesiones ?? 0, color: 'text-[#e6edf3]' },
          { label: 'Promedio SUS', value: summary?.sus.promedio != null ? summary.sus.promedio.toFixed(1) : '—', color: susLabel(avgSus).color },
          { label: 'Hallazgos críticos pendientes', value: criticalPending, color: criticalPending > 0 ? 'text-red-400' : 'text-[#6e7681]' },
          { label: 'Tareas completadas', value: summary && summary.sesiones ? `${summary.tareas.tasaExito}%` : '—', color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] px-5 py-4">
        <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Escala de referencia SUS</div>
        <div className="flex gap-1 h-4">
          {[{ label: 'Deficiente', c: 'bg-red-500' }, { label: 'Regular', c: 'bg-yellow-500' }, { label: 'Bueno', c: 'bg-blue-500' }, { label: 'Excelente', c: 'bg-emerald-500' }].map(s => (
            <div key={s.label} className={`${s.c} rounded h-full w-1/4`} title={s.label} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[#6e7681] font-mono mt-1">
          <span>0</span><span>50 Regular</span><span>70 Bueno</span><span>85 Excelente</span><span>100</span>
        </div>
        {summary?.sus.promedio != null && summary.sus.nivel && (
          <div className={`mt-2 text-sm font-semibold ${susLabel(avgSus).color}`}>
            Resultado del piloto: {summary.sus.promedio.toFixed(1)} — {NIVEL_LABEL[summary.sus.nivel]} (referencia de la industria: {summary.sus.referencia})
          </div>
        )}
      </div>

      {allFindings.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">
            Hallazgos registrados ({allFindings.length}) · En backlog: {summary?.hallazgos.enBacklog ?? 0}
          </div>
          <div className="flex flex-col gap-2">
            {ordenarPorPrioridad(allFindings).map(f => (
              <div key={f.id} className={`flex flex-wrap items-start gap-3 px-4 py-3 rounded-[6px] border ${f.resuelto ? 'opacity-60 border-[#30363d]' : 'border-[#30363d] bg-[#161b22]'}`}>
                <Badge variant={PRIORIDAD_BADGE[f.prioridad]}>{PRIORIDAD_LABEL[f.prioridad]}</Badge>
                <div className="flex-1 min-w-48">
                  <div className={`text-sm ${f.resuelto ? 'line-through text-[#6e7681]' : 'text-[#e6edf3]'}`}>{f.descripcion}</div>
                  <div className="text-xs text-[#6e7681] mt-0.5">
                    {f.pantalla ? `Pantalla: ${f.pantalla} · ` : ''}Reportado por {f.participante}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={f.enBacklog ? 'outline' : 'ghost'} onClick={() => void updateFinding(f, { enBacklog: !f.enBacklog })}>
                    {f.enBacklog ? '✓ En backlog' : 'Pasar a backlog'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void updateFinding(f, { resuelto: !f.resuelto })}>
                    {f.resuelto ? 'Reabrir' : 'Resolver'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable columns={sessionColumns} data={sessions} emptyMessage={loading ? 'Cargando sesiones...' : 'No hay sesiones registradas'} />

      <Modal
        title={`Nueva sesión de usabilidad — Paso ${step}/3`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        width="max-w-2xl"
        onConfirm={step === 3 ? () => void handleSave() : next}
        confirmLabel={step === 3 ? 'Guardar sesión' : 'Siguiente'}
        loading={saving}
      >
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="text-sm font-semibold text-[#e6edf3] mb-1">Datos del participante y tareas</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nombre participante *" value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder="Carlos M." error={nameError} />
              <Input label="Perfil / Rol" value={participantRole} onChange={e => setParticipantRole(e.target.value)} placeholder="Mecánico / Administrador" />
            </div>
            <Input label="Fecha de sesión" type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
            <div>
              <div className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Tareas evaluadas (sin guiar al participante)</div>
              {tasks.map((task, i) => (
                <div key={task.tarea} className="flex flex-wrap items-center gap-3 py-2 border-b border-[#30363d]/40">
                  <input
                    id={`task-${i}`}
                    type="checkbox"
                    checked={task.completada}
                    onChange={() => setTasks(prev => prev.map((t, j) => j === i ? { ...t, completada: !t.completada } : t))}
                    className="accent-[#f97316]"
                  />
                  <label htmlFor={`task-${i}`} className="flex-1 min-w-48 text-sm text-[#e6edf3]">{task.tarea}</label>
                  <label className="flex items-center gap-2 text-xs text-[#6e7681]">
                    Errores
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={task.errores}
                      onChange={e => setTasks(prev => prev.map((t, j) => j === i ? { ...t, errores: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : t))}
                      className="w-16 bg-[#0d1117] border border-[#30363d] rounded-[6px] px-2 py-1 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]"
                    />
                  </label>
                </div>
              ))}
              <div className="text-xs text-[#6e7681] mt-1 font-mono">{tasks.filter(t => t.completada).length}/{tasks.length} tareas completadas</div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="usability-observations" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones generales</label>
              <textarea id="usability-observations" value={observations} onChange={e => setObservations(e.target.value)} rows={3} maxLength={4000} placeholder="Dificultades, errores, dudas del participante..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-[#e6edf3] mb-1">Cuestionario SUS — del 1 (muy en desacuerdo) al 5 (muy de acuerdo)</div>
            {SUS_QUESTIONS.map((q, i) => (
              <div key={q} className="flex items-start gap-4 py-2.5 border-b border-[#30363d]/40">
                <div className="flex-1 text-sm text-[#e6edf3]"><span className="text-[#6e7681] text-xs font-mono mr-2">{i + 1}.</span>{q}</div>
                <div className="flex gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setAnswers(prev => prev.map((a, j) => j === i ? n : a))}
                      className={`w-8 h-8 rounded text-xs font-mono font-bold transition-all ${answers[i] === n ? 'bg-[#f97316] text-[#0d1117]' : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className={`text-center py-3 font-bold text-2xl font-mono ${susLabel(currentSus).color}`}>
              Puntaje SUS provisional: {currentSus.toFixed(1)} — {susLabel(currentSus).label}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="text-sm font-semibold text-[#e6edf3] mb-1">Hallazgos y problemas encontrados</div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input label="Descripción del hallazgo" value={newFinding.descripcion} onChange={e => setNewFinding(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del problema..." />
                <Input label="Pantalla / módulo" value={newFinding.pantalla} onChange={e => setNewFinding(f => ({ ...f, pantalla: e.target.value }))} placeholder="Ej: Clientes" />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="finding-priority" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Prioridad (las críticas pasan al backlog)</label>
                  <select id="finding-priority" value={newFinding.prioridad} onChange={e => setNewFinding(f => ({ ...f, prioridad: e.target.value as PrioridadHallazgo }))} className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]">
                    {PRIORIDADES.map(p => <option key={p} value={p} className="bg-[#161b22]">{PRIORIDAD_LABEL[p]}</option>)}
                  </select>
                </div>
                <Button variant="outline" onClick={addFinding} disabled={!newFinding.descripcion.trim()}>Agregar</Button>
              </div>
            </div>
            {findings.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#6e7681]">Sin hallazgos registrados para esta sesión</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {findings.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-[#1c2128] rounded border border-[#30363d]">
                    <Badge variant={PRIORIDAD_BADGE[f.prioridad]}>{PRIORIDAD_LABEL[f.prioridad]}</Badge>
                    <span className="flex-1 text-xs text-[#e6edf3]">{f.descripcion}</span>
                    {f.pantalla && <span className="text-[10px] text-[#6e7681]">{f.pantalla}</span>}
                    <button onClick={() => setFindings(prev => prev.filter(x => x.id !== f.id))} aria-label="Quitar hallazgo" className="text-[#6e7681] hover:text-[#ef4444] text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-[#0d1117] border border-[#30363d] rounded px-4 py-3 text-sm">
              <div className="flex justify-between"><span className="text-[#6e7681]">Participante:</span><span className="text-[#e6edf3]">{participantName}</span></div>
              <div className="flex justify-between mt-1"><span className="text-[#6e7681]">Tareas completadas:</span><span className="font-mono">{tasks.filter(t => t.completada).length}/{tasks.length}</span></div>
              <div className="flex justify-between mt-1"><span className="text-[#6e7681]">Puntaje SUS:</span><span className={`font-mono font-bold ${susLabel(currentSus).color}`}>{currentSus.toFixed(1)}</span></div>
              <div className="flex justify-between mt-1"><span className="text-[#6e7681]">Hallazgos:</span><span className="font-mono">{findings.length}</span></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${s === step ? 'bg-[#f97316] w-4' : s < step ? 'bg-[#f97316]/50' : 'bg-[#30363d]'}`} />
          ))}
        </div>
      </Modal>

      {detail && (
        <Modal title={`Sesión — ${detail.participante}`} open onClose={() => setDetailId(null)} width="max-w-xl">
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><span className="text-[#6e7681]">Perfil:</span> <span className="text-[#e6edf3]">{detail.perfil ?? '—'}</span></div>
              <div><span className="text-[#6e7681]">Fecha:</span> <span className="font-mono text-[#e6edf3]">{detail.fechaSesion}</span></div>
              <div><span className="text-[#6e7681]">Tareas:</span> <span className="font-mono">{detail.tareas.filter(t => t.completada).length}/{detail.tareas.length}</span></div>
              <div><span className="text-[#6e7681]">SUS:</span> <span className={`font-mono font-bold text-lg ${susLabel(detail.susPuntaje).color}`}>{detail.susPuntaje.toFixed(1)}</span></div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Tareas</div>
              {detail.tareas.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-[#30363d]/40 text-xs">
                  <span className={t.completada ? 'text-emerald-400' : 'text-red-400'}>{t.completada ? '✓' : '✗'}</span>
                  <span className="flex-1 text-[#e6edf3]">{t.tarea}</span>
                  <span className="font-mono text-[#6e7681]">{t.errores} err.</span>
                </div>
              ))}
            </div>
            {detail.observaciones && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded px-4 py-3 text-xs text-[#8b949e]">{detail.observaciones}</div>
            )}
            {detail.hallazgos.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Hallazgos ({detail.hallazgos.length})</div>
                {ordenarPorPrioridad(detail.hallazgos).map(f => (
                  <div key={f.id} className="flex items-start gap-2 py-2 border-b border-[#30363d]/40">
                    <Badge variant={PRIORIDAD_BADGE[f.prioridad]}>{PRIORIDAD_LABEL[f.prioridad]}</Badge>
                    <div className="flex-1"><div className="text-xs text-[#e6edf3]">{f.descripcion}</div>{f.pantalla && <div className="text-[10px] text-[#6e7681]">{f.pantalla}</div>}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setDeleting(detail)}>Eliminar sesión</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Eliminar sesión"
        message={`¿Eliminar la sesión de ${deleting?.participante}? Se borran también sus tareas y hallazgos, y el promedio SUS se recalcula.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
