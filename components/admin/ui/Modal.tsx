"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Shared modal primitive. Predefined sizes so the admin panel doesn't
 * drift into five different widths. Backdrop-click + Esc close.
 *
 * <Modal
 *   title="Record payment"
 *   description="Enter amount + date…"
 *   onClose={() => setOpen(false)}
 *   size="md"
 *   footer={<><Cancel/><Save/></>}
 * >
 *   <form>…</form>
 * </Modal>
 */
type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const SIZE_CLS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  size = "md",
  /** Prevent close on backdrop click — use for destructive / data-entry modals where
   *  an accidental click shouldn't throw away input. */
  dismissOnBackdrop = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  size?: ModalSize;
  dismissOnBackdrop?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={dismissOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white rounded-[5px] w-full ${SIZE_CLS[size]} max-h-[90vh] overflow-hidden flex flex-col shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-lightgray flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id="modal-title" className="text-base font-semibold text-black truncate">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray hover:text-black hover:bg-background-alt rounded-[5px] flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="p-4 border-t border-lightgray bg-background-alt/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
