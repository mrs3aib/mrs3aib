import { Link } from "react-router-dom";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useLanguage } from "@/i18n/languageContext";
import type { SessionPasswordPrompt } from "@/hooks/useSessionPasswordFlow";
import type { PhotoSession } from "@/types/session";

/**
 * The step between asking for a gallery password and typing one.
 *
 * Built on `Modal` rather than `ConfirmDialog` because the body carries a link
 * to the client list, which a plain description string cannot hold.
 *
 * Nothing here enforces anything: dismissing any of these prompts leaves the
 * session exactly as it was. They exist so the two settings that have to agree
 * — the visibility and whether a password is set — are never silently out of
 * step, which is what the old UI allowed.
 */
export function SessionPasswordPromptDialog({
  session,
  kind,
  loading,
  onConfirm,
  onCancel
}: {
  session: PhotoSession | null;
  kind: SessionPasswordPrompt | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const open = Boolean(session && kind);
  const isPrivate = session?.visibility === "private";

  const title =
    kind === "require-protected"
      ? t("Switch to Protected?", "التحويل إلى محمي؟")
      : t("Set a gallery password?", "تعيين كلمة مرور للمعرض؟");

  return (
    <Modal open={open} onClose={onCancel} title={title} closeOnBackdrop={false}>
      <div className="space-y-3 text-sm text-secondary">
        <p className="font-medium text-primary">{session?.title}</p>

        {kind === "require-protected" ? (
          <p>
            {t(
              "This album is Public, so a password would be stored but the album would still open for anyone. Switching it to Protected keeps it listed and asks visitors for the password.",
              "هذا الألبوم عام، لذا ستُحفظ كلمة المرور لكن سيبقى الألبوم مفتوحاً للجميع. التحويل إلى محمي يبقيه ظاهراً في القائمة ويطلب كلمة المرور من الزوار."
            )}
          </p>
        ) : (
          <>
            <p>
              {isPrivate
                ? t(
                    "This album is now Private: it is hidden from the category listing and opens for anyone holding the link. Setting a password puts a guard on that link.",
                    "هذا الألبوم خاص الآن: لا يظهر في قائمة الفئة ويُفتح لأي شخص يملك الرابط. تعيين كلمة مرور يضع حاجزاً على هذا الرابط."
                  )
                : t(
                    "This album is now Protected, but no password is set yet — so it still opens for anyone. Set one to close the gate.",
                    "هذا الألبوم محمي الآن، لكن لم تُعيَّن كلمة مرور بعد — لذا لا يزال يُفتح للجميع. عيّن واحدة لإغلاق الحاجز."
                  )}
            </p>
            {isPrivate && session ? (
              <p>
                {t("To give one client access, ", "لمنح عميل واحد حق الوصول، ")}
                <Link
                  to={`/clients?sessionId=${session.id}`}
                  className="text-accent underline"
                >
                  {t(
                    "add them to the client list and assign this session",
                    "أضفه إلى قائمة العملاء وأسند إليه هذه الجلسة"
                  )}
                </Link>
                {t(
                  " — they sign in with their own password, which is separate from the gallery password below.",
                  " — يسجّل الدخول بكلمة مروره الخاصة، وهي منفصلة عن كلمة مرور المعرض أدناه."
                )}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          {kind === "require-protected"
            ? t("Cancel", "إلغاء")
            : t("Not now", "ليس الآن")}
        </Button>
        <Button type="button" onClick={onConfirm} loading={loading}>
          {kind === "require-protected"
            ? t("Switch and set password", "التحويل وتعيين كلمة المرور")
            : t("Set password", "تعيين كلمة المرور")}
        </Button>
      </div>
    </Modal>
  );
}
