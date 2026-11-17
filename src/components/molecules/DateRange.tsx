import React from 'react';

interface DateRangeProps {
  desde: string;
  hasta: string;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
  etiqueta?: string;
  // Muestra "Limpiar" cuando hay alguna fecha; sin onLimpiar el rango es obligatorio.
  onLimpiar?: () => void;
  children?: React.ReactNode;
}

const campo = 'bg-[#0d1117] border border-[#30363d] rounded-[6px] px-2 py-1.5 text-[#e6edf3]';

export default function DateRange({ desde, hasta, onDesde, onHasta, etiqueta, onLimpiar, children }: DateRangeProps) {
  const prefijo = etiqueta ? `${etiqueta} ` : '';
  return (
    <div className="flex items-center gap-2 text-xs text-[#8b949e]">
      {etiqueta && <span>{etiqueta}</span>}
      <input type="date" aria-label={`${prefijo}desde`} value={desde} max={hasta || undefined} onChange={e => onDesde(e.target.value)} className={campo} />
      <span>a</span>
      <input type="date" aria-label={`${prefijo}hasta`} value={hasta} min={desde || undefined} onChange={e => onHasta(e.target.value)} className={campo} />
      {onLimpiar && (desde || hasta) && (
        <button type="button" onClick={onLimpiar} className="text-[#f97316] hover:underline">Limpiar</button>
      )}
      {children}
    </div>
  );
}
