"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

export function Modal({ title, subtitle, onClose, children, wide = false, busy = false }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog
      open
      disablePointerDismissal={busy}
      onOpenChange={(nextOpen, details) => {
        if (nextOpen) return;
        if (busy) details.cancel();
        else onClose();
      }}
    >
        <DialogContent
          className={`ep-dialog-popup${wide ? " wide" : ""}`}
          showCloseButton={false}
          initialFocus={() => document.querySelector<HTMLElement>('[data-slot="dialog-content"] input:not([type=file]), [data-slot="dialog-content"] textarea, [data-slot="dialog-content"] select') ?? true}
        >
          <div className="modal-head">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
            </DialogHeader>
            <DialogClose className="icon-btn" aria-label="Fechar" disabled={busy}>
              <X size={20} />
            </DialogClose>
          </div>
          <div className="ep-dialog-body">{children}</div>
        </DialogContent>
    </Dialog>
  );
}
