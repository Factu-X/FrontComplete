import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
};

const styles: Record<ToastType, string> = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  error: 'border-[#ef4444]/40 bg-[#ef4444]/10 text-red-300',
  warning: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
};

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-[6px] border text-sm font-medium shadow-xl ${styles[type]} animate-in`}>
      <span className="font-bold text-base">{icons[type]}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
}
