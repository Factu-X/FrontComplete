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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-[#161b22] border border-[#30363d] rounded-[8px] shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <h2 className="text-base font-semibold text-[#e6edf3]">{title}</h2>
          <button onClick={onClose} className="text-[#6e7681] hover:text-[#e6edf3] transition-colors text-lg leading-none">✕</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {onConfirm && (
          <div className="px-6 py-4 border-t border-[#30363d] flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
