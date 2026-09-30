import React from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={confirmLabel}
      confirmVariant={destructive ? 'destructive' : 'primary'}
      width="max-w-sm"
    >
      <p className="text-sm text-[#8b949e]">{message}</p>
    </Modal>
  );
}
