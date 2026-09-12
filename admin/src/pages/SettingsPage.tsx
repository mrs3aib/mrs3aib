import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { SettingsIcon } from "@/components/icons";
import { TextField } from "@/components/TextField";
import { SessionGallerySettings } from "@/components/SessionGallerySettings";
import { useSessionsQuery } from "@/hooks/useSessions";
import { useLanguage } from "@/i18n/languageContext";
import { useAuthStore } from "@/store/authStore";
import { updateProfile } from "@/services/authService";

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
        <SessionGallerySettings sessionId={sessionId} />
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
