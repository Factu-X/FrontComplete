import React, { useState, useMemo } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import { ToastItem } from '../molecules/ToastContainer';
import { Invoice, CreditNote, CreditNoteStatus, DIANTransmissionStatus } from '../../types';

const REASON_CODES = [
  { value: '1', label: '1 — Devolución parcial de los bienes' },
  { value: '2', label: '2 — Anulación de factura electrónica' },
  { value: '3', label: '3 — Rebaja o descuento parcial' },
  { value: '4', label: '4 — Ajuste de precio' },
  { value: '5', label: '5 — Otro' },
];

const STATUS_BADGE: Record<CreditNoteStatus, 'active' | 'inactive' | 'warning' | 'service'> = {
  generated: 'service', transmitted: 'warning', validated: 'active', rejected: 'inactive',
};

const DIAN_STATUS_COLOR: Record<DIANTransmissionStatus, string> = {
  pending: 'text-[#6e7681]', sent: 'text-blue-400', validated: 'text-emerald-400', rejected: 'text-red-400', error: 'text-yellow-400',
};

function generateCUDE(creditNoteNumber: string, invoiceNumber: string, amount: number): string {
  const raw = `${creditNoteNumber}${invoiceNumber}${amount}${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `nc${hex}`.repeat(8).slice(0, 64);
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

interface Props {
  creditNotes: CreditNote[];
  setCreditNotes: React.Dispatch<React.SetStateAction<CreditNote[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function CreditNoteManager({ creditNotes, setCreditNotes, invoices, setInvoices, addToast }: Props) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | ''>('');
  const [reasonCode, setReasonCode] = useState('1');
  const [amount, setAmount] = useState('');
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [transmitting, setTransmitting] = useState<number | null>(null);

  // Invoices that can receive a credit note (not cancelled, not fully adjusted)
  const eligibleInvoices = useMemo(() =>
    invoices.filter(i => i.status !== 'cancelled' && i.total - i.creditNotesTotal > 0),
    [invoices]
  );

  const invoiceOptions = [
    { value: '', label: 'Seleccionar factura...' },
    ...eligibleInvoices.map(i => ({ value: String(i.id), label: `${i.invoiceNumber} — ${i.customerName} — ${fmt(i.total - i.creditNotesTotal)} disponible` })),
  ];

  const selectedInvoice = invoices.find(i => i.id === Number(selectedInvoiceId));
  const availableBalance = selectedInvoice ? selectedInvoice.total - selectedInvoice.creditNotesTotal : 0;

  const filtered = useMemo(() => creditNotes.filter(cn => {
    const q = search.toLowerCase();
    return !q || cn.creditNoteNumber.toLowerCase().includes(q) || cn.customerName.toLowerCase().includes(q) || cn.invoiceNumber.toLowerCase().includes(q);
  }).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()), [creditNotes, search]);

  function validate() {
    const e: Record<string, string> = {};
    if (!selectedInvoiceId) e.invoice = 'Selecciona una factura';
    if (!amount || Number(amount) <= 0) e.amount = 'El valor debe ser mayor a 0';
    if (Number(amount) > availableBalance) e.amount = `El valor supera el saldo disponible (${fmt(availableBalance)})`;
    if (!reasonCode) e.reason = 'Selecciona el motivo';
    return e;
  }

  function handleCreate() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const inv = selectedInvoice!;
    setTimeout(() => {
      const nextNum = creditNotes.length + 1;
      const creditNoteNumber = `NC-${String(nextNum).padStart(4, '0')}`;
      const amountVal = Number(amount);
      const reasonLabel = REASON_CODES.find(r => r.value === reasonCode)?.label ?? reasonCode;
      const cn: CreditNote = {
        id: Date.now(), creditNoteNumber,
        cude: generateCUDE(creditNoteNumber, inv.invoiceNumber, amountVal),
        invoiceId: inv.id, invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId, customerName: inv.customerName,
        reasonCode, reason: reasonLabel, amount: amountVal,
        issuedAt: new Date().toISOString(),
        status: 'generated', dianStatus: 'pending',
        transmissionAttempts: 0, observations,
      };
      setCreditNotes(prev => [cn, ...prev]);
      // Update invoice balance
      const newCreditNotesTotal = inv.creditNotesTotal + amountVal;
      const newBalance = inv.total - newCreditNotesTotal - inv.paidAmount;
      setInvoices(prev => prev.map(i => i.id === inv.id ? {
        ...i, creditNotesTotal: newCreditNotesTotal,
        paymentStatus: newBalance <= 0 ? 'paid' : i.paymentStatus,
      } : i));
      addToast({ message: `Nota crédito ${creditNoteNumber} generada`, type: 'success' });
      setSaving(false);
      setModalOpen(false);
      setSelectedInvoiceId('');
      setAmount('');
      setObservations('');
      setErrors({});
    }, 600);
  }

  function handleTransmit(cn: CreditNote) {
    setTransmitting(cn.id);
    setTimeout(() => {
      const success = Math.random() < 0.75;
      const dianStatus: DIANTransmissionStatus = success ? 'validated' : Math.random() < 0.7 ? 'rejected' : 'error';
      setCreditNotes(prev => prev.map(c => c.id === cn.id ? {
        ...c, dianStatus, status: dianStatus === 'validated' ? 'validated' : c.status,
        dianResponse: dianStatus === 'validated' ? 'Nota crédito validada por la DIAN.' : dianStatus === 'rejected' ? 'Documento rechazado: firma no válida.' : 'Error de conectividad.',
        transmissionAttempts: c.transmissionAttempts + 1, lastTransmissionAt: new Date().toISOString(),
      } : c));
      addToast({ message: dianStatus === 'validated' ? `${cn.creditNoteNumber} validada por la DIAN` : `${cn.creditNoteNumber}: ${dianStatus === 'rejected' ? 'rechazada' : 'error de conexión'}`, type: dianStatus === 'validated' ? 'success' : 'error' });
      setTransmitting(null);
    }, 1200);
  }

  const columns = [
    { key: 'number', header: 'N° NC', render: (cn: CreditNote) => <span className="font-mono text-xs font-bold text-yellow-400">{cn.creditNoteNumber}</span> },
    { key: 'date', header: 'Fecha', render: (cn: CreditNote) => <span className="font-mono text-xs text-[#6e7681]">{new Date(cn.issuedAt).toLocaleDateString('es-CO')}</span> },
    { key: 'invoice', header: 'Factura afectada', render: (cn: CreditNote) => (
      <div><div className="font-mono text-xs text-[#f97316] font-semibold">{cn.invoiceNumber}</div><div className="text-xs text-[#6e7681]">{cn.customerName}</div></div>
    )},
    { key: 'reason', header: 'Motivo', render: (cn: CreditNote) => <span className="text-xs text-[#8b949e]">{cn.reason.split(' — ')[0]}. {cn.reason.split(' — ')[1] ?? ''}</span> },
    { key: 'amount', header: 'Valor NC', render: (cn: CreditNote) => <span className="font-mono text-sm font-semibold text-red-400">-{fmt(cn.amount)}</span> },
    { key: 'status', header: 'Estado', render: (cn: CreditNote) => <Badge variant={STATUS_BADGE[cn.status]}>{cn.status === 'generated' ? 'Generada' : cn.status === 'validated' ? 'Validada' : cn.status === 'transmitted' ? 'Transmitida' : 'Rechazada'}</Badge> },
    { key: 'dian', header: 'DIAN', render: (cn: CreditNote) => <span className={`text-xs font-mono ${DIAN_STATUS_COLOR[cn.dianStatus]}`}>{cn.dianStatus === 'validated' ? 'Validada ✓' : cn.dianStatus === 'rejected' ? 'Rechazada ✕' : cn.dianStatus === 'sent' ? 'Enviada' : cn.dianStatus === 'error' ? 'Error' : 'Pendiente'}</span> },
    { key: 'actions', header: '', render: (cn: CreditNote) => (
      <div className="flex gap-1 justify-end">
        {(cn.dianStatus === 'pending' || cn.dianStatus === 'rejected' || cn.dianStatus === 'error') && (
          <Button size="sm" variant="outline" loading={transmitting === cn.id} onClick={() => handleTransmit(cn)}>
            {cn.dianStatus === 'pending' ? 'Transmitir' : 'Reintentar'}
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Notas Crédito</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-08 · Ajustes, anulaciones y devoluciones sobre facturas emitidas</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setErrors({}); setSelectedInvoiceId(''); setAmount(''); setObservations(''); setReasonCode('1'); }} icon={<span>+</span>}>
          Nueva nota crédito
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Notas crédito emitidas', value: creditNotes.length, color: 'text-[#e6edf3]' },
          { label: 'Validadas DIAN', value: creditNotes.filter(c => c.dianStatus === 'validated').length, color: 'text-emerald-400' },
          { label: 'Total ajustado', value: fmt(creditNotes.reduce((s, c) => s + c.amount, 0)), color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-[#1c2128] border border-[#30363d] rounded-[6px] text-xs text-[#6e7681]">
        ⊙ Las notas crédito afectan el saldo de la factura original sin modificar ni eliminar el documento. El CUDE se calcula conforme al Anexo Técnico DIAN.
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por N° NC, factura o cliente..." />
      <DataTable columns={columns} data={filtered} emptyMessage="No se han generado notas crédito" />

      {/* Create Modal */}
      <Modal title="Nueva nota crédito" open={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleCreate} loading={saving} confirmLabel="Generar nota crédito">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Factura afectada *</label>
            <select
              value={selectedInvoiceId}
              onChange={e => setSelectedInvoiceId(Number(e.target.value) || '')}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]"
            >
              {invoiceOptions.map(o => <option key={o.value} value={o.value} className="bg-[#161b22]">{o.label}</option>)}
            </select>
            {errors.invoice && <span className="text-xs text-[#ef4444]">{errors.invoice}</span>}
          </div>

          {selectedInvoice && (
            <div className="px-3 py-2 bg-[#1c2128] border border-[#30363d] rounded text-xs">
              <div className="flex justify-between"><span className="text-[#6e7681]">Total factura:</span><span className="font-mono text-[#e6edf3]">{fmt(selectedInvoice.total)}</span></div>
              <div className="flex justify-between mt-0.5"><span className="text-[#6e7681]">NC previas:</span><span className="font-mono text-red-400">-{fmt(selectedInvoice.creditNotesTotal)}</span></div>
              <div className="flex justify-between mt-0.5 font-semibold"><span className="text-[#6e7681]">Saldo disponible:</span><span className="font-mono text-[#f97316]">{fmt(availableBalance)}</span></div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Motivo *</label>
            <select value={reasonCode} onChange={e => setReasonCode(e.target.value)} className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]">
              {REASON_CODES.map(r => <option key={r.value} value={r.value} className="bg-[#161b22]">{r.label}</option>)}
            </select>
            {errors.reason && <span className="text-xs text-[#ef4444]">{errors.reason}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Valor del ajuste (COP) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" max={availableBalance}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]" />
            {errors.amount && <span className="text-xs text-[#ef4444]">{errors.amount}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones</label>
            <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} placeholder="Descripción del ajuste..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
