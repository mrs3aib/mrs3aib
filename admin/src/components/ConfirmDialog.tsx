import { useLanguage } from "@/i18n/languageContext";
import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-secondary">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          {t("Cancel", "إلغاء")}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          loading={loading}
          className={destructive ? "bg-danger text-base hover:bg-danger/90" : ""}
        >
          {confirmLabel ?? t("Confirm", "تأكيد")}
        </Button>
      </div>
    </Modal>
  );
}


