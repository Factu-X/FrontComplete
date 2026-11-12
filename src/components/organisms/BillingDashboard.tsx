import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../atoms/Button';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiSession, saveBlob } from '../../lib/api';
import { ANTIGUEDAD_LABELS, DIAN_LABELS, FORMA_PAGO_LABELS, METODO_LABELS, toCsv } from '../../lib/invoices';
import { formatCOP, toNumber } from '../../lib/orders';
import { agruparSerie, compactCOP, escalaY, rangoPreset, type Preset, type Punto } from '../../lib/reports';
import type { Antiguedad, EstadoDian, FormaPago, MetodoPago, ReporteFacturacion } from '../../lib/types';

const presets: [Preset, string][] = [
  ['mes', 'Este mes'],
  ['mes-anterior', 'Mes anterior'],
  ['30-dias', 'Últimos 30 días'],
  ['anio', 'Este año'],
];

const ACCENT = '#f97316';
const SURFACE = '#161b22';

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

// Columnas por día (o por mes en rangos largos). Una sola serie: el título la nombra, sin leyenda.
function RevenueChart({ puntos }: { puntos: Punto[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const [disponible, setDisponible] = useState(640);

  // La gráfica ocupa el ancho de su tarjeta; si no caben las columnas mínimas, se desliza.
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const observer = new ResizeObserver(([entrada]) => setDisponible(entrada!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const alto = 200;
  const margen = { top: 16, right: 8, bottom: 26, left: 52 };
  const banda = Math.max(10, (disponible - margen.left - margen.right) / Math.max(puntos.length, 1));
  const ancho = margen.left + margen.right + banda * puntos.length;
  const { tope, marcas } = escalaY(Math.max(...puntos.map(p => p.total), 0));
  const y = (valor: number) => margen.top + (alto - margen.top - margen.bottom) * (1 - valor / tope);
  const barra = Math.min(24, banda - 2);
  const maximo = puntos.reduce((m, p, i) => (p.total > (puntos[m]?.total ?? 0) ? i : m), 0);
  // Una etiqueta cada ~56px como mínimo para que no se monten.
  const cadaEtiqueta = Math.max(1, Math.ceil(56 / banda));
  const punto = activo !== null ? puntos[activo] : null;

  return (
    <div ref={contenedor} className="relative overflow-x-auto">
      <svg width={ancho} height={alto} role="img" aria-label="Facturado por periodo" className="block">
        {marcas.map(m => (
          <g key={m}>
            <line x1={margen.left} x2={ancho - margen.right} y1={y(m)} y2={y(m)} stroke="#30363d" strokeWidth={1} />
            <text x={margen.left - 8} y={y(m)} dy="0.32em" textAnchor="end" fontSize="10" fill="#6e7681" fontFamily="ui-monospace, monospace">
              {compactCOP(m)}
            </text>
          </g>
        ))}
        {puntos.map((p, i) => {
          const x = margen.left + i * banda + (banda - barra) / 2;
          const top = y(p.total);
          const h = alto - margen.bottom - top;
          const r = Math.min(4, h);
          return (
            <g key={p.clave} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)}>
              {/* Zona de hover más grande que la barra. */}
              <rect x={margen.left + i * banda} y={margen.top} width={banda} height={alto - margen.top - margen.bottom} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${alto - margen.bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + barra - r} Q${x + barra},${top} ${x + barra},${top + r} V${alto - margen.bottom} Z`}
                  fill={ACCENT}
                  opacity={activo === null || activo === i ? 1 : 0.45}
                />
              )}
              {i % cadaEtiqueta === 0 && (
                <text x={margen.left + i * banda + banda / 2} y={alto - 8} textAnchor="middle" fontSize="10" fill="#6e7681">{p.etiqueta}</text>
              )}
              {i === maximo && p.total > 0 && activo === null && (
                <text x={x + barra / 2} y={top - 5} textAnchor="middle" fontSize="10" fill="#e6edf3" fontFamily="ui-monospace, monospace">
                  {compactCOP(p.total)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={margen.left} x2={ancho - margen.right} y1={alto - margen.bottom} y2={alto - margen.bottom} stroke="#484f58" strokeWidth={1} />
      </svg>
      {punto && activo !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-[6px] border border-[#30363d] px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(margen.left + activo * banda, ancho - 150), background: SURFACE }}
        >
          <div className="text-[#8b949e]">{punto.etiqueta}</div>
          <div className="font-mono font-semibold text-[#e6edf3]">{formatCOP(punto.total)}</div>
          <div className="text-[#6e7681]">{punto.facturas} factura{punto.facturas === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  );
}

export default function BillingDashboard({ session, addToast }: Props) {
  const [preset, setPreset] = useState<Preset | 'custom'>('mes');
  const [rango, setRango] = useState(rangoPreset('mes'));
  const [reporte, setReporte] = useState<ReporteFacturacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [verTabla, setVerTabla] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiRequest<ApiEntityResponse<ReporteFacturacion>>(`/reportes/facturacion?desde=${rango.desde}&hasta=${rango.hasta}`, session)
      .then(response => setReporte(response.data))
      .catch(error => addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar el reporte', type: 'error' }))
      .finally(() => setLoading(false));
  }, [rango.desde, rango.hasta, session.token]);

  const puntos = useMemo(() => (reporte ? agruparSerie(reporte.serie) : []), [reporte]);
  const maxItem = Math.max(...(reporte?.topItems.map(i => toNumber(i.total)) ?? [0]), 1);

  function elegirPreset(p: Preset) {
    setPreset(p);
    setRango(rangoPreset(p));
  }

  function exportar() {
    if (!reporte) return;
    const csv = toCsv(
      ['Fecha', 'Facturas', 'Total facturado'],
      reporte.serie.map(d => [d.fecha, d.facturas, d.total.replace('.', ',')]),
    );
    saveBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `facturacion_${rango.desde}_${rango.hasta}.csv`);
  }

  const t = reporte?.totales;
  const kpis = [
    { label: 'Facturado', value: formatCOP(t?.facturado ?? 0), sub: `${t?.facturas ?? 0} facturas · IVA ${formatCOP(t?.iva ?? 0)}`, color: 'text-[#f97316]' },
    { label: 'Neto (− notas crédito)', value: formatCOP(t?.neto ?? 0), sub: `Notas crédito ${formatCOP(t?.notasCredito ?? 0)}`, color: 'text-[#e6edf3]' },
    { label: 'Recaudado en el periodo', value: formatCOP(t?.recaudado ?? 0), sub: `Ticket promedio ${formatCOP(t?.ticketPromedio ?? 0)}`, color: 'text-emerald-400' },
    { label: 'Por cobrar hoy', value: formatCOP(reporte?.cartera.porCobrar ?? 0), sub: `Vencido ${formatCOP(reporte?.cartera.vencido ?? 0)}`, color: 'text-yellow-400' },
  ];

  const seccion = 'bg-[#161b22] border border-[#30363d] rounded-[8px] p-4 flex flex-col gap-3 min-w-0';
  const tituloSeccion = 'text-sm font-semibold text-[#e6edf3]';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Resumen de facturación</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-09 · Ventas, notas crédito, recaudo y cartera del periodo</p>
        </div>
        <Button variant="secondary" onClick={exportar} disabled={!reporte}>Exportar CSV</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-xs">
          {presets.map(([p, label]) => (
            <button
              key={p}
              onClick={() => elegirPreset(p)}
              className={`whitespace-nowrap px-3 py-2 transition-colors ${preset === p ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
            >{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8b949e]">
          <input
            type="date"
            aria-label="Desde"
            value={rango.desde}
            max={rango.hasta}
            onChange={e => { setPreset('custom'); setRango(r => ({ ...r, desde: e.target.value })); }}
            className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-2 py-1.5 text-[#e6edf3]"
          />
          <span>a</span>
          <input
            type="date"
            aria-label="Hasta"
            value={rango.hasta}
            min={rango.desde}
            onChange={e => { setPreset('custom'); setRango(r => ({ ...r, hasta: e.target.value })); }}
            className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-2 py-1.5 text-[#e6edf3]"
          />
          {loading && <span className="text-[#6e7681]">Actualizando...</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#161b22] border border-[#30363d] rounded-[8px] px-4 py-3 min-w-0">
            <div className="text-xs text-[#6e7681] uppercase tracking-wider">{k.label}</div>
            <div className={`text-2xl font-bold font-mono truncate mt-1 ${k.color}`}>{k.value}</div>
            <div className="text-xs text-[#8b949e] mt-0.5 truncate">{k.sub}</div>
          </div>
        ))}
      </div>

      <section className={seccion}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={tituloSeccion}>Facturado por {puntos.length > 0 && reporte && reporte.serie.length > 62 ? 'mes' : 'día'}</h2>
          <button className="text-xs text-[#8b949e] hover:text-[#e6edf3]" onClick={() => setVerTabla(v => !v)}>
            {verTabla ? 'Ver gráfica' : 'Ver como tabla'}
          </button>
        </div>
        {!reporte ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-[#6e7681]">Cargando...</div>
        ) : verTabla ? (
          <div className="max-h-64 overflow-auto rounded-[6px] border border-[#30363d]">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#1c2128] text-xs text-[#8b949e] uppercase"><th className="px-3 py-2 text-left">Periodo</th><th className="px-3 py-2 text-right">Facturas</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
              <tbody>
                {puntos.map(p => (
                  <tr key={p.clave} className="border-t border-[#30363d]/60">
                    <td className="px-3 py-1.5 text-[#e6edf3]">{p.etiqueta}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-[#8b949e]">{p.facturas}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-[#e6edf3]">{formatCOP(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RevenueChart puntos={puntos} />
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className={seccion}>
          <h2 className={tituloSeccion}>Servicios y repuestos más vendidos</h2>
          {reporte?.topItems.length ? (
            <ul className="flex flex-col gap-2.5">
              {reporte.topItems.map(item => (
                <li key={item.codigo ?? item.descripcion} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-[#e6edf3] truncate">{item.descripcion} <span className="text-[#6e7681]">× {Number(item.cantidad)}</span></span>
                    <span className="font-mono text-[#8b949e] shrink-0">{formatCOP(item.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#21262d] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(toNumber(item.total) / maxItem) * 100}%`, background: ACCENT }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : <div className="text-sm text-[#6e7681]">Sin ventas en el periodo.</div>}
        </section>

        <section className={seccion}>
          <h2 className={tituloSeccion}>Mejores clientes</h2>
          {reporte?.topClientes.length ? (
            <ol className="flex flex-col divide-y divide-[#30363d]/60">
              {reporte.topClientes.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-5 text-center font-mono text-xs text-[#6e7681]">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#e6edf3] truncate">{c.nombre}</div>
                    <div className="text-xs text-[#6e7681]">{c.facturas} factura{c.facturas === 1 ? '' : 's'}</div>
                  </div>
                  <span className="font-mono text-[#e6edf3] shrink-0">{formatCOP(c.total)}</span>
                </li>
              ))}
            </ol>
          ) : <div className="text-sm text-[#6e7681]">Sin clientes en el periodo.</div>}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className={seccion}>
          <h2 className={tituloSeccion}>Estado DIAN</h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            {(['VALIDADA', 'PENDIENTE_ENVIO', 'RECHAZADA', 'ENVIADA'] as EstadoDian[]).map(e => (
              <div key={e} className="flex justify-between"><dt className="text-[#8b949e]">{DIAN_LABELS[e]}</dt><dd className="font-mono text-[#e6edf3]">{reporte?.porEstadoDian[e] ?? 0}</dd></div>
            ))}
          </dl>
        </section>
        <section className={seccion}>
          <h2 className={tituloSeccion}>Recaudo por método</h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            {(Object.keys(METODO_LABELS) as MetodoPago[]).map(m => (
              <div key={m} className="flex justify-between"><dt className="text-[#8b949e]">{METODO_LABELS[m]}</dt><dd className="font-mono text-[#e6edf3]">{formatCOP(reporte?.recaudoPorMetodo[m] ?? 0)}</dd></div>
            ))}
            {(Object.keys(FORMA_PAGO_LABELS) as FormaPago[]).map(f => (
              <div key={f} className="flex justify-between text-xs"><dt className="text-[#6e7681]">Facturas a {FORMA_PAGO_LABELS[f].toLowerCase()}</dt><dd className="font-mono text-[#8b949e]">{reporte?.porFormaPago[f] ?? 0}</dd></div>
            ))}
          </dl>
        </section>
        <section className={seccion}>
          <h2 className={tituloSeccion}>Cartera por antigüedad <span className="font-normal text-xs text-[#6e7681]">(hoy)</span></h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            {(Object.keys(ANTIGUEDAD_LABELS) as Antiguedad[]).map(a => (
              <div key={a} className="flex justify-between"><dt className="text-[#8b949e]">{ANTIGUEDAD_LABELS[a]}</dt><dd className="font-mono text-[#e6edf3]">{formatCOP(reporte?.cartera.porAntiguedad[a] ?? 0)}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
