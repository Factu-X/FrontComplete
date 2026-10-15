import React, { useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import { ToastItem } from '../molecules/ToastContainer';
import { UsabilitySession, UsabilityFinding, SUSAnswer } from '../../types';

const SUS_QUESTIONS = [
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

const PRIORITY_MAP = { critical: 'admin', high: 'warning', medium: 'service', low: 'inactive' } as const;
const PRIORITY_LABELS = { critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo' };

function calcSUS(answers: SUSAnswer[]): number {
  if (answers.length < 10) return 0;
  const sorted = [...answers].sort((a, b) => a.question - b.question);
  const oddSum = sorted.filter(a => a.question % 2 === 1).reduce((s, a) => s + (a.score - 1), 0);
  const evenSum = sorted.filter(a => a.question % 2 === 0).reduce((s, a) => s + (5 - a.score), 0);
  return (oddSum + evenSum) * 2.5;
}

function susLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excelente', color: 'text-emerald-400' };
  if (score >= 71) return { label: 'Bueno', color: 'text-blue-400' };
  if (score >= 51) return { label: 'Regular', color: 'text-yellow-400' };
  return { label: 'Deficiente', color: 'text-red-400' };
}

const TASKS = [
  'Iniciar sesión en el sistema',
  'Registrar un nuevo cliente con su motocicleta',
  'Crear una orden de servicio para el cliente',
  'Consultar el historial de servicios de la motocicleta',
  'Generar una factura electrónica',
];

const emptyAnswers: SUSAnswer[] = SUS_QUESTIONS.map((_, i) => ({ question: i + 1, score: 3 }));

interface Props {
  sessions: UsabilitySession[];
  setSessions: React.Dispatch<React.SetStateAction<UsabilitySession[]>>;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function UsabilityTest({ sessions, setSessions, addToast }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [detailSession, setDetailSession] = useState<UsabilitySession | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [participantName, setParticipantName] = useState('');
  const [participantRole, setParticipantRole] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [tasksCompleted, setTasksCompleted] = useState(TASKS.length);
  const [observations, setObservations] = useState('');
  const [answers, setAnswers] = useState<SUSAnswer[]>(emptyAnswers);
  const [findings, setFindings] = useState<UsabilityFinding[]>([]);
  const [newFinding, setNewFinding] = useState({ description: '', priority: 'high' as UsabilityFinding['priority'], screen: '' });

  const currentSUS = calcSUS(answers);
  const avgSUS = sessions.length ? sessions.reduce((s, ses) => s + ses.susScore, 0) / sessions.length : 0;

  function resetForm() {
    setParticipantName(''); setParticipantRole(''); setSessionDate(new Date().toISOString().slice(0, 10));
    setTasksCompleted(TASKS.length); setObservations(''); setAnswers(emptyAnswers); setFindings([]);
    setNewFinding({ description: '', priority: 'high', screen: '' }); setStep(1);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      const sus = calcSUS(answers);
      const session: UsabilitySession = {
        id: Date.now(), participantName, participantRole, sessionDate,
        tasksCompleted, totalTasks: TASKS.length, observations, answers, susScore: sus, findings,
      };
      setSessions(prev => [session, ...prev]);
      addToast({ message: `Sesión de ${participantName} registrada — SUS: ${sus.toFixed(1)}`, type: 'success' });
      setSaving(false);
      setModalOpen(false);
      resetForm();
    }, 500);
  }

  function addFinding() {
    if (!newFinding.description.trim()) return;
    setFindings(prev => [...prev, { ...newFinding, id: Date.now(), resolved: false }]);
    setNewFinding({ description: '', priority: 'high', screen: '' });
  }

  const allFindings = sessions.flatMap(s => s.findings);
  const criticalCount = allFindings.filter(f => f.priority === 'critical' && !f.resolved).length;

  const sessionColumns = [
    { key: 'participant', header: 'Participante', render: (s: UsabilitySession) => (
      <div><div className="font-medium text-[#e6edf3]">{s.participantName}</div><div className="text-xs text-[#6e7681]">{s.participantRole}</div></div>
    )},
    { key: 'date', header: 'Fecha', render: (s: UsabilitySession) => <span className="font-mono text-xs text-[#6e7681]">{s.sessionDate}</span> },
    { key: 'tasks', header: 'Tareas', render: (s: UsabilitySession) => (
      <span className="font-mono text-xs">{s.tasksCompleted}/{s.totalTasks}</span>
    )},
    { key: 'sus', header: 'Puntaje SUS', render: (s: UsabilitySession) => {
      const { label, color } = susLabel(s.susScore);
      return <div><span className={`font-mono font-bold text-lg ${color}`}>{s.susScore.toFixed(1)}</span> <span className={`text-xs ${color}`}>{label}</span></div>;
    }},
    { key: 'findings', header: 'Hallazgos', render: (s: UsabilitySession) => <span className="font-mono text-xs text-[#8b949e]">{s.findings.length}</span> },
    { key: 'actions', header: '', render: (s: UsabilitySession) => <Button size="sm" variant="ghost" onClick={() => setDetailSession(s)}>Ver</Button> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Pruebas de Usabilidad (SUS)</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-14 · Evaluación de usabilidad con usuarios piloto</p>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} icon={<span>+</span>}>Nueva sesión</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sesiones realizadas', value: sessions.length, color: 'text-[#e6edf3]' },
          { label: 'Promedio SUS', value: avgSUS ? avgSUS.toFixed(1) : '—', color: susLabel(avgSUS).color },
          { label: 'Hallazgos críticos', value: criticalCount, color: criticalCount > 0 ? 'text-red-400' : 'text-[#6e7681]' },
          { label: 'Total hallazgos', value: allFindings.length, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* SUS scale reference */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] px-5 py-4">
        <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Escala de referencia SUS</div>
        <div className="flex gap-1 h-4">
          {[{label:'Deficiente',w:'25%',c:'bg-red-500'},{label:'Regular',w:'25%',c:'bg-yellow-500'},{label:'Bueno',w:'25%',c:'bg-blue-500'},{label:'Excelente',w:'25%',c:'bg-emerald-500'}].map(s => (
            <div key={s.label} className={`${s.c} rounded h-full`} style={{width:s.w}} title={s.label} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[#6e7681] font-mono mt-1">
          <span>0</span><span>50 Regular</span><span>70 Bueno</span><span>85 Excelente</span><span>100</span>
        </div>
        {avgSUS > 0 && (
          <div className={`mt-2 text-sm font-semibold ${susLabel(avgSUS).color}`}>
            Resultado del piloto: {avgSUS.toFixed(1)} — {susLabel(avgSUS).label}
          </div>
        )}
      </div>

      {/* Findings backlog */}
      {allFindings.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Hallazgos registrados ({allFindings.length})</div>
          <div className="flex flex-col gap-2">
            {allFindings.sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.priority] - order[b.priority];
            }).map(f => (
              <div key={f.id} className={`flex items-start gap-3 px-4 py-3 rounded-[6px] border ${f.resolved ? 'opacity-50 border-[#30363d]' : 'border-[#30363d] bg-[#161b22]'}`}>
                <Badge variant={PRIORITY_MAP[f.priority]}>{PRIORITY_LABELS[f.priority]}</Badge>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${f.resolved ? 'line-through text-[#6e7681]' : 'text-[#e6edf3]'}`}>{f.description}</div>
                  {f.screen && <div className="text-xs text-[#6e7681] mt-0.5">Pantalla: {f.screen}</div>}
                </div>
                <span className="text-xs font-mono text-[#6e7681]">{f.resolved ? '✓ Resuelto' : 'Pendiente'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable columns={sessionColumns} data={sessions} emptyMessage="No hay sesiones registradas" />

      {/* Session form modal - multi-step */}
      <Modal
        title={`Nueva sesión de usabilidad — Paso ${step}/3`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        width="max-w-2xl"
        onConfirm={step === 3 ? handleSave : () => setStep(step + 1)}
        confirmLabel={step === 3 ? 'Guardar sesión' : 'Siguiente'}
        loading={saving}
      >
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="text-sm font-semibold text-[#e6edf3] mb-1">Datos del participante y tareas</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre participante *" value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder="Carlos M." />
              <Input label="Perfil / Rol" value={participantRole} onChange={e => setParticipantRole(e.target.value)} placeholder="Mecánico / Administrador" />
            </div>
            <Input label="Fecha de sesión" type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
            <div>
              <div className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Tareas evaluadas</div>
              {TASKS.map((task, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#30363d]/40">
                  <input type="checkbox" checked={i < tasksCompleted} onChange={() => setTasksCompleted(i < tasksCompleted ? i : i + 1)} className="accent-[#f97316]" />
                  <span className="text-sm text-[#e6edf3]">{task}</span>
                </div>
              ))}
              <div className="text-xs text-[#6e7681] mt-1 font-mono">{tasksCompleted}/{TASKS.length} tareas completadas</div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones generales</label>
              <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} placeholder="Dificultades, errores, comentarios del participante..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-[#e6edf3] mb-1">Cuestionario SUS — Marque del 1 (muy en desacuerdo) al 5 (muy de acuerdo)</div>
            {SUS_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start gap-4 py-2.5 border-b border-[#30363d]/40">
                <div className="flex-1 text-sm text-[#e6edf3]"><span className="text-[#6e7681] text-xs font-mono mr-2">{i + 1}.</span>{q}</div>
                <div className="flex gap-1 shrink-0">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setAnswers(prev => prev.map(a => a.question === i + 1 ? { ...a, score: n } : a))}
                      className={`w-8 h-8 rounded text-xs font-mono font-bold transition-all ${answers.find(a => a.question === i + 1)?.score === n ? 'bg-[#f97316] text-[#0d1117]' : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className={`text-center py-3 font-bold text-2xl font-mono ${susLabel(currentSUS).color}`}>
              Puntaje SUS provisional: {currentSUS.toFixed(1)} — {susLabel(currentSUS).label}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="text-sm font-semibold text-[#e6edf3] mb-1">Hallazgos y problemas encontrados</div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Input label="Descripción del hallazgo" value={newFinding.description} onChange={e => setNewFinding(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del problema..." />
                <Input label="Pantalla / módulo" value={newFinding.screen} onChange={e => setNewFinding(f => ({ ...f, screen: e.target.value }))} placeholder="Ej: Clientes" />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Prioridad</label>
                  <select value={newFinding.priority} onChange={e => setNewFinding(f => ({ ...f, priority: e.target.value as UsabilityFinding['priority'] }))} className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]">
                    <option value="critical" className="bg-[#161b22]">Crítico</option>
                    <option value="high" className="bg-[#161b22]">Alto</option>
                    <option value="medium" className="bg-[#161b22]">Medio</option>
                    <option value="low" className="bg-[#161b22]">Bajo</option>
                  </select>
                </div>
                <Button variant="outline" onClick={addFinding} disabled={!newFinding.description.trim()}>Agregar</Button>
              </div>
            </div>
            {findings.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#6e7681]">Sin hallazgos registrados para esta sesión</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {findings.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-[#1c2128] rounded border border-[#30363d]">
                    <Badge variant={PRIORITY_MAP[f.priority]}>{PRIORITY_LABELS[f.priority]}</Badge>
                    <span className="flex-1 text-xs text-[#e6edf3]">{f.description}</span>
                    {f.screen && <span className="text-[10px] text-[#6e7681]">{f.screen}</span>}
                    <button onClick={() => setFindings(prev => prev.filter(x => x.id !== f.id))} className="text-[#6e7681] hover:text-[#ef4444] text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
            {/* Summary */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded px-4 py-3 text-sm">
              <div className="flex justify-between"><span className="text-[#6e7681]">Participante:</span><span className="text-[#e6edf3]">{participantName}</span></div>
              <div className="flex justify-between mt-1"><span className="text-[#6e7681]">Tareas completadas:</span><span className="font-mono">{tasksCompleted}/{TASKS.length}</span></div>
              <div className="flex justify-between mt-1"><span className="text-[#6e7681]">Puntaje SUS:</span><span className={`font-mono font-bold ${susLabel(currentSUS).color}`}>{currentSUS.toFixed(1)}</span></div>
              <div className="flex justify-between mt-1"><span className="text-[#6e7681]">Hallazgos:</span><span className="font-mono">{findings.length}</span></div>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1,2,3].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${s === step ? 'bg-[#f97316] w-4' : s < step ? 'bg-[#f97316]/50' : 'bg-[#30363d]'}`} />
          ))}
        </div>
      </Modal>

      {/* Detail modal */}
      {detailSession && (
        <Modal title={`Sesión — ${detailSession.participantName}`} open={!!detailSession} onClose={() => setDetailSession(null)} width="max-w-xl">
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[#6e7681]">Perfil:</span> <span className="text-[#e6edf3]">{detailSession.participantRole}</span></div>
              <div><span className="text-[#6e7681]">Fecha:</span> <span className="font-mono text-[#e6edf3]">{detailSession.sessionDate}</span></div>
              <div><span className="text-[#6e7681]">Tareas:</span> <span className="font-mono">{detailSession.tasksCompleted}/{detailSession.totalTasks}</span></div>
              <div><span className="text-[#6e7681]">SUS:</span> <span className={`font-mono font-bold text-lg ${susLabel(detailSession.susScore).color}`}>{detailSession.susScore.toFixed(1)}</span></div>
            </div>
            {detailSession.observations && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded px-4 py-3 text-xs text-[#8b949e]">{detailSession.observations}</div>
            )}
            {detailSession.findings.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Hallazgos ({detailSession.findings.length})</div>
                {detailSession.findings.map(f => (
                  <div key={f.id} className="flex items-start gap-2 py-2 border-b border-[#30363d]/40">
                    <Badge variant={PRIORITY_MAP[f.priority]}>{PRIORITY_LABELS[f.priority]}</Badge>
                    <div className="flex-1"><div className="text-xs text-[#e6edf3]">{f.description}</div>{f.screen && <div className="text-[10px] text-[#6e7681]">{f.screen}</div>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
