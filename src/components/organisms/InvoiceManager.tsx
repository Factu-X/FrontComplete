import React, { useEffect, useMemo, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Modal from '../molecules/Modal';
import DataTable from '../molecules/DataTable';
import SearchBar from '../molecules/SearchBar';
import { ToastItem } from '../molecules/ToastContainer';
import { apiDownload, apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import { formatCOP, toNumber } from '../../lib/orders';
import type {
  BackendConfiguracion, BackendDetalleFactura, BackendDetalleOrden, BackendFactura, BackendOrden, EstadoDian,
} from '../../lib/types';

// La factura generada aquí es el documento electrónico listo para firmar; la firma, el envío y la
// respuesta de la DIAN son HU-07. Nunca se muestra una validación DIAN que no haya ocurrido.
const DIAN_STATUS: Record<EstadoDian, { badge: 'warning' | 'service' | 'active' | 'inactive'; label: string }> = {
  PENDIENTE_ENVIO: { badge: 'warning', label: 'Pendiente de envío DIAN' },
  ENVIADA: { badge: 'service', label: 'Enviada a la DIAN' },
  VALIDADA: { badge: 'active', label: 'Validada por la DIAN' },
  RECHAZADA: { badge: 'inactive', label: 'Rechazada por la DIAN' },
};

const formaPagoOptions = [
  { value: 'CONTADO', label: 'Contado' },
  { value: 'CREDITO', label: 'Crédito' },
];

const formatDate = (value: string) => new Date(value).toLocaleString('es-CO');

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function InvoiceManager({ session, addToast }: Props) {
  const [facturas, setFacturas] = useState<BackendFactura[]>([]);
  const [ordenes, setOrdenes] = useState<BackendOrden[]>([]);
  const [config, setConfig] = useState<BackendConfiguracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [preview, setPreview] = useState<{ orden: BackendOrden; items: BackendDetalleOrden[] } | null>(null);
  const [formaPago, setFormaPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [generating, setGenerating] = useState(false);

  const [detail, setDetail] = useState<{ factura: BackendFactura; items: BackendDetalleFactura[] } | null>(null);

  const notifyError = (error: unknown, fallback: string) =>
    addToast({ message: error instanceof Error ? error.message : fallback, type: 'error' });

  async function load() {
    try {
      const [f, o, c] = await Promise.all([
        apiRequest<ApiListResponse<BackendFactura>>('/facturas', session),
        apiRequest<ApiListResponse<BackendOrden>>('/ordenes?estado=FINALIZADA', session),
        apiRequest<ApiEntityResponse<BackendConfiguracion>>('/configuracion', session),
      ]);
      setFacturas(f.data);
      setOrdenes(o.data);
      setConfig(c.data);
    } catch (error) {
      notifyError(error, 'No se pudo cargar la facturación');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session.token]);

  // shortcut: el filtro "sin factura" se hace en el cliente; mover a la API si las órdenes finalizadas crecen mucho.
  const pendientes = useMemo(() => {
    const facturadas = new Set(facturas.map(f => f.ordenId));
    return ordenes.filter(o => !facturadas.has(o.id));
  }, [facturas, ordenes]);

  const filtered = facturas.filter(f => {
    const q = search.toLowerCase();
    return !q || f.numero.toLowerCase().includes(q)
      || (f.cliente?.nombreRazonSocial.toLowerCase().includes(q) ?? false)
      || (f.orden?.numero.toLowerCase().includes(q) ?? false);
  });

  async function openPreview(orden: BackendOrden) {
    try {
      const detalles = await apiRequest<ApiListResponse<BackendDetalleOrden>>(`/ordenes/${orden.id}/detalles`, session);
      setFormaPago('CONTADO');
      setFechaVencimiento('');
      setPreview({ orden, items: detalles.data });
    } catch (error) {
      notifyError(error, 'No se pudo cargar la orden');
    }
  }

  async function handleGenerate() {
    if (!preview) return;
    setGenerating(true);
    try {
      const response = await apiRequest<ApiEntityResponse<BackendFactura>>('/facturas', session, {
        method: 'POST',
        body: JSON.stringify({
          ordenId: preview.orden.id,
          formaPago,
          ...(formaPago === 'CREDITO' && { fechaVencimiento }),
        }),
      });
      addToast({ message: `Factura ${response.data.numero} generada`, type: 'success' });
      setPreview(null);
      await load();
    } catch (error) {
      notifyError(error, 'No se pudo generar la factura');
    } finally {
      setGenerating(false);
    }
  }

  async function openDetail(factura: BackendFactura) {
    try {
      const detalles = await apiRequest<ApiListResponse<BackendDetalleFactura>>(`/facturas/${factura.id}/detalles`, session);
      setDetail({ factura, items: detalles.data });
    } catch (error) {
      notifyError(error, 'No se pudo cargar la factura');
    }
  }

  const downloadXml = (factura: BackendFactura) =>
    apiDownload(`/facturas/${factura.id}/xml`, session, `${factura.numero}.xml`)
      .catch(error => notifyError(error, 'No se pudo descargar el XML'));

  const facturaColumns = [
    { key: 'numero', header: 'N° Factura', mono: true, render: (f: BackendFactura) => <span className="text-[#f97316] font-semibold">{f.numero}</span> },
    { key: 'fecha', header: 'Emisión', render: (f: BackendFactura) => <span className="text-xs">{formatDate(f.fechaEmision)}</span> },
    { key: 'cliente', header: 'Cliente', render: (f: BackendFactura) => f.cliente?.nombreRazonSocial ?? '—' },
    { key: 'orden', header: 'Orden', mono: true, render: (f: BackendFactura) => <span className="text-xs">{f.orden?.numero ?? '—'}</span> },
    { key: 'total', header: 'Total', mono: true, render: (f: BackendFactura) => formatCOP(f.total) },
    { key: 'dian', header: 'Estado DIAN', render: (f: BackendFactura) => <Badge variant={DIAN_STATUS[f.estadoDian].badge}>{DIAN_STATUS[f.estadoDian].label}</Badge> },
    {
      key: 'acciones', header: '', render: (f: BackendFactura) => (
        <div className="flex gap-1.5 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openDetail(f)}>Ver</Button>
          {f.xmlPath && <Button size="sm" variant="ghost" onClick={() => downloadXml(f)}>XML</Button>}
        </div>
      ),
    },
  ];

  const ordenColumns = [
    { key: 'numero', header: 'Orden', mono: true, render: (o: BackendOrden) => <span className="text-[#f97316]">{o.numero}</span> },
    { key: 'cliente', header: 'Cliente', render: (o: BackendOrden) => o.cliente?.nombreRazonSocial ?? '—' },
    { key: 'placa', header: 'Placa', mono: true, render: (o: BackendOrden) => o.motocicleta?.placa ?? '—' },
    { key: 'fecha', header: 'Finalizada', render: (o: BackendOrden) => <span className="text-xs">{formatDate(o.finalizadaAt ?? o.fechaIngreso)}</span> },
    { key: 'total', header: 'Total', mono: true, render: (o: BackendOrden) => formatCOP(o.total) },
    { key: 'accion', header: '', render: (o: BackendOrden) => <Button size="sm" variant="outline" onClick={() => openPreview(o)}>Facturar</Button> },
  ];

  if (loading) {
    return <div className="py-24 text-center text-sm text-[#6e7681]">Cargando facturación...</div>;
  }

  const puedeEmitir = config?.estado.puedeEmitir ?? false;
  const numeracion = config?.numeracion;
  const creditoSinFecha = formaPago === 'CREDITO' && !fechaVencimiento;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Facturación electrónica</h1>
        <p className="text-sm text-[#6e7681] mt-0.5">HU-06 · Facturas generadas desde órdenes finalizadas</p>
      </div>

      {!puedeEmitir && (
        <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/25 rounded-[6px]">
          <div className="text-sm font-semibold text-yellow-300">⚠ No se pueden generar facturas: la configuración está incompleta</div>
          <div className="text-xs text-yellow-400/80 mt-0.5">
            Falta: {config?.estado.faltantesEmision.join(', ')}. Un administrador debe completarla en Configuración.
          </div>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[#e6edf3]">Órdenes finalizadas por facturar ({pendientes.length})</h2>
        <DataTable columns={ordenColumns} data={pendientes} emptyMessage="No hay órdenes finalizadas pendientes de facturar" />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#e6edf3]">Facturas emitidas ({facturas.length})</h2>
          <div className="w-72"><SearchBar value={search} onChange={setSearch} placeholder="Número, cliente u orden..." /></div>
        </div>
        <DataTable columns={facturaColumns} data={filtered} emptyMessage="Aún no hay facturas" />
      </section>

      {preview && (
        <Modal
          title={`Resumen antes de facturar — ${preview.orden.numero}`}
          open
          onClose={() => setPreview(null)}
          width="max-w-2xl"
          onConfirm={puedeEmitir && !creditoSinFecha ? handleGenerate : undefined}
          confirmLabel="Confirmar y generar factura"
          loading={generating}
        >
          <InvoiceSummary
            config={config}
            cliente={preview.orden.cliente}
            items={preview.items.map(i => ({
              id: i.id, descripcion: i.nombreItem, cantidad: i.cantidad, precioUnitario: i.precioUnitario,
              tarifaIva: i.tarifaIva, tratamientoIva: i.tratamientoIva, subtotal: i.subtotal,
            }))}
            subtotal={preview.orden.subtotal}
            impuestos={preview.orden.impuestos}
            total={preview.orden.total}
            numeroLabel={numeracion?.siguienteConsecutivo != null
              ? `Próximo número: ${numeracion.prefijoFacturacion ?? ''}${numeracion.siguienteConsecutivo}`
              : undefined}
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Select label="Forma de pago" options={formaPagoOptions} value={formaPago} onChange={e => setFormaPago(e.target.value as 'CONTADO' | 'CREDITO')} />
            {formaPago === 'CREDITO' && (
              <Input label="Fecha de vencimiento *" type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
            )}
          </div>
          <p className="text-xs text-[#6e7681] mt-3">
            Una factura confirmada no se puede modificar. Para corregirla se usa una nota crédito (HU-08).
            {!puedeEmitir && ' La configuración está incompleta: no es posible confirmar.'}
          </p>
        </Modal>
      )}

      {detail && (
        <Modal title={`Factura ${detail.factura.numero}`} open onClose={() => setDetail(null)} width="max-w-2xl">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div><span className="text-[#6e7681]">Cliente:</span> {detail.factura.cliente?.nombreRazonSocial}</div>
              <div><span className="text-[#6e7681]">Emisión:</span> <span className="font-mono text-xs">{formatDate(detail.factura.fechaEmision)}</span></div>
              <div><span className="text-[#6e7681]">Orden:</span> <span className="font-mono text-xs">{detail.factura.orden?.numero}</span></div>
              <div><span className="text-[#6e7681]">Forma de pago:</span> {detail.factura.formaPago === 'CONTADO' ? 'Contado' : `Crédito · vence ${detail.factura.fechaVencimiento}`}</div>
              <div className="col-span-2"><span className="text-[#6e7681]">Estado DIAN:</span> <Badge variant={DIAN_STATUS[detail.factura.estadoDian].badge}>{DIAN_STATUS[detail.factura.estadoDian].label}</Badge></div>
              <div className="col-span-2 break-all">
                <span className="text-[#6e7681]">CUFE:</span>{' '}
                <span className="font-mono text-[10px] text-[#8b949e]">{detail.factura.cufe ?? 'No aplica (factura interna anterior a HU-06)'}</span>
              </div>
            </div>
            <InvoiceSummary
              items={detail.items.map(i => ({
                id: i.id, descripcion: i.descripcion, cantidad: i.cantidad, precioUnitario: i.precioUnitario,
                tarifaIva: i.tarifaIva, subtotal: i.subtotal,
              }))}
              subtotal={detail.factura.subtotal}
              impuestos={detail.factura.impuestos}
              total={detail.factura.total}
            />
            {detail.factura.estadoDian === 'PENDIENTE_ENVIO' && (
              <p className="text-xs text-[#6e7681]">
                Documento generado con su CUFE y listo para firma. La firma digital y el envío a la DIAN se realizan en HU-07;
                hasta entonces esta factura no ha sido validada por la DIAN.
              </p>
            )}
            {detail.factura.xmlPath && (
              <div className="flex justify-end"><Button variant="outline" onClick={() => downloadXml(detail.factura)}>Descargar XML</Button></div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

type SummaryItem = {
  id: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  tarifaIva: string;
  tratamientoIva?: string;
  subtotal: string;
};

function InvoiceSummary({ config, cliente, items, subtotal, impuestos, total, numeroLabel }: {
  config?: BackendConfiguracion | null;
  cliente?: BackendOrden['cliente'];
  items: SummaryItem[];
  subtotal: string;
  impuestos: string;
  total: string;
  numeroLabel?: string;
}) {
  const empresa = config?.empresa;
  const ivaLabel = (item: SummaryItem) =>
    item.tratamientoIva === 'EXCLUIDO' ? 'Excluido'
      : item.tratamientoIva === 'EXENTO' ? 'Exento'
      : `${toNumber(item.tarifaIva)}%`;

  return (
    <div className="flex flex-col gap-4">
      {(empresa || cliente) && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] p-3">
            <div className="text-[#6e7681] uppercase tracking-wider mb-1">Emisor</div>
            {empresa ? (
              <>
                <div className="text-[#e6edf3] font-semibold">{empresa.razonSocial}</div>
                <div className="font-mono">NIT {empresa.nit}-{empresa.digitoVerificacion}</div>
                <div>{empresa.direccion} · {empresa.ciudad}</div>
              </>
            ) : <div className="text-yellow-400">Sin datos de empresa</div>}
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] p-3">
            <div className="text-[#6e7681] uppercase tracking-wider mb-1">Adquiriente</div>
            <div className="text-[#e6edf3] font-semibold">{cliente?.nombreRazonSocial}</div>
            <div className="font-mono">{cliente?.tipoIdentificacion} {cliente?.numeroIdentificacion}{cliente?.digitoVerificacion ? `-${cliente.digitoVerificacion}` : ''}</div>
            <div>{cliente?.email ?? ''}</div>
          </div>
        </div>
      )}
      {numeroLabel && <div className="text-xs font-mono text-[#f97316]">{numeroLabel}</div>}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#6e7681] border-b border-[#30363d]">
            <th className="text-left py-1.5">Concepto</th>
            <th className="text-right">Cant.</th>
            <th className="text-right">Precio unit.</th>
            <th className="text-right">IVA</th>
            <th className="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b border-[#30363d]/50">
              <td className="py-1.5 text-[#e6edf3]">{item.descripcion}</td>
              <td className="text-right font-mono">{toNumber(item.cantidad)}</td>
              <td className="text-right font-mono">{formatCOP(item.precioUnitario)}</td>
              <td className="text-right font-mono">{ivaLabel(item)}</td>
              <td className="text-right font-mono">{formatCOP(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col items-end gap-0.5 text-sm font-mono">
        <div><span className="text-[#6e7681] mr-3">Subtotal</span>{formatCOP(subtotal)}</div>
        <div><span className="text-[#6e7681] mr-3">IVA</span>{formatCOP(impuestos)}</div>
        <div className="text-base font-bold text-[#e6edf3]"><span className="text-[#6e7681] mr-3 font-normal">Total</span>{formatCOP(total)}</div>
      </div>
    </div>
  );
}
