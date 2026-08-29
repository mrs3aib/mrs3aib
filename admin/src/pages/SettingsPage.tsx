import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { FancyDatePicker } from "@/components/FancyDatePicker";
import { SettingsIcon, ShieldIcon } from "@/components/icons";
import { TextField } from "@/components/TextField";
import { Toggle } from "@/components/Toggle";
import { useGallerySettingsQuery, useUpdateGallerySettings } from "@/hooks/useGallerySettings";
import { usePageAssetUpload } from "@/hooks/usePageAssetUpload";
import { useSessionsQuery } from "@/hooks/useSessions";
import { useLanguage } from "@/i18n/languageContext";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "@/services/authService";
import type { GallerySettings } from "@/types/gallerySettings";

/**
 * Only tabs backed by something that actually persists are offered.
 *
 * `gallery` writes per-session gallery settings. `preferences` is the admin UI
 * language, held in localStorage by LanguageProvider.
 *
 * Contact details are edited in Pages → Home → Contact, which
 * writes the same `contact` slice of the homepage record.
 */
type SettingsTab = "gallery" | "preferences";

const tabs: Array<{ id: SettingsTab; labelEn: string; labelAr: string }> = [
  { id: "gallery", labelEn: "Gallery Protection", labelAr: "حماية المعرض" },
  { id: "preferences", labelEn: "Preferences", labelAr: "التفضيلات" }
];

