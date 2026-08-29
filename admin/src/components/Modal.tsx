import { useEffect, type ReactNode } from "react";
import { useLanguage } from "@/i18n/languageContext";
import { CloseIcon } from "./icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  panelClassName?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  closeOnBackdrop = true,
  panelClassName = ""
}: ModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-card p-6 shadow-lg ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="modal-title"
            className="tracking-title font-display text-lg font-semibold text-primary"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label={t("Close", "إغلاق")}
            onClick={onClose}
            className="text-secondary transition-colors hover:text-primary"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
