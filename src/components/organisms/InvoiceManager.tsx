import React, { useState, useMemo } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import { ToastItem } from '../molecules/ToastContainer';
import { Order, Invoice, InvoiceItem, InvoiceStatus, DIANTransmissionStatus, CompanyConfig, PaymentType } from '../../types';

const IVA_RATE = 0.19;

// ─── DIAN simulated responses ──────────────────────────────────────────────
const DIAN_RESPONSES = {
  success: [
    { code: 'ZD09', msg: 'Documento validado exitosamente por la DIAN.' },
    { code: 'ZD01', msg: 'Factura electrónica recibida y aceptada.' },
  ],
  rejected: [
    { code: 'ZE01', msg: 'El CUFE no coincide con los datos del documento.' },
    { code: 'ZE04', msg: 'La firma digital no es válida o el certificado ha expirado.' },
    { code: 'ZE09', msg: 'El NIT del emisor no se encuentra registrado en el RUT.' },
  ],
};

const STATUS_MAP: Record<InvoiceStatus, { badge: 'active' | 'inactive' | 'warning' | 'service' | 'operator'; label: string }> = {
  draft: { badge: 'warning', label: 'Borrador' },
  generated: { badge: 'service', label: 'Generada' },
  transmitted: { badge: 'operator', label: 'Transmitida' },
  accepted: { badge: 'active', label: 'Aceptada DIAN' },
  cancelled: { badge: 'inactive', label: 'Anulada' },
};

const DIAN_STATUS_MAP: Record<DIANTransmissionStatus, { color: string; label: string }> = {
  pending: { color: 'text-[#6e7681]', label: 'Pendiente envío' },
  sent: { color: 'text-blue-400', label: 'Enviada' },
  validated: { color: 'text-emerald-400', label: 'Validada ✓' },
  rejected: { color: 'text-red-400', label: 'Rechazada ✕' },
  error: { color: 'text-yellow-400', label: 'Error conexión' },
};

function generateCUFE(invoiceNumber: string, nit: string, total: number): string {
  const raw = `${invoiceNumber}${nit}${total}${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}`.repeat(8).slice(0, 64);
}

