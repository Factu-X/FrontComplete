import React, { useState, useMemo } from 'react';
import { Invoice, Order, CreditNote } from '../../types';

interface Props {
  invoices: Invoice[];
  orders: Order[];
  creditNotes: CreditNote[];
}

type Period = 'today' | 'week' | 'month' | 'custom';

function inRange(date: string, from: Date, to: Date) {
  const d = new Date(date);
  return d >= from && d <= to;
}

function periodBounds(period: Period, customFrom: string, customTo: string): [Date, Date] {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return [start, end];
  }
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
    return [start, now];
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return [start, now];
  }
  // custom
  const start = customFrom ? new Date(customFrom + 'T00:00:00') : new Date(0);
  const end = customTo ? new Date(customTo + 'T23:59:59') : now;
  return [start, end];
}

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function BillingDashboard({ invoices, orders, creditNotes }: Props) {
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [from, to] = useMemo(() => periodBounds(period, customFrom, customTo), [period, customFrom, customTo]);

  const periodInvoices = useMemo(() =>
    invoices.filter(i => i.status !== 'cancelled' && inRange(i.issuedAt, from, to)),
    [invoices, from, to]
  );

  const periodOrders = useMemo(() =>
    orders.filter(o => o.status === 'finished' && inRange(o.createdAt, from, to)),
    [orders, from, to]
  );

  const periodCreditNotes = useMemo(() =>
    creditNotes.filter(cn => inRange(cn.issuedAt, from, to)),
    [creditNotes, from, to]
  );

  // Key metrics
  const totalBilled = periodInvoices.reduce((s, i) => s + i.total, 0);
  const totalCreditNotes = periodCreditNotes.reduce((s, cn) => s + cn.amount, 0);
  const netBilled = totalBilled - totalCreditNotes;
  const totalCollected = periodInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const pending = periodInvoices
    .filter(i => i.paymentStatus !== 'paid')
    .reduce((s, i) => s + (i.total - i.creditNotesTotal - i.paidAmount), 0);

  // Top services
  const serviceCount: Record<string, { name: string; qty: number; total: number }> = {};
  periodOrders.forEach(o => {
    o.items.forEach(item => {
      if (!serviceCount[item.code]) serviceCount[item.code] = { name: item.name, qty: 0, total: 0 };
      serviceCount[item.code].qty += item.quantity;
      serviceCount[item.code].total += item.subtotal;
    });
  });
  const topServices = Object.values(serviceCount).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topServicesByType = (type: 'service' | 'part') =>
    periodOrders.flatMap(o => o.items.filter(i => i.type === type))
      .reduce((acc, item) => {
        if (!acc[item.code]) acc[item.code] = { name: item.name, qty: 0 };
        acc[item.code].qty += item.quantity;
        return acc;
      }, {} as Record<string, { name: string; qty: number }>);

  const topSrv = Object.values(topServicesByType('service')).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topParts = Object.values(topServicesByType('part')).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const periodLabels: Record<Period, string> = {
    today: 'Hoy',
    week: 'Últimos 7 días',
    month: 'Este mes',
    custom: 'Rango personalizado',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Dashboard de Facturación</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-09 · Resumen de actividad y facturación del taller</p>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-[6px] border border-[#30363d] overflow-hidden text-xs">
            {(['today','week','month','custom'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-2 transition-colors ${period === p ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
              >{periodLabels[p]}</button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#e6edf3] focus:outline-none focus:border-[#f97316]" />
              <span className="text-xs text-[#6e7681]">—</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1.5 text-xs text-[#e6edf3] focus:outline-none focus:border-[#f97316]" />
            </div>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total facturado', value: fmt(totalBilled), sub: `${periodInvoices.length} facturas`, color: '#f97316' },
          { label: 'Neto (c/notas crédito)', value: fmt(netBilled), sub: `NC: ${fmt(totalCreditNotes)}`, color: '#34d399' },
          { label: 'Órdenes finalizadas', value: periodOrders.length, sub: 'en el período', color: '#60a5fa' },
          { label: 'Cartera pendiente', value: fmt(pending), sub: 'sin cobrar', color: pending > 0 ? '#f59e0b' : '#6e7681' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#161b22] border border-[#30363d] rounded-[8px] p-5">
            <div className="text-xs font-medium text-[#6e7681] uppercase tracking-wider mb-2">{kpi.label}</div>
            <div className="text-xl font-bold font-mono leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs text-[#6e7681] mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Invoice status breakdown */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] p-5">
        <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">Estado de facturas — {periodLabels[period]}</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Generadas', count: periodInvoices.filter(i => i.status === 'generated').length, color: '#60a5fa' },
            { label: 'Transmitidas', count: periodInvoices.filter(i => i.status === 'transmitted').length, color: '#a78bfa' },
            { label: 'Aceptadas DIAN', count: periodInvoices.filter(i => i.status === 'accepted').length, color: '#34d399' },
            { label: 'Anuladas', count: periodInvoices.filter(i => i.status === 'cancelled').length, color: '#6e7681' },
            { label: 'Notas crédito', count: periodCreditNotes.length, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.count}</div>
              <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Simple billing bar */}
        {totalBilled > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-[#6e7681] mb-1">
              <span>Recaudado</span>
              <span>{Math.round((totalCollected / totalBilled) * 100)}%</span>
            </div>
            <div className="h-3 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f97316] rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalCollected / totalBilled) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-emerald-400 font-mono">{fmt(totalCollected)} recaudado</span>
              <span className="text-yellow-400 font-mono">{fmt(pending)} pendiente</span>
            </div>
          </div>
        )}
      </div>

      {/* Top services and parts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopList title="Servicios más realizados" items={topSrv} color="#60a5fa" emptyMsg="Sin órdenes en el período" />
        <TopList title="Repuestos más utilizados" items={topParts} color="#a78bfa" emptyMsg="Sin repuestos en el período" />
      </div>

      {/* Recent invoices mini-table */}
      <div>
        <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Últimas facturas del período</div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] overflow-hidden">
          {periodInvoices.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#6e7681]">Sin facturas en el período seleccionado</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-[#1c2128] border-b border-[#30363d]">
                <th className="px-4 py-2 text-left text-[#6e7681]">Factura</th>
                <th className="px-4 py-2 text-left text-[#6e7681]">Cliente</th>
                <th className="px-4 py-2 text-left text-[#6e7681]">Fecha</th>
                <th className="px-4 py-2 text-right text-[#6e7681]">Total</th>
                <th className="px-4 py-2 text-right text-[#6e7681]">Estado pago</th>
              </tr></thead>
              <tbody className="divide-y divide-[#30363d]/60">
                {periodInvoices.slice().reverse().slice(0, 8).map(inv => (
                  <tr key={inv.id} className="hover:bg-[#1c2128]/50">
                    <td className="px-4 py-2 font-mono text-[#f97316] font-semibold">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2 text-[#e6edf3]">{inv.customerName}</td>
                    <td className="px-4 py-2 font-mono text-[#6e7681]">{new Date(inv.issuedAt).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-[#e6edf3]">{fmt(inv.total)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-mono ${inv.paymentStatus === 'paid' ? 'text-emerald-400' : inv.paymentStatus === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {inv.paymentStatus === 'paid' ? 'Pagada' : inv.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function TopList({ title, items, color, emptyMsg }: { title: string; items: { name: string; qty: number }[]; color: string; emptyMsg: string }) {
  const max = items[0]?.qty ?? 1;
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] p-5">
      <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-4">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-[#6e7681] py-4 text-center">{emptyMsg}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={item.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#e6edf3] font-medium">{item.name}</span>
                <span className="font-mono text-[#8b949e]">{item.qty}×</span>
              </div>
              <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(item.qty / max) * 100}%`, backgroundColor: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
