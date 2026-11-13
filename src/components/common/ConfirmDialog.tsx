"use client";

import { GlassButton } from "@/components/glass/GlassButton";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text: string;
  confirmLabel?: string;
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  text,
  confirmLabel = "Delete",
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-md"
      footer={
        <>
          <GlassButton variant="glass" onClick={onClose} disabled={loading}>
            Cancel
          </GlassButton>
          <GlassButton
            className="!bg-danger shadow-[0_8px_24px_-8px_rgba(234,33,67,0.6)] hover:!brightness-110"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </GlassButton>
        </>
      }
    >
      <p className="text-muted">{text}</p>
    </Modal>
  );
}
