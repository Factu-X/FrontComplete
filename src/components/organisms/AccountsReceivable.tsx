import React, { useState, useMemo } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import Modal from '../molecules/Modal';
import { Invoice } from '../../types';

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function daysDiff(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

interface Props {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
}

export default function AccountsReceivable({ invoices, setInvoices }: Props) {
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  // Only unpaid invoices
  const pending = useMemo(() => invoices.filter(i =>
    i.status !== 'cancelled' && i.paymentStatus !== 'paid'
  ), [invoices]);

  const customers = useMemo(() => [...new Set(pending.map(i => i.customerName))].sort(), [pending]);

  const filtered = useMemo(() => pending.filter(i => {
    const q = search.toLowerCase();
    const matchQ = !q || i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q);
    const matchC = !filterCustomer || i.customerName === filterCustomer;
    const issueDate = i.issuedAt.slice(0, 10);
    const matchFrom = !dateFrom || issueDate >= dateFrom;
    const matchTo = !dateTo || issueDate <= dateTo;
    return matchQ && matchC && matchFrom && matchTo;
  }).sort((a, b) => {
    const dA = daysDiff(a.dueDate); const dB = daysDiff(b.dueDate);
    return dB - dA; // most overdue first
  }), [pending, search, filterCustomer, dateFrom, dateTo]);

  const totalPending = filtered.reduce((s, i) => s + (i.total - i.creditNotesTotal - i.paidAmount), 0);
  const overdueCount = filtered.filter(i => daysDiff(i.dueDate) > 0).length;

  const columns = [
    { key: 'number', header: 'N° Factura', render: (i: Invoice) => <span className="font-mono text-xs font-bold text-[#f97316]">{i.invoiceNumber}</span> },
    { key: 'customer', header: 'Cliente', render: (i: Invoice) => <div className="font-medium text-[#e6edf3]">{i.customerName}</div> },
    { key: 'issued', header: 'Emisión', render: (i: Invoice) => <span className="font-mono text-xs text-[#6e7681]">{new Date(i.issuedAt).toLocaleDateString('es-CO')}</span> },
    { key: 'due', header: 'Vencimiento', render: (i: Invoice) => {
      const days = daysDiff(i.dueDate);
      const overdue = days > 0 && i.paymentType === 'credit';
      return (
        <div>
          <span className={`font-mono text-xs ${overdue ? 'text-red-400 font-bold' : 'text-[#8b949e]'}`}>
            {i.paymentType === 'cash' ? 'Contado' : new Date(i.dueDate + 'T00:00:00').toLocaleDateString('es-CO')}
          </span>
          {overdue && <div className="text-[10px] text-red-400 font-mono">{days}d vencida</div>}
        </div>
      );
    }},
    { key: 'total', header: 'Total factura', render: (i: Invoice) => <span className="font-mono text-sm text-[#8b949e]">{fmt(i.total)}</span> },
    { key: 'paid', header: 'Pagado', render: (i: Invoice) => <span className="font-mono text-sm text-emerald-400">{fmt(i.paidAmount + i.creditNotesTotal)}</span> },
    { key: 'balance', header: 'Saldo pendiente', render: (i: Invoice) => {
      const balance = i.total - i.creditNotesTotal - i.paidAmount;
      const days = daysDiff(i.dueDate);
      return (
        <div>
          <span className={`font-mono text-sm font-bold ${days > 0 && i.paymentType === 'credit' ? 'text-red-400' : 'text-yellow-400'}`}>{fmt(balance)}</span>
          {i.paymentStatus === 'partial' && <div className="text-[10px] text-[#6e7681]">Pago parcial</div>}
        </div>
      );
    }},
    { key: 'type', header: 'Forma pago', render: (i: Invoice) => (
      <Badge variant={i.paymentType === 'cash' ? 'service' : 'warning'}>{i.paymentType === 'cash' ? 'Contado' : 'Crédito'}</Badge>
    )},
    { key: 'actions', header: '', render: (i: Invoice) => (
      <Button size="sm" variant="ghost" onClick={() => setDetailInvoice(i)}>Ver detalle</Button>
    )},
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Cuentas por Cobrar</h1>
        <p className="text-sm text-[#6e7681] mt-0.5">HU-10 · Facturas con pagos pendientes</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Facturas pendientes', value: pending.length, color: 'text-[#e6edf3]' },
          { label: 'Total por cobrar', value: fmt(pending.reduce((s, i) => s + (i.total - i.creditNotesTotal - i.paidAmount), 0)), color: 'text-yellow-400' },
          { label: 'Vencidas', value: overdueCount, color: overdueCount > 0 ? 'text-red-400' : 'text-[#6e7681]' },
          { label: 'Con pago parcial', value: pending.filter(i => i.paymentStatus === 'partial').length, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3">
            <div className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {overdueCount > 0 && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-[6px] flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <span className="text-sm text-red-300 font-medium">{overdueCount} factura{overdueCount > 1 ? 's' : ''} vencida{overdueCount > 1 ? 's' : ''}.</span>
          <span className="text-xs text-red-400/70">Días contados desde la fecha de vencimiento.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48"><SearchBar value={search} onChange={setSearch} placeholder="Buscar por N° factura o cliente..." /></div>
        <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]">
          <option value="" className="bg-[#161b22]">Todos los clientes</option>
          {customers.map(c => <option key={c} value={c} className="bg-[#161b22]">{c}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#f97316]" />
        <span className="text-xs text-[#6e7681]">—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#f97316]" />
        {(filterCustomer || dateFrom || dateTo) && (
          <button onClick={() => { setFilterCustomer(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-[#6e7681] hover:text-[#ef4444]">✕ Limpiar</button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-[#6e7681]">{filtered.length} resultado{filtered.length > 1 ? 's' : ''}</span>
          <span className="font-mono text-sm font-bold text-yellow-400">Total filtrado: {fmt(totalPending)}</span>
        </div>
      )}

      <DataTable columns={columns} data={filtered} emptyMessage="No hay facturas con pagos pendientes" />

      {/* Detail modal */}
      {detailInvoice && (
        <Modal title={`Detalle — ${detailInvoice.invoiceNumber}`} open={!!detailInvoice} onClose={() => setDetailInvoice(null)} width="max-w-xl">
          {detailInvoice && (
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-[#6e7681]">Cliente:</span><div className="font-medium text-[#e6edf3]">{detailInvoice.customerName}</div></div>
                <div><span className="text-[#6e7681]">Emisión:</span><div className="font-mono text-xs">{new Date(detailInvoice.issuedAt).toLocaleDateString('es-CO')}</div></div>
                <div><span className="text-[#6e7681]">Forma pago:</span><div className="text-xs">{detailInvoice.paymentType === 'cash' ? 'Contado' : `Crédito — vence ${detailInvoice.dueDate}`}</div></div>
                <div><span className="text-[#6e7681]">Estado:</span><div><Badge variant={detailInvoice.paymentStatus === 'partial' ? 'warning' : 'inactive'}>{detailInvoice.paymentStatus === 'partial' ? 'Pago parcial' : 'Pendiente'}</Badge></div></div>
              </div>
              <div className="bg-[#0d1117] border border-[#30363d] rounded px-4 py-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-[#8b949e]">Total factura</span><span className="font-mono text-[#e6edf3]">{fmt(detailInvoice.total)}</span></div>
                {detailInvoice.creditNotesTotal > 0 && <div className="flex justify-between"><span className="text-[#8b949e]">Notas crédito</span><span className="font-mono text-red-400">-{fmt(detailInvoice.creditNotesTotal)}</span></div>}
                <div className="flex justify-between"><span className="text-[#8b949e]">Pagado</span><span className="font-mono text-emerald-400">{fmt(detailInvoice.paidAmount)}</span></div>
                <div className="border-t border-[#30363d] pt-2 flex justify-between font-bold">
                  <span className="text-[#e6edf3]">Saldo pendiente</span>
                  <span className="font-mono text-yellow-400 text-lg">{fmt(detailInvoice.total - detailInvoice.creditNotesTotal - detailInvoice.paidAmount)}</span>
                </div>
                {detailInvoice.paymentType === 'credit' && daysDiff(detailInvoice.dueDate) > 0 && (
                  <div className="text-xs text-red-400 flex items-center gap-1.5"><span>⚠</span>{daysDiff(detailInvoice.dueDate)} días de mora</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">Conceptos</div>
                {detailInvoice.items.map(item => (
                  <div key={item.id} className="flex justify-between text-xs py-1 border-b border-[#30363d]/40">
                    <span className="text-[#e6edf3]">{item.name} <span className="text-[#6e7681]">×{item.quantity}</span></span>
                    <span className="font-mono text-[#8b949e]">{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
