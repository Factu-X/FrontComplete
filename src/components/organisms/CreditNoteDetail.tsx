import React, { useEffect, useState } from 'react';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import DianSubmissions from '../molecules/DianSubmissions';
import { ToastItem } from '../molecules/ToastContainer';
import DocumentPreview, { type DocumentKind } from './DocumentPreview';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import { AJUSTE_LABELS, canSendToDian, DIAN_BADGE, DIAN_LABELS } from '../../lib/invoices';
import { formatCOP } from '../../lib/orders';
import type { BackendEnvioDian, BackendNotaCreditoCompleta, ResultadoEnvioDian } from '../../lib/types';

interface Props {
  notaId: string;
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onChanged?: () => void;
}

const formatDate = (value: string) => new Date(value).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

export default function CreditNoteDetail({ notaId, session, addToast, onChanged }: Props) {
  const [nota, setNota] = useState<BackendNotaCreditoCompleta | null>(null);
  const [envios, setEnvios] = useState<BackendEnvioDian[]>([]);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<DocumentKind | null>(null);

  async function load() {
    try {
      const [notaRes, enviosRes] = await Promise.all([
        apiRequest<ApiEntityResponse<BackendNotaCreditoCompleta>>(`/notas-credito/${notaId}`, session),
        apiRequest<ApiListResponse<BackendEnvioDian>>(`/notas-credito/${notaId}/envios`, session),
      ]);
      setNota(notaRes.data);
      setEnvios(enviosRes.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar la nota crédito', type: 'error' });
    }
  }

  useEffect(() => {
    load();
  }, [notaId, session.token]);

  async function handleSend() {
    setSending(true);
    try {
      const response = await apiRequest<ApiEntityResponse<{ resultado: ResultadoEnvioDian }>>(
        `/notas-credito/${notaId}/enviar`,
        session,
        { method: 'POST' },
      );
      const { resultado } = response.data;
      addToast(resultado.estado === 'VALIDADO'
        ? { message: 'La DIAN validó la nota crédito', type: 'success' }
        : { message: `La DIAN rechazó la nota: ${resultado.errores.map(e => e.mensaje).join('; ')}`, type: 'error' });
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo enviar la nota crédito', type: 'error' });
    } finally {
      setSending(false);
      await load();
      onChanged?.();
    }
  }

  if (!nota) {
    return <div className="py-10 text-center text-sm text-[#6e7681]">Cargando nota crédito...</div>;
  }

  if (preview) {
    return (
      <DocumentPreview
        basePath={`/notas-credito/${notaId}`}
        numero={nota.numero}
        hasXml={!!nota.cude}
        initial={preview}
        session={session}
        addToast={addToast}
        onBack={() => setPreview(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[#6e7681] uppercase tracking-wider">Nota crédito electrónica</div>
          <div className="font-mono text-lg font-bold text-[#f97316]">{nota.numero}</div>
          <div className="text-xs text-[#8b949e]">
            Emitida {formatDate(nota.fechaEmision)} · {AJUSTE_LABELS[nota.tipoAjuste]} · afecta la factura{' '}
            <span className="font-mono text-[#e6edf3]">{nota.factura.numero}</span>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <Badge variant={DIAN_BADGE[nota.estadoDian]}>{DIAN_LABELS[nota.estadoDian]}</Badge>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPreview('pdf')}>Ver PDF</Button>
            {nota.cude && <Button size="sm" variant="ghost" onClick={() => setPreview('xml')}>Ver XML</Button>}
            {canSendToDian(nota.estadoDian) && (
              <Button size="sm" loading={sending} onClick={handleSend}>
                {nota.estadoDian === 'RECHAZADA' ? 'Reintentar envío' : 'Enviar a la DIAN'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
          <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Adquirente</div>
          <div className="text-[#e6edf3] font-medium">{nota.factura.cliente.nombreRazonSocial}</div>
          <div className="font-mono text-xs text-[#8b949e]">{nota.factura.cliente.tipoIdentificacion} {nota.factura.cliente.numeroIdentificacion}</div>
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
          <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Motivo</div>
          <div className="text-[#e6edf3]">{nota.motivo}</div>
        </div>
      </div>

      <div className="rounded-[6px] border border-[#30363d] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1c2128] text-xs text-[#8b949e] uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-right">Cant.</th>
              <th className="hidden sm:table-cell px-3 py-2 text-right">V. unitario</th>
              <th className="hidden sm:table-cell px-3 py-2 text-right">IVA</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {nota.detallesNotaCreditos.map(d => (
              <tr key={d.id} className="border-t border-[#30363d]/60">
                <td className="px-3 py-2 text-[#e6edf3]">{d.descripcion}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-[#8b949e]">{Number(d.cantidad)}</td>
                <td className="hidden sm:table-cell px-3 py-2 text-right font-mono text-xs text-[#8b949e]">{formatCOP(d.precioUnitario)}</td>
                <td className="hidden sm:table-cell px-3 py-2 text-right font-mono text-xs text-[#8b949e]">{formatCOP(d.impuesto)}</td>
                <td className="px-3 py-2 text-right font-mono text-[#e6edf3]">{formatCOP(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col gap-1 text-xs text-[#8b949e] sm:max-w-xs">
          <span className="uppercase tracking-wider text-[#6e7681]">CUDE</span>
          <span className="font-mono break-all">{nota.cude ?? 'Se genera al enviar la nota a la DIAN'}</span>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-72">
          <div className="flex justify-between text-[#8b949e]"><span>Subtotal</span><span className="font-mono">{formatCOP(nota.subtotal)}</span></div>
          <div className="flex justify-between text-[#8b949e]"><span>IVA</span><span className="font-mono">{formatCOP(nota.impuestos)}</span></div>
          <div className="flex justify-between text-[#e6edf3] font-semibold border-t border-[#30363d] pt-1 mt-1">
            <span>Total acreditado</span><span className="font-mono text-[#f97316]">{formatCOP(nota.total)}</span>
          </div>
        </div>
      </div>

      <DianSubmissions envios={envios} />
    </div>
  );
}
