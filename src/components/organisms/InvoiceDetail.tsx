import React, { useEffect, useState } from 'react';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import { ToastItem } from '../molecules/ToastContainer';
import DocumentPreview, { type DocumentKind } from './DocumentPreview';
import DianSubmissions from '../molecules/DianSubmissions';
import InvoiceAccount from './InvoiceAccount';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import { canSendToDian, DIAN_BADGE, DIAN_LABELS, FORMA_PAGO_LABELS, groupTaxes } from '../../lib/invoices';
import { formatCOP } from '../../lib/orders';
import type { BackendEnvioDian, BackendFacturaCompleta, ResultadoEnvioDian } from '../../lib/types';

interface Props {
  facturaId: string;
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onChanged?: () => void;
}

const formatDate = (value: string) => new Date(value).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

export default function InvoiceDetail({ facturaId, session, addToast, onChanged }: Props) {
  const [factura, setFactura] = useState<BackendFacturaCompleta | null>(null);
  const [envios, setEnvios] = useState<BackendEnvioDian[]>([]);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<DocumentKind | null>(null);

  async function load() {
    try {
      const [facturaRes, enviosRes] = await Promise.all([
        apiRequest<ApiEntityResponse<BackendFacturaCompleta>>(`/facturas/${facturaId}`, session),
        apiRequest<ApiListResponse<BackendEnvioDian>>(`/facturas/${facturaId}/envios`, session),
      ]);
      setFactura(facturaRes.data);
      setEnvios(enviosRes.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar la factura', type: 'error' });
    }
  }

  useEffect(() => {
    void load();
  }, [facturaId, session.token]);

  async function handleSend() {
    setSending(true);
    try {
      const response = await apiRequest<ApiEntityResponse<{ resultado: ResultadoEnvioDian }>>(
        `/facturas/${facturaId}/enviar`,
        session,
        { method: 'POST' },
      );
      const { resultado } = response.data;
      addToast(resultado.estado === 'VALIDADO'
        ? { message: 'La DIAN validó la factura', type: 'success' }
        : { message: `La DIAN rechazó la factura: ${resultado.errores.map(e => e.mensaje).join('; ')}`, type: 'error' });
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo enviar la factura', type: 'error' });
    } finally {
      setSending(false);
      await load();
      onChanged?.();
    }
  }

  if (!factura) {
    return <div className="py-10 text-center text-sm text-[#6e7681]">Cargando factura...</div>;
  }

  if (preview) {
    return (
      <DocumentPreview
        basePath={`/facturas/${facturaId}`}
        numero={factura.numero}
        hasXml={!!factura.cufe}
        initial={preview}
        session={session}
        addToast={addToast}
        onBack={() => setPreview(null)}
      />
    );
  }

  const taxes = groupTaxes(factura.detallesFacturas.map(d => ({
    ...d,
    tratamientoIva: d.detalleOrden?.tratamientoIva,
  })));

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[#6e7681] uppercase tracking-wider">Factura electrónica de venta</div>
          <div className="font-mono text-lg font-bold text-[#f97316]">{factura.numero}</div>
          <div className="text-xs text-[#8b949e]">
            Emitida {formatDate(factura.fechaEmision)} · {FORMA_PAGO_LABELS[factura.formaPago]}
            {factura.fechaVencimiento && ` · vence ${factura.fechaVencimiento}`}
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <Badge variant={DIAN_BADGE[factura.estadoDian]}>{DIAN_LABELS[factura.estadoDian]}</Badge>
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPreview('pdf')}>Ver PDF</Button>
            {factura.cufe && (
              <Button size="sm" variant="ghost" onClick={() => setPreview('xml')}>Ver XML</Button>
            )}
            {canSendToDian(factura.estadoDian) && (
              <Button size="sm" loading={sending} onClick={handleSend}>
                {factura.estadoDian === 'RECHAZADA' ? 'Reintentar envío' : 'Enviar a la DIAN'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
          <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Adquirente</div>
          <div className="text-[#e6edf3] font-medium">{factura.cliente.nombreRazonSocial}</div>
          <div className="font-mono text-xs text-[#8b949e]">
            {factura.cliente.tipoIdentificacion} {factura.cliente.numeroIdentificacion}
            {factura.cliente.digitoVerificacion && `-${factura.cliente.digitoVerificacion}`}
          </div>
          {factura.cliente.email && <div className="text-xs text-[#8b949e]">{factura.cliente.email}</div>}
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3">
          <div className="text-xs text-[#6e7681] uppercase tracking-wider mb-1">Orden {factura.orden.numero}</div>
          <div className="text-[#e6edf3] font-medium font-mono">{factura.orden.motocicleta.placa}</div>
          <div className="text-xs text-[#8b949e]">
            {factura.orden.motocicleta.marca} {factura.orden.motocicleta.modelo} · {factura.orden.kilometrajeIngreso.toLocaleString('es-CO')} km
          </div>
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
            {factura.detallesFacturas.map(d => (
              <tr key={d.id} className="border-t border-[#30363d]/60">
                <td className="px-3 py-2 text-[#e6edf3]">
                  {d.descripcion}
                  {d.codigoItem && <span className="ml-2 font-mono text-xs text-[#6e7681]">{d.codigoItem}</span>}
                </td>
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
          <span className="uppercase tracking-wider text-[#6e7681]">CUFE</span>
          <span className="font-mono break-all">{factura.cufe ?? 'Se genera al enviar la factura a la DIAN'}</span>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-72">
          <div className="flex justify-between text-[#8b949e]"><span>Subtotal</span><span className="font-mono">{formatCOP(factura.subtotal)}</span></div>
          {taxes.map(t => (
            <div key={t.label} className="flex justify-between text-[#8b949e]">
              <span>{t.label} <span className="text-xs">sobre {formatCOP(t.base)}</span></span>
              <span className="font-mono">{formatCOP(t.impuesto)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[#e6edf3] font-semibold border-t border-[#30363d] pt-1 mt-1">
            <span>Total</span><span className="font-mono text-[#f97316]">{formatCOP(factura.total)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#30363d] pt-4">
        <InvoiceAccount facturaId={facturaId} session={session} addToast={addToast} onChanged={onChanged} />
      </div>

      <DianSubmissions envios={envios} />
    </div>
  );
}
