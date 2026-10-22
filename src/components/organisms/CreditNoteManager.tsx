import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import CreditNoteForm from './CreditNoteForm';
import CreditNoteDetail from './CreditNoteDetail';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiListResponse, ApiSession } from '../../lib/api';
import { AJUSTE_LABELS, DIAN_BADGE, DIAN_LABELS } from '../../lib/invoices';
import { formatCOP, toNumber } from '../../lib/orders';
import type { BackendNotaCredito } from '../../lib/types';

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function CreditNoteManager({ session, addToast }: Props) {
  const [notas, setNotas] = useState<BackendNotaCredito[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    try {
      const response = await apiRequest<ApiListResponse<BackendNotaCredito>>('/notas-credito', session);
      setNotas(response.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudieron cargar las notas crédito', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session.token]);

  const q = search.trim().toLowerCase();
  const filtered = notas.filter(n => !q
    || n.numero.toLowerCase().includes(q)
    || n.factura.numero.toLowerCase().includes(q)
    || n.factura.cliente.nombreRazonSocial.toLowerCase().includes(q));

  const columns = [
    { key: 'numero', header: 'N° Nota', render: (n: BackendNotaCredito) => <span className="font-mono text-xs text-[#f97316]">{n.numero}</span> },
    { key: 'fecha', header: 'Fecha', render: (n: BackendNotaCredito) => (
      <span className="font-mono text-xs text-[#6e7681]">{new Date(n.fechaEmision).toLocaleDateString('es-CO')}</span>
    )},
    { key: 'factura', header: 'Factura / Cliente', render: (n: BackendNotaCredito) => (
      <div>
        <div className="font-mono text-xs text-[#e6edf3]">{n.factura.numero}</div>
        <div className="text-xs text-[#6e7681]">{n.factura.cliente.nombreRazonSocial}</div>
      </div>
    )},
    { key: 'tipo', header: 'Tipo', render: (n: BackendNotaCredito) => <span className="text-xs text-[#8b949e]">{AJUSTE_LABELS[n.tipoAjuste]}</span> },
    { key: 'total', header: 'Total', render: (n: BackendNotaCredito) => <span className="font-mono text-sm font-semibold text-[#e6edf3]">{formatCOP(n.total)}</span> },
    { key: 'dian', header: 'DIAN', render: (n: BackendNotaCredito) => <Badge variant={DIAN_BADGE[n.estadoDian]}>{DIAN_LABELS[n.estadoDian]}</Badge> },
    { key: 'actions', header: '', render: (n: BackendNotaCredito) => (
      <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setDetailId(n.id)}>Ver</Button></div>
    )},
  ];

  const validadas = notas.filter(n => n.estadoDian === 'VALIDADA');
  const statsData = [
    { label: 'Notas crédito', value: notas.length.toString(), color: 'text-[#e6edf3]' },
    { label: 'Acreditado (validadas)', value: formatCOP(validadas.reduce((t, n) => t + toNumber(n.total), 0)), color: 'text-[#f97316]' },
    { label: 'Pendientes DIAN', value: notas.filter(n => n.estadoDian !== 'VALIDADA').length.toString(), color: 'text-yellow-400' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Notas Crédito</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-08 · Anulación o corrección de facturas validadas</p>
        </div>
        <Button onClick={() => setFormOpen(true)} icon={<span className="text-base leading-none">+</span>}>Nueva nota crédito</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statsData.map(s => (
          <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3 min-w-0">
            <div className={`text-xl font-bold font-mono truncate ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#6e7681] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por N° nota, factura o cliente..." />

      <DataTable columns={columns} data={filtered} emptyMessage={loading ? 'Cargando notas crédito...' : 'No hay notas crédito'} />

      <Modal title="Nueva nota crédito" open={formOpen} onClose={() => setFormOpen(false)} width="max-w-3xl">
        {formOpen && (
          <CreditNoteForm
            session={session}
            addToast={addToast}
            onCancel={() => setFormOpen(false)}
            onCreated={nota => { setFormOpen(false); setDetailId(nota.id); load(); }}
          />
        )}
      </Modal>

      {detailId && (
        <Modal title="Detalle de nota crédito" open={!!detailId} onClose={() => setDetailId(null)} width="max-w-5xl">
          <CreditNoteDetail notaId={detailId} session={session} addToast={addToast} onChanged={load} />
        </Modal>
      )}
    </div>
  );
}
