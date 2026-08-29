import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SessionFormModal } from "@/components/SessionFormModal";
import { useLanguage } from "@/i18n/languageContext";
import type { SessionFormValues } from "@/services/sessionSchemas";
import type { SessionCategory } from "@/types/category";
import type { PhotoSession } from "@/types/session";

export function SessionPageDialogs({
  formOpen,
  editingSession,
  archiveTarget,
  deleteTarget,
  defaultCategory,
  formError,
  formSubmitting,
  archiveLoading,
  deleteLoading,
  onCloseForm,
  onSubmit,
  onArchiveConfirm,
  onArchiveCancel,
  onDeleteConfirm,
  onDeleteCancel
}: {
  formOpen: boolean;
  editingSession: PhotoSession | null;
  archiveTarget: PhotoSession | null;
  deleteTarget: PhotoSession | null;
  defaultCategory?: SessionCategory;
  formError: string | null;
  formSubmitting: boolean;
  archiveLoading: boolean;
  deleteLoading: boolean;
  onCloseForm: () => void;
  onSubmit: (values: SessionFormValues) => Promise<void>;
  onArchiveConfirm: () => void;
  onArchiveCancel: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      <SessionFormModal
        open={formOpen}
        onClose={onCloseForm}
        onSubmit={onSubmit}
        session={editingSession}
        defaultCategory={defaultCategory}
        submitting={formSubmitting}
        submitError={formError}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={t("Archive session", "أرشفة الجلسة")}
        description={
          archiveTarget
            ? t(`Archive "${archiveTarget.title}"?`, `أرشفة "${archiveTarget.title}"؟`)
            : ""
        }
        confirmLabel={t("Archive", "أرشفة")}
        loading={archiveLoading}
        onConfirm={onArchiveConfirm}
        onCancel={onArchiveCancel}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("Delete session", "حذف الجلسة")}
        description={
          deleteTarget
            ? t(
                `Delete "${deleteTarget.title}" permanently? This also removes its ${deleteTarget.mediaCount} media files.`,
                `حذف "${deleteTarget.title}" نهائياً؟ سيؤدي هذا أيضاً إلى حذف ${deleteTarget.mediaCount} من ملفات الوسائط.`
              )
            : ""
        }
        confirmLabel={t("Delete", "حذف")}
        destructive
        loading={deleteLoading}
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
      />
    </>
  );
}
