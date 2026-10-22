import React, { useEffect, useMemo, useState } from 'react';
import Button from '../atoms/Button';
import { ToastItem } from '../molecules/ToastContainer';
import { apiBlob, ApiSession, saveBlob } from '../../lib/api';
import { formatXml, summarizeInvoiceXml, tokenizeXmlLine } from '../../lib/xml';

export type DocumentKind = 'pdf' | 'xml';

interface Props {
  // Ruta del documento en la API, por ejemplo /facturas/:id o /notas-credito/:id.
  basePath: string;
  numero: string;
  hasXml: boolean;
  initial: DocumentKind;
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onBack: () => void;
}

const TOKEN_COLOR = { tag: 'text-sky-400', attr: 'text-violet-300', text: 'text-[#e6edf3]' } as const;

export default function DocumentPreview({ basePath, numero, hasXml, initial, session, addToast, onBack }: Props) {
  const [kind, setKind] = useState<DocumentKind>(initial);
  const [blobs, setBlobs] = useState<Partial<Record<DocumentKind, Blob>>>({});
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [xmlText, setXmlText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (blobs[kind]) return;
    let active = true;
    setError(null);
    apiBlob(`${basePath}/${kind}`, session)
      .then(async blob => {
        if (!active) return;
        setBlobs(prev => ({ ...prev, [kind]: blob }));
        if (kind === 'pdf') setPdfUrl(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })));
        else setXmlText(await blob.text());
      })
      .catch(err => active && setError(err instanceof Error ? err.message : 'No se pudo cargar el documento'));
    return () => { active = false; };
  }, [kind, basePath, session.token]);

  // El PDF se regenera en el servidor; la URL temporal se libera al salir.
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const formatted = useMemo(() => (xmlText ? formatXml(xmlText).split('\n') : []), [xmlText]);
  const summary = useMemo(() => (xmlText ? summarizeInvoiceXml(xmlText) : null), [xmlText]);

  function handleDownload() {
    const blob = blobs[kind];
    if (blob) saveBlob(blob, `${numero}.${kind}`);
    else addToast({ message: 'El documento todavía se está cargando', type: 'warning' });
  }

  const tabs: { id: DocumentKind; label: string; enabled: boolean }[] = [
    { id: 'pdf', label: 'PDF', enabled: true },
    { id: 'xml', label: 'XML firmado', enabled: hasXml },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={onBack}>← Volver al detalle</Button>
          <span className="font-mono text-sm text-[#f97316]">{numero}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex max-w-full overflow-x-auto rounded-[6px] border border-[#30363d] text-xs">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                disabled={!t.enabled}
                title={t.enabled ? undefined : 'Disponible después de enviar a la DIAN'}
                onClick={() => setKind(t.id)}
                className={`whitespace-nowrap px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${kind === t.id ? 'bg-[#f97316] text-[#0d1117] font-semibold' : 'text-[#8b949e] hover:bg-[#21262d]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {kind === 'pdf' && pdfUrl && (
            // Algunos navegadores móviles no muestran PDFs incrustados; en una pestaña sí.
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-[6px] px-3 py-1.5 text-xs text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]"
            >
              Abrir en pestaña
            </a>
          )}
          <Button size="sm" variant="secondary" onClick={handleDownload}>Descargar</Button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-[6px] text-sm text-red-300">{error}</div>
      )}

      {kind === 'pdf' && !error && pdfUrl && (
        <p className="sm:hidden text-xs text-[#6e7681]">¿El PDF sale en blanco? Algunos celulares no lo muestran aquí: usa "Abrir en pestaña".</p>
      )}

      {kind === 'pdf' && !error && (
        pdfUrl
          ? <iframe title={`Factura ${numero}`} src={pdfUrl} className="w-full h-[65dvh] sm:h-[70dvh] rounded-[6px] border border-[#30363d] bg-white" />
          : <div className="h-[65dvh] flex items-center justify-center text-sm text-[#6e7681]">Generando PDF...</div>
      )}

      {kind === 'xml' && !error && (
        xmlText && summary ? (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-3 text-xs">
              {[
                ['Número', summary.numero],
                ['Fecha y hora', summary.fecha],
                ['Total a pagar', summary.total],
                ['Firma', summary.firmado ? `Presente · firmado ${summary.fechaFirma ?? ''}` : 'No encontrada'],
                ['CUFE / CUDE', summary.cufe],
                ['Política de firma', summary.politica],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[#6e7681] uppercase tracking-wider">{label}</dt>
                  <dd className="font-mono text-[#e6edf3] break-all">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <pre className="h-[50dvh] sm:h-[55dvh] overflow-auto rounded-[6px] border border-[#30363d] bg-[#0d1117] p-3 text-xs leading-5 font-mono">
              {formatted.map((line, i) => (
                <div key={i} className="whitespace-pre">
                  <span className="select-none inline-block w-10 pr-3 text-right text-[#484f58]">{i + 1}</span>
                  {tokenizeXmlLine(line).map((token, j) => (
                    <span key={j} className={TOKEN_COLOR[token.kind]}>{token.text}</span>
                  ))}
                </div>
              ))}
            </pre>
            <p className="text-xs text-[#6e7681]">
              Vista con sangría solo para leer. "Descargar" entrega el archivo original, que es el que conserva la firma válida.
            </p>
          </div>
        ) : (
          <div className="h-[50dvh] flex items-center justify-center text-sm text-[#6e7681]">Cargando XML...</div>
        )
      )}
    </div>
  );
}
