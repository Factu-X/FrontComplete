import React from 'react';
import Toast, { ToastType } from '../atoms/Toast';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: number) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}