function SettingCard({
  title,
  description,
  children,
  className = ""
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-line bg-card p-5 shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}
    >
      <h2 className="text-base font-semibold text-primary">{title}</h2>
      {description ? <p className="mt-1 text-sm text-secondary">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Admin UI language — persisted to localStorage by LanguageProvider. */
function PreferenceSettings() {
  const { t, language, setLanguage } = useLanguage();
  const admin = useAuthStore((s) => s.admin);
  const setAdmin = useAuthStore((s) => s.setAdmin);
  const [name, setName] = useState(admin?.name ?? "");
  const [email, setEmail] = useState(admin?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSaved, setAccountSaved] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    setName(admin?.name ?? "");
    setEmail(admin?.email ?? "");
  }, [admin]);

  const saveAccount = async () => {
    setAccountError(null);
    setAccountSaved(false);
    setSavingAccount(true);
    try {
      const updated = await updateProfile({
        name,
        email,
        currentPassword,
        ...(newPassword ? { newPassword } : {})
      });
      setAdmin(updated);
      setCurrentPassword("");
      setNewPassword("");
      setAccountSaved(true);
    } catch {
      setAccountError(t("Could not update account. Check your current password and try again.", "تعذر تحديث الحساب. تحقق من كلمة المرور الحالية ثم حاول مجددًا."));
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <div className="grid gap-4 [&>:last-child]:hidden xl:grid-cols-2 xl:items-start">
      <div className="space-y-4">
      <SettingCard
        title={t("Language", "اللغة")}
        className="self-start"
        description={t(
          "Language used across the admin dashboard.",
          "اللغة المستخدمة في لوحة التحكم."
        )}
      >
        <div className="flex gap-2">
          {(["en", "ar"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLanguage(option)}
              className={`flex h-11 flex-1 items-center justify-center rounded-lg border text-sm transition-colors ${
                language === option
                  ? "border-accent bg-accent/10 font-medium text-primary"
                  : "border-line text-secondary hover:border-accent hover:text-primary"
              }`}
            >
              {option === "en" ? "English" : "العربية"}
            </button>
          ))}
        </div>
      </SettingCard>

      <SettingCard
        title={t("Account", "الحساب")}
        description={t("The account currently signed in to this dashboard.", "الحساب المسجل دخوله حالياً في لوحة التحكم.")}
      >
        <dl className="divide-y divide-line text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-secondary">{t("Name", "الاسم")}</dt>
            <dd className="text-primary">{admin?.name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-secondary">{t("Email", "البريد الإلكتروني")}</dt>
            <dd className="text-primary" dir="ltr">{admin?.email ?? "—"}</dd>
          </div>
        </dl>
      </SettingCard>
    </div>

      <SettingCard
        title={t("Account details", "بيانات الحساب")}
        description={t("Update your name, email, or password.", "حدّث الاسم أو البريد الإلكتروني أو كلمة المرور.")}
      >
        <div className="space-y-4">
          <TextField label={t("Name", "الاسم")} value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label={t("Email", "البريد الإلكتروني")} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label={t("Current password", "كلمة المرور الحالية")} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <TextField label={t("New password (optional)", "كلمة المرور الجديدة (اختياري)")} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t("At least 8 characters", "8 أحرف على الأقل")} />
          {accountError ? <p className="text-sm text-danger">{accountError}</p> : null}
          {accountSaved ? <p className="text-sm text-success">{t("Account updated.", "تم تحديث الحساب.")}</p> : null}
          <Button type="button" loading={savingAccount} onClick={() => void saveAccount()} disabled={!name.trim() || !email.trim() || !currentPassword}>
            {t("Save account details", "حفظ بيانات الحساب")}
          </Button>
        </div>
      </SettingCard>

      <SettingCard
        title={t("Account", "الحساب")}
        description={t("The account you are signed in with.", "الحساب المسجل دخوله حاليًا.")}
      >
        <dl className="divide-y divide-line text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-secondary">{t("Name", "الاسم")}</dt>
            <dd className="text-primary">{admin?.name ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-secondary">{t("Email", "البريد الإلكتروني")}</dt>
            <dd className="text-primary" dir="ltr">
              {admin?.email ?? "—"}
            </dd>
          </div>
        </dl>
      </SettingCard>
    </div>
  );
}

/** Per-session gallery protection. */
function GalleryProtection({
  sessionId,
  setSessionId
}: {
  sessionId: string;
  setSessionId: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [sessionSearch, setSessionSearch] = useState("");
  const { data: sessionsData, isPending: sessionsPending } = useSessionsQuery({
    page: 1,
    pageSize: 100
  });
  const matchingSessions = (sessionsData?.items ?? []).filter((session) => {
    const query = sessionSearch.trim().toLocaleLowerCase();
    return !query || `${session.title} ${session.location}`.toLocaleLowerCase().includes(query);
  });

  return (
    <SettingCard
      title={t("Gallery Protection", "حماية المعرض")}
      description={t(
        "Download, watermark, and password rules for one session's gallery.",
        "قواعد التنزيل والعلامة المائية وكلمة المرور لمعرض جلسة واحدة."
      )}
    >
      <div className="max-w-md space-y-3">
        <TextField
          label={t("Find a session", "ابحث عن جلسة")}
          value={sessionSearch}
          onChange={(event) => setSessionSearch(event.target.value)}
          placeholder={t("Search by session name or location", "ابحث باسم الجلسة أو الموقع")}
        />
      <label className="block">
        <span className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary">
          {t("Session", "الجلسة")}
        </span>
        <select
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          disabled={sessionsPending}
          className="h-11 w-full rounded-md border border-line bg-base px-3.5 text-sm text-primary outline-none transition-colors focus:border-accent disabled:opacity-60"
        >
          <option value="">
            {sessionsPending
              ? t("Loading sessions...", "جارٍ تحميل الجلسات...")
              : t("Select a session", "اختر جلسة")}
          </option>
          {matchingSessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title}
            </option>
          ))}
        </select>
      </label>
      {sessionSearch.trim() && !sessionsPending && matchingSessions.length === 0 ? (
        <p className="text-xs text-secondary">
          {t("No sessions match your search.", "لا توجد جلسات مطابقة للبحث.")}
        </p>
      ) : null}
      </div>

      {sessionId ? (
        <SessionSettingsForm sessionId={sessionId} />
      ) : (
        <p className="mt-5 text-sm text-secondary">
          {t(
            "Choose a session to edit its gallery protection.",
            "اختر جلسة لتحرير إعدادات حماية معرضها."
          )}
        </p>
      )}
    </SettingCard>
  );
}

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(searchParams.get("sessionId") ?? "");
  const [activeTab, setActiveTab] = useState<SettingsTab>("gallery");
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-card p-5 shadow-[0_18px_60px_rgba(25,25,25,0.04)]">
        <div className="flex items-start gap-3">
          <SettingsIcon className="mt-1 h-6 w-6 shrink-0 text-accent" />
          <div>
            <h1 className="text-2xl font-semibold text-primary">
              {t("Settings", "الإعدادات")}
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {t(
                "Manage gallery protection and preferences.",
                "إدارة حماية المعرض والتفضيلات."
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="flex gap-2 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px h-11 whitespace-nowrap border-b-2 px-5 text-sm transition-colors ${
              activeTab === tab.id
                ? "border-accent font-medium text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {t(tab.labelEn, tab.labelAr)}
          </button>
        ))}
      </div>

      {activeTab === "gallery" ? (
        <GalleryProtection sessionId={sessionId} setSessionId={setSessionId} />
      ) : null}
      {activeTab === "preferences" ? <PreferenceSettings /> : null}
    </div>
  );
}

