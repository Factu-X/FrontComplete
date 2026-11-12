import React, { useEffect } from 'react';
import Button from '../atoms/Button';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'destructive';
  loading?: boolean;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({
  title,
  open,
  onClose,
  onConfirm,
  confirmLabel = 'Guardar',
  confirmVariant = 'primary',
  loading = false,
  children,
  width = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
      <button type="button" tabIndex={-1} aria-label="Cerrar" className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default" onClick={onClose} />
      {/* En celular ocupa toda la pantalla; desde sm es una ventana centrada con el ancho pedido. */}
      <div className={`relative w-full ${width} bg-[#161b22] sm:border border-[#30363d] sm:rounded-[8px] shadow-2xl flex flex-col h-dvh sm:h-auto sm:max-h-[90dvh]`}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#30363d]">
          <h2 className="text-base font-semibold text-[#e6edf3] truncate">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#6e7681] hover:text-[#e6edf3] transition-colors text-lg leading-none p-1">✕</button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 min-h-0">{children}</div>
        {onConfirm && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#30363d] flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
