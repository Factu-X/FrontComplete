import React from 'react';
import { ENVIO_LABELS } from '../../lib/invoices';
import type { BackendEnvioDian } from '../../lib/types';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });

export default function DianSubmissions({ envios }: { envios: BackendEnvioDian[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-[#6e7681] uppercase tracking-wider">Envíos a la DIAN (ambiente simulado)</div>
      {envios.length === 0 ? (
        <div className="text-xs text-[#6e7681]">Todavía no se ha enviado.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {envios.map(envio => (
            <li key={envio.id} className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#8b949e]">Intento {envio.numeroIntento} · {formatDateTime(envio.fechaEnvio)}</span>
                <span className={envio.estado === 'VALIDADO' ? 'text-emerald-400' : 'text-red-400'}>
                  {ENVIO_LABELS[envio.estado]}{envio.codigoRespuesta && ` · código ${envio.codigoRespuesta}`}
                </span>
              </div>
              {envio.mensajeRespuesta && (
                <div className="mt-1 text-xs text-[#8b949e] whitespace-pre-line">{envio.mensajeRespuesta}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