function buildInvoiceItems(order: Order): InvoiceItem[] {
  return order.items.map((item, i) => {
    const taxRate = item.type === 'part' ? 19 : 0;
    const taxAmount = Math.round(item.subtotal * (taxRate / 100));
    return { id: i + 1, code: item.code, name: item.name, type: item.type, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal, taxRate, taxAmount, total: item.subtotal + taxAmount };
  });
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

interface Props {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  orders: Order[];
  config: CompanyConfig;
  setConfig: React.Dispatch<React.SetStateAction<CompanyConfig>>;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function InvoiceManager({ invoices, setInvoices, orders, config, setConfig, addToast }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [previewItems, setPreviewItems] = useState<InvoiceItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [observations, setObservations] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [dueDate, setDueDate] = useState('');
  const [transmitting, setTransmitting] = useState<number | null>(null);
  const [registerPaymentInv, setRegisterPaymentInv] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const configComplete = !!(config.nit && config.businessName && config.resolutionNumber && config.invoicePrefix && config.dianClientId);
  const invoicedOrderIds = new Set(invoices.map(i => i.orderId));
  const eligibleOrders = orders.filter(o => o.status === 'finished' && !invoicedOrderIds.has(o.id));

  const filtered = useMemo(() => invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchQ = !q || inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q) || inv.orderNumber.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || inv.status === filterStatus;
    return matchQ && matchS;
  }).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()), [invoices, search, filterStatus]);

  // ─── Generate ──────────────────────────────────────────────────────────
  function openPreview(order: Order) {
    setPreviewItems(buildInvoiceItems(order));
    setPreviewOrder(order);
    setObservations('');
    setPaymentType('cash');
    setDueDate('');
    setConfirmOpen(false);
  }

  function handleGenerate() {
    if (!previewOrder) return;
    setGenerating(true);
    setTimeout(() => {
      const nextNum = config.currentNumber + 1;
      const invoiceNumber = `${config.invoicePrefix}-${String(nextNum).padStart(4, '0')}`;
      const items = buildInvoiceItems(previewOrder);
      const subtotalServices = items.filter(i => i.type === 'service').reduce((s, i) => s + i.subtotal, 0);
      const subtotalParts = items.filter(i => i.type === 'part').reduce((s, i) => s + i.subtotal, 0);
      const taxBase = subtotalParts;
      const taxAmount = Math.round(taxBase * IVA_RATE);
      const total = subtotalServices + subtotalParts + taxAmount;

      const inv: Invoice = {
        id: Date.now(), invoiceNumber, orderId: previewOrder.id, orderNumber: previewOrder.orderNumber,
        customerId: previewOrder.customerId, customerName: previewOrder.customerName,
        customerIdType: 'CC', customerIdNumber: previewOrder.customerIdNumber,
        customerEmail: '', customerPhone: '', motorcyclePlate: previewOrder.motorcyclePlate,
        issuedAt: new Date().toISOString(),
        dueDate: paymentType === 'credit' ? dueDate : new Date().toISOString().slice(0, 10),
        paymentType, paymentStatus: 'pending', paidAmount: 0,
        items, subtotalServices, subtotalParts, taxBase, taxAmount, total,
        creditNotesTotal: 0,
        cufe: generateCUFE(invoiceNumber, config.nit, total),
        status: 'generated', dianStatus: 'pending',
        transmissionAttempts: 0, observations,
      };
      setInvoices(prev => [inv, ...prev]);
      setConfig(prev => ({ ...prev, currentNumber: nextNum }));
      addToast({ message: `Factura ${invoiceNumber} generada`, type: 'success' });
      setGenerating(false);
      setPreviewOrder(null);
      setConfirmOpen(false);
    }, 700);
  }

  // ─── HU-07: DIAN Transmission ─────────────────────────────────────────
  function handleTransmit(inv: Invoice) {
    if (inv.dianStatus === 'validated') return;
    setTransmitting(inv.id);
    setTimeout(() => {
      // Simulate: 70% validated, 20% rejected, 10% connection error
      const roll = Math.random();
      let dianStatus: DIANTransmissionStatus;
      let dianResponse: string;
      let dianResponseCode: string;
      let status: InvoiceStatus = inv.status;

      if (roll < 0.7) {
        const r = DIAN_RESPONSES.success[Math.floor(Math.random() * DIAN_RESPONSES.success.length)];
        dianStatus = 'validated'; dianResponse = r.msg; dianResponseCode = r.code;
        status = 'accepted';
        addToast({ message: `${inv.invoiceNumber} validada por la DIAN (${r.code})`, type: 'success' });
      } else if (roll < 0.9) {
        const r = DIAN_RESPONSES.rejected[Math.floor(Math.random() * DIAN_RESPONSES.rejected.length)];
        dianStatus = 'rejected'; dianResponse = r.msg; dianResponseCode = r.code;
        addToast({ message: `${inv.invoiceNumber} rechazada: ${r.code}`, type: 'error' });
      } else {
        dianStatus = 'error'; dianResponse = 'Error de conectividad con los servicios DIAN. Reintente más tarde.'; dianResponseCode = 'ERR_CONN';
        addToast({ message: 'Error de conexión con la DIAN. No se generó una nueva factura.', type: 'error' });
      }

      setInvoices(prev => prev.map(i => i.id === inv.id ? {
        ...i, status,
        dianStatus, dianResponse, dianResponseCode,
        transmissionAttempts: i.transmissionAttempts + 1,
        lastTransmissionAt: new Date().toISOString(),
      } : i));
      setTransmitting(null);
    }, 1500);
  }

  // ─── Register payment ─────────────────────────────────────────────────
  function handleRegisterPayment() {
    if (!registerPaymentInv) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;
    const balance = registerPaymentInv.total - registerPaymentInv.creditNotesTotal - registerPaymentInv.paidAmount;
    const newPaid = Math.min(registerPaymentInv.paidAmount + amount, registerPaymentInv.total - registerPaymentInv.creditNotesTotal);
    const newStatus = newPaid >= registerPaymentInv.total - registerPaymentInv.creditNotesTotal ? 'paid' : 'partial';
    setInvoices(prev => prev.map(i => i.id === registerPaymentInv.id ? { ...i, paidAmount: newPaid, paymentStatus: newStatus } : i));
    addToast({ message: `Pago de ${fmt(amount)} registrado en ${registerPaymentInv.invoiceNumber}`, type: 'success' });
    setRegisterPaymentInv(null);
    setPaymentAmount('');
  }

  // ─── Columns ──────────────────────────────────────────────────────────
  const columns = [
    { key: 'number', header: 'N° Factura', render: (inv: Invoice) => <span className="font-mono text-xs font-bold text-[#f97316]">{inv.invoiceNumber}</span> },
    { key: 'date', header: 'Fecha', render: (inv: Invoice) => <span className="font-mono text-xs text-[#6e7681]">{new Date(inv.issuedAt).toLocaleDateString('es-CO')}</span> },
    { key: 'customer', header: 'Cliente', render: (inv: Invoice) => (
      <div><div className="text-sm font-medium text-[#e6edf3]">{inv.customerName}</div><div className="font-mono text-xs text-[#6e7681]">{inv.orderNumber}</div></div>
    )},
    { key: 'total', header: 'Total', render: (inv: Invoice) => <span className="font-mono text-sm font-semibold text-[#e6edf3]">{fmt(inv.total)}</span> },
    { key: 'payment', header: 'Pago', render: (inv: Invoice) => (
      <span className={`text-xs font-mono font-semibold ${inv.paymentStatus === 'paid' ? 'text-emerald-400' : inv.paymentStatus === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>
        {inv.paymentStatus === 'paid' ? 'Pagada' : inv.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}
      </span>
    )},
    { key: 'dian', header: 'DIAN', render: (inv: Invoice) => (
      <span className={`text-xs font-mono ${DIAN_STATUS_MAP[inv.dianStatus].color}`}>{DIAN_STATUS_MAP[inv.dianStatus].label}</span>
    )},
    { key: 'status', header: 'Estado', render: (inv: Invoice) => <Badge variant={STATUS_MAP[inv.status].badge}>{STATUS_MAP[inv.status].label}</Badge> },
    { key: 'actions', header: '', render: (inv: Invoice) => (
      <div className="flex gap-1 justify-end flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => setDetailInvoice(inv)}>Ver</Button>
        {inv.paymentStatus !== 'paid' && inv.status !== 'cancelled' && (
          <Button size="sm" variant="ghost" onClick={() => { setRegisterPaymentInv(inv); setPaymentAmount(''); }}>Pago</Button>
        )}
        {(inv.dianStatus === 'pending' || inv.dianStatus === 'rejected' || inv.dianStatus === 'error') && inv.status !== 'cancelled' && (
          <Button size="sm" variant="outline" loading={transmitting === inv.id} onClick={() => handleTransmit(inv)}>
            {inv.dianStatus === 'error' || inv.dianStatus === 'rejected' ? 'Reintentar' : 'Transmitir DIAN'}
          </Button>
        )}
      </div>
    )},
  ];

  const ordersTableCols = [
    { key: 'orderNumber', header: 'Orden', render: (o: Order) => <span className="font-mono text-xs text-[#f97316]">{o.orderNumber}</span> },
    { key: 'date', header: 'Fecha', render: (o: Order) => <span className="font-mono text-xs text-[#6e7681]">{new Date(o.createdAt).toLocaleDateString('es-CO')}</span> },
    { key: 'customer', header: 'Cliente / Moto', render: (o: Order) => (
      <div><div className="text-sm text-[#e6edf3] font-medium">{o.customerName}</div><div className="font-mono text-xs text-[#6e7681]">{o.motorcyclePlate}</div></div>
    )},
    { key: 'total', header: 'Total', render: (o: Order) => <span className="font-mono text-sm font-semibold">{fmt(o.total)}</span> },
    { key: 'action', header: '', render: (o: Order) => <Button size="sm" variant="outline" onClick={() => openPreview(o)}>Facturar</Button> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Facturación Electrónica</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-06 · HU-07 · Generación, transmisión y validación DIAN</p>
        </div>
      </div>

      {!configComplete && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-[6px] flex items-start gap-3">
          <span className="text-red-400 text-lg mt-0.5">⊘</span>
          <div><div className="text-sm font-semibold text-red-300">Configuración DIAN incompleta</div><div className="text-xs text-red-400/80 mt-0.5">Ve a Configuración para completar los datos antes de emitir documentos.</div></div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total facturas', value: invoices.length, color: 'text-[#e6edf3]' },
          { label: 'Aceptadas DIAN', value: invoices.filter(i => i.status === 'accepted').length, color: 'text-emerald-400' },
          { label: 'Pendientes DIAN', value: invoices.filter(i => ['pending','sent'].includes(i.dianStatus)).length, color: 'text-blue-400' },
          { label: 'Por facturar', value: eligibleOrders.length, color: eligibleOrders.length > 0 ? 'text-yellow-400' : 'text-[#6e7681]' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {eligibleOrders.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Órdenes finalizadas pendientes de facturar ({eligibleOrders.length})</div>
          <DataTable columns={ordersTableCols} data={eligibleOrders} emptyMessage="Sin órdenes por facturar" />
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48"><SearchBar value={search} onChange={setSearch} placeholder="Buscar por N° factura, cliente u orden..." /></div>
        <div className="flex rounded-[6px] border border-[#30363d] overflow-hidden text-xs">
          {[['all','Todas'],['generated','Generadas'],['transmitted','Transmitidas'],['accepted','Aceptadas'],['cancelled','Anuladas']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterStatus(v)} className={`px-3 py-2 transition-colors ${filterStatus === v ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}>{l}</button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} data={filtered} emptyMessage="No se encontraron facturas" />

      {/* Preview Modal */}
      <Modal title={`Vista previa — ${previewOrder?.orderNumber ?? ''}`} open={!!previewOrder && !confirmOpen} onClose={() => setPreviewOrder(null)} width="max-w-2xl" onConfirm={configComplete ? () => setConfirmOpen(true) : undefined} confirmLabel="Generar factura">
        {previewOrder && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Forma de pago</label>
                <select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)} className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]">
                  <option value="cash" className="bg-[#161b22]">Contado</option>
                  <option value="credit" className="bg-[#161b22]">Crédito</option>
                </select>
              </div>
              {paymentType === 'credit' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Fecha vencimiento</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]" />
                </div>
              )}
            </div>
            <InvoicePreview order={previewOrder} items={previewItems} config={config} observations={observations} onObservations={setObservations} />
          </div>
        )}
      </Modal>

      {/* Confirm */}
      <Modal title="Confirmar generación" open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleGenerate} confirmLabel="Confirmar y generar" loading={generating} width="max-w-sm">
        <div className="flex flex-col gap-3 text-sm text-[#8b949e]">
          <p>Se generará la factura <strong className="text-[#f97316]">{config.invoicePrefix}-{String(config.currentNumber + 1).padStart(4, '0')}</strong>. Una vez confirmada <strong className="text-[#e6edf3]">no puede modificarse</strong>.</p>
          <div className="px-3 py-2 bg-[#f97316]/10 border border-[#f97316]/20 rounded text-xs text-[#f97316]">Ambiente: {config.dianEnv === 'testing' ? 'Habilitación / Pruebas' : 'Producción'}</div>
        </div>
      </Modal>

      {/* Detail */}
      {detailInvoice && (
        <Modal title={`Factura ${detailInvoice.invoiceNumber}`} open={!!detailInvoice} onClose={() => setDetailInvoice(null)} width="max-w-2xl">
          <InvoiceDetailView invoice={invoices.find(i => i.id === detailInvoice.id) ?? detailInvoice} config={config} onTransmit={handleTransmit} transmitting={transmitting} />
        </Modal>
      )}

      {/* Register payment */}
      <Modal title={`Registrar pago — ${registerPaymentInv?.invoiceNumber}`} open={!!registerPaymentInv} onClose={() => setRegisterPaymentInv(null)} onConfirm={handleRegisterPayment} confirmLabel="Registrar pago" width="max-w-sm">
        {registerPaymentInv && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-[#8b949e]">
              Saldo pendiente: <span className="font-mono text-[#f97316] font-bold">{fmt(registerPaymentInv.total - registerPaymentInv.creditNotesTotal - registerPaymentInv.paidAmount)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Valor recibido (COP)</label>
              <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0" className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Invoice Preview ───────────────────────────────────────────────────────
function InvoicePreview({ order, items, config, observations, onObservations }: {
  order: Order; items: InvoiceItem[]; config: CompanyConfig;
  observations: string; onObservations: (v: string) => void;
}) {
  const subtotalServices = items.filter(i => i.type === 'service').reduce((s, i) => s + i.subtotal, 0);
  const subtotalParts = items.filter(i => i.type === 'part').reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
  const total = subtotalServices + subtotalParts + taxAmount;
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#30363d]">
        <div><div className="text-xs text-[#6e7681] mb-1">Empresa</div><div className="font-semibold text-[#e6edf3]">{config.businessName}</div><div className="text-xs text-[#8b949e]">NIT {config.nit}-{config.verificationDigit}</div></div>
        <div className="text-right"><div className="text-xs text-[#6e7681] mb-1">Cliente</div><div className="font-semibold text-[#e6edf3]">{order.customerName}</div><div className="font-mono text-xs text-[#f97316]">{order.motorcyclePlate}</div></div>
      </div>
      <table className="w-full text-xs border border-[#30363d] rounded overflow-hidden">
        <thead><tr className="bg-[#1c2128] border-b border-[#30363d]"><th className="px-3 py-2 text-left text-[#6e7681]">Descripción</th><th className="px-3 py-2 text-center text-[#6e7681]">Cant.</th><th className="px-3 py-2 text-right text-[#6e7681]">V. Unit.</th><th className="px-3 py-2 text-right text-[#6e7681]">IVA</th><th className="px-3 py-2 text-right text-[#6e7681]">Total</th></tr></thead>
        <tbody className="divide-y divide-[#30363d]/60">{items.map(item => (
          <tr key={item.id}><td className="px-3 py-2"><div className="font-medium text-[#e6edf3]">{item.name}</div><div className="text-[#6e7681]">{item.code}</div></td><td className="px-3 py-2 text-center font-mono text-[#8b949e]">{item.quantity}</td><td className="px-3 py-2 text-right font-mono text-[#8b949e]">{fmt(item.unitPrice)}</td><td className="px-3 py-2 text-right font-mono text-yellow-400">{item.taxRate}%</td><td className="px-3 py-2 text-right font-mono font-semibold text-[#e6edf3]">{fmt(item.total)}</td></tr>
        ))}</tbody>
      </table>
      <div className="bg-[#0d1117] border border-[#30363d] rounded px-4 py-3 space-y-1.5">
        <div className="flex justify-between"><span className="text-[#8b949e]">Subtotal servicios</span><span className="font-mono text-blue-400">{fmt(subtotalServices)}</span></div>
        <div className="flex justify-between"><span className="text-[#8b949e]">Subtotal repuestos</span><span className="font-mono text-violet-400">{fmt(subtotalParts)}</span></div>
        <div className="flex justify-between"><span className="text-[#8b949e]">IVA 19% (repuestos)</span><span className="font-mono text-yellow-400">{fmt(taxAmount)}</span></div>
        <div className="border-t border-[#30363d] pt-2 flex justify-between font-bold"><span className="text-[#e6edf3]">Total</span><span className="font-mono text-[#f97316] text-lg">{fmt(total)}</span></div>
      </div>
      <div className="flex flex-col gap-1"><label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones</label><textarea value={observations} onChange={e => onObservations(e.target.value)} rows={2} placeholder="Notas opcionales..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none" /></div>
    </div>
  );
}

// ─── Invoice Detail ────────────────────────────────────────────────────────
function InvoiceDetailView({ invoice, config, onTransmit, transmitting }: {
  invoice: Invoice; config: CompanyConfig;
  onTransmit: (inv: Invoice) => void; transmitting: number | null;
}) {
  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* DIAN status panel */}
      <div className={`px-4 py-3 rounded-[6px] border ${invoice.dianStatus === 'validated' ? 'bg-emerald-500/10 border-emerald-500/20' : invoice.dianStatus === 'rejected' ? 'bg-red-500/10 border-red-500/20' : invoice.dianStatus === 'error' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-[#1c2128] border-[#30363d]'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-xs font-semibold uppercase tracking-wider ${DIAN_STATUS_MAP[invoice.dianStatus].color}`}>
              Estado DIAN: {DIAN_STATUS_MAP[invoice.dianStatus].label}
            </div>
            {invoice.dianResponse && <div className="text-xs text-[#8b949e] mt-1">{invoice.dianResponseCode && <span className="font-mono text-[#f97316] mr-2">[{invoice.dianResponseCode}]</span>}{invoice.dianResponse}</div>}
            {invoice.lastTransmissionAt && <div className="text-[10px] text-[#6e7681] font-mono mt-1">Último intento: {new Date(invoice.lastTransmissionAt).toLocaleString('es-CO')} · Intentos: {invoice.transmissionAttempts}</div>}
          </div>
          {(invoice.dianStatus === 'pending' || invoice.dianStatus === 'rejected' || invoice.dianStatus === 'error') && (
            <Button size="sm" variant="outline" loading={transmitting === invoice.id} onClick={() => onTransmit(invoice)}>
              {invoice.dianStatus === 'pending' ? 'Transmitir DIAN' : 'Reintentar'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#30363d]">
        <div><div className="text-xs text-[#6e7681] mb-1">Empresa</div><div className="font-semibold text-[#e6edf3]">{config.businessName}</div><div className="text-xs text-[#8b949e]">NIT {config.nit}-{config.verificationDigit}</div></div>
        <div className="text-right"><div className="text-xs text-[#6e7681] mb-1">Cliente</div><div className="font-semibold text-[#e6edf3]">{invoice.customerName}</div><div className="text-xs text-[#8b949e]">{invoice.customerIdNumber}</div></div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-[#6e7681]">Orden:</span> <span className="font-mono text-[#f97316] ml-1">{invoice.orderNumber}</span></div>
        <div><span className="text-[#6e7681]">Fecha:</span> <span className="font-mono ml-1">{new Date(invoice.issuedAt).toLocaleString('es-CO')}</span></div>
        <div><span className="text-[#6e7681]">Pago:</span> <span className="ml-1">{invoice.paymentType === 'cash' ? 'Contado' : `Crédito — vence ${invoice.dueDate}`}</span></div>
        <div className="col-span-2"><span className="text-[#6e7681]">CUFE:</span> <span className="font-mono ml-1 text-[10px] text-emerald-400 break-all">{invoice.cufe}</span></div>
      </div>

      <table className="w-full text-xs border border-[#30363d] rounded overflow-hidden">
        <thead><tr className="bg-[#1c2128] border-b border-[#30363d]"><th className="px-3 py-2 text-left text-[#6e7681]">Descripción</th><th className="px-3 py-2 text-center text-[#6e7681]">Cant.</th><th className="px-3 py-2 text-right text-[#6e7681]">V. Unit.</th><th className="px-3 py-2 text-right text-[#6e7681]">IVA</th><th className="px-3 py-2 text-right text-[#6e7681]">Total</th></tr></thead>
        <tbody className="divide-y divide-[#30363d]/60">{invoice.items.map(item => (
          <tr key={item.id}><td className="px-3 py-2"><div className="text-[#e6edf3]">{item.name}</div><div className="text-[#6e7681]">{item.code}</div></td><td className="px-3 py-2 text-center font-mono text-[#8b949e]">{item.quantity}</td><td className="px-3 py-2 text-right font-mono text-[#8b949e]">{fmt(item.unitPrice)}</td><td className="px-3 py-2 text-right font-mono text-yellow-400">{item.taxRate}%</td><td className="px-3 py-2 text-right font-mono font-semibold text-[#e6edf3]">{fmt(item.total)}</td></tr>
        ))}</tbody>
      </table>

      <div className="bg-[#0d1117] border border-[#30363d] rounded px-4 py-3 space-y-1.5">
        <div className="flex justify-between"><span className="text-[#8b949e]">Base gravable</span><span className="font-mono text-violet-400">{fmt(invoice.taxBase)}</span></div>
        <div className="flex justify-between"><span className="text-[#8b949e]">IVA 19%</span><span className="font-mono text-yellow-400">{fmt(invoice.taxAmount)}</span></div>
        {invoice.creditNotesTotal > 0 && <div className="flex justify-between"><span className="text-[#8b949e]">Notas crédito</span><span className="font-mono text-red-400">-{fmt(invoice.creditNotesTotal)}</span></div>}
        <div className="border-t border-[#30363d] pt-2 flex justify-between font-bold"><span className="text-[#e6edf3]">Total</span><span className="font-mono text-[#f97316] text-lg">{fmt(invoice.total)}</span></div>
        <div className="flex justify-between text-xs pt-1"><span className="text-[#6e7681]">Recaudado</span><span className={`font-mono ${invoice.paidAmount >= invoice.total ? 'text-emerald-400' : 'text-yellow-400'}`}>{fmt(invoice.paidAmount)}</span></div>
      </div>
    </div>
  );
}