function SessionSettingsForm({ sessionId }: { sessionId: string }) {
  const { data, isPending, isError, refetch } = useGallerySettingsQuery(sessionId);
  const updateSettings = useUpdateGallerySettings(sessionId);
  const uploadWatermark = usePageAssetUpload(`watermark-${sessionId}`);
  const { t } = useLanguage();
  const [draft, setDraft] = useState<GallerySettings | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  if (isError) {
    return (
      <div className="mt-5 max-w-lg rounded-lg border border-danger/30 bg-danger/5 p-5">
        <p className="text-sm text-danger">
          {t("Could not load gallery settings.", "تعذر تحميل إعدادات المعرض.")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </div>
    );
  }

  if (isPending || !draft) {
    return (
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="block h-14 animate-pulse rounded-md bg-line" />
        ))}
      </div>
    );
  }

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    try {
      await updateSettings.mutateAsync({
        allowDownloads: draft.allowDownloads,
        watermarkPreviewImages: draft.watermarkPreviewImages,
        watermarkUrl: draft.watermarkUrl,
        hideOriginalFileNames: draft.hideOriginalFileNames,
        passwordProtected: draft.passwordProtected,
        password: draft.passwordProtected ? draft.password : null,
        expiresAt: draft.expiresAt || null
      });
      setSaved(true);
    } catch {
      setSaveError(
        t(
          "Could not save settings. Please try again.",
          "تعذر حفظ الإعدادات. يرجى المحاولة مرة أخرى."
        )
      );
    }
  };

  return (
    <div className="mt-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="divide-y divide-line rounded-lg border border-line bg-white px-5">
          <Toggle
            label={t("Allow downloads", "السماح بالتنزيل")}
            description={t(
              "Clients can download their photos and videos.",
              "يمكن للعملاء تنزيل الصور والفيديوهات الخاصة بهم."
            )}
            checked={draft.allowDownloads}
            onChange={(checked) => setDraft({ ...draft, allowDownloads: checked })}
          />
          <Toggle
            label={t("Watermark preview images", "إضافة علامة مائية للمعاينات")}
            description={t(
              "Overlay a watermark on gallery previews.",
              "عرض علامة مائية فوق معاينات المعرض."
            )}
            checked={draft.watermarkPreviewImages}
            onChange={(checked) => setDraft({ ...draft, watermarkPreviewImages: checked })}
          />
          <Toggle
            label={t("Hide original file names", "إخفاء أسماء الملفات الأصلية")}
            description={t(
              "Show generic file names instead of the originals.",
              "عرض أسماء عامة بدلا من الأسماء الأصلية."
            )}
            checked={draft.hideOriginalFileNames}
            onChange={(checked) => setDraft({ ...draft, hideOriginalFileNames: checked })}
          />
          <Toggle
            label={t("Password protect gallery", "حماية المعرض بكلمة مرور")}
            description={t(
              "Require a password before clients can view this gallery.",
              "طلب كلمة مرور قبل أن يتمكن العملاء من مشاهدة المعرض."
            )}
            checked={draft.passwordProtected}
            onChange={(checked) => setDraft({ ...draft, passwordProtected: checked })}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="watermark-upload"
              className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
            >
              {t("Watermark image", "صورة العلامة المائية")}
            </label>
            <input
              id="watermark-upload"
              type="file"
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              disabled={uploadWatermark.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadWatermark
                  .mutateAsync(file)
                  .then((asset) => setDraft((current) => current ? { ...current, watermarkUrl: asset.assetUrl } : current));
              }}
              className="w-full rounded-md border border-line bg-base px-3.5 py-2.5 text-sm text-primary file:me-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-base disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-secondary">
              {t(
                "Upload a transparent PNG, SVG, WebP, or JPG. Save settings to apply it to previews.",
                "ارفع ملف PNG أو SVG أو WebP أو JPG، ثم احفظ الإعدادات لتطبيقه على المعاينات."
              )}
            </p>
            {uploadWatermark.isError ? (
              <p className="mt-2 text-xs text-danger">
                {t("Could not upload watermark. Please try again.", "تعذر رفع العلامة المائية. حاول مرة أخرى.")}
              </p>
            ) : null}
            {draft.watermarkUrl ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-16 w-28 items-center justify-center rounded-md border border-line bg-base p-2">
                  <img src={draft.watermarkUrl} alt="Watermark preview" className="max-h-full max-w-full object-contain" />
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDraft({ ...draft, watermarkUrl: null })}
                >
                  {t("Remove watermark", "إزالة العلامة المائية")}
                </Button>
              </div>
            ) : null}
          </div>
          {draft.passwordProtected ? (
            <TextField
              label={t("Gallery password", "كلمة مرور المعرض")}
              type="text"
              value={draft.password ?? ""}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              placeholder={t("Enter a password", "أدخل كلمة مرور")}
            />
          ) : null}
          <FancyDatePicker
            label={t("Gallery expiration date", "تاريخ انتهاء المعرض")}
            value={draft.expiresAt?.slice(0, 10) ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, expiresAt: event.target.value ? event.target.value : null })
            }
          />
          {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
          {saved && !updateSettings.isPending ? (
            <p className="text-sm text-success">{t("Settings saved.", "تم حفظ الإعدادات.")}</p>
          ) : null}
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={updateSettings.isPending}
            className="bg-accent text-white hover:bg-primary"
          >
            <ShieldIcon className="h-4 w-4" />
            {t("Save gallery settings", "حفظ إعدادات المعرض")}
          </Button>
        </div>
      </div>
    </div>
  );
}
