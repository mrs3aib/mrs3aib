import { type FormEvent, useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { useLanguage } from "@/i18n/languageContext";
import {
  useGallerySettingsQuery,
  useUpdateGallerySettings
} from "@/hooks/useGallerySettings";
import type { PhotoSession } from "@/types/session";

/**
 * Set or clear the gallery password for one session.
 *
 * The password itself is never sent back by the API — only whether one is set
 * — so this cannot show the current value. It offers "replace it" or "remove
 * it" rather than pretending to display something it does not have.
 */
export function SessionPasswordModal({
  session,
  onClose
}: {
  session: PhotoSession | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const open = Boolean(session);
  const sessionId = session?.id ?? "";

  const settingsQuery = useGallerySettingsQuery(sessionId);
  const updateSettings = useUpdateGallerySettings(sessionId);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Never carry one session's typed password into the next dialog.
  useEffect(() => {
    setPassword("");
    setConfirm("");
    setError(null);
  }, [sessionId]);

  const hasPassword = Boolean(settingsQuery.data?.passwordProtected);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError(t("Use at least 4 characters.", "استخدم 4 أحرف على الأقل."));
      return;
    }
    if (password !== confirm) {
      setError(t("The passwords do not match.", "كلمتا المرور غير متطابقتين."));
      return;
    }

    try {
      await updateSettings.mutateAsync({ passwordProtected: true, password });
      onClose();
    } catch {
      setError(t("Could not save. Try again.", "تعذر الحفظ. حاول مرة أخرى."));
    }
  };

  const handleRemove = async () => {
    setError(null);
    try {
      // `passwordProtected: false` clears the stored hash server-side, so the
      // album stops asking even if it is still marked `protected`.
      await updateSettings.mutateAsync({ passwordProtected: false, password: null });
      onClose();
    } catch {
      setError(t("Could not save. Try again.", "تعذر الحفظ. حاول مرة أخرى."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Gallery password", "كلمة مرور المعرض")}
      closeOnBackdrop={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-secondary">
          {session?.title}
        </p>

        {settingsQuery.isPending ? (
          <p className="text-sm text-secondary">{t("Loading…", "جارٍ التحميل…")}</p>
        ) : (
          <>
            <p className="rounded-lg border border-line bg-base px-3 py-2 text-xs text-secondary">
              {hasPassword
                ? t(
                    "A password is already set. Entering a new one replaces it.",
                    "توجد كلمة مرور بالفعل. إدخال كلمة جديدة سيستبدلها."
                  )
                : t(
                    "Visitors will need this password to open the album. It only applies while the session's visibility is set to Password.",
                    "سيحتاج الزوار إلى كلمة المرور هذه لفتح الألبوم. تسري فقط عندما تكون رؤية الجلسة مضبوطة على كلمة مرور."
                  )}
            </p>

            <TextField
              label={t("New password", "كلمة المرور الجديدة")}
              name="gallery-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              label={t("Confirm password", "تأكيد كلمة المرور")}
              name="gallery-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-2">
              {hasPassword ? (
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={updateSettings.isPending}
                  className="text-sm text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {t("Remove password", "إزالة كلمة المرور")}
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" onClick={onClose}>
                  {t("Cancel", "إلغاء")}
                </Button>
                <Button type="submit" loading={updateSettings.isPending}>
                  {t("Save password", "حفظ كلمة المرور")}
                </Button>
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
