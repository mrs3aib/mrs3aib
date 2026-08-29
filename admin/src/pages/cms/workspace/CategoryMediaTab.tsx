import { CalendarIcon } from "@/components/icons";
import { MediaGrid } from "@/components/MediaGrid";
import { LogoLoader } from "@/components/LogoLoader";
import { SessionPicker } from "@/components/SessionPicker";
import { SessionUploader } from "./SessionUploader";
import { useSessionQuery, useSessionsQuery } from "@/hooks/useSessions";
import { useLanguage } from "@/i18n/languageContext";
import type { SessionCategory } from "@/types/category";

export function CategoryMediaTab({
  category,
  sessionId,
  onSessionChange,
  onAddSession
}: {
  category: SessionCategory;
  sessionId: string;
  onSessionChange: (sessionId: string) => void;
  /** Send the admin to the Sessions tab to create one first. */
  onAddSession: () => void;
}) {
  const { t } = useLanguage();

  // Scoped to this page's category, so the picker can never point at a session
  // belonging to another page.
  const { data, isPending } = useSessionsQuery({
    page: 1,
    pageSize: 1,
    category,
    sort: "newest"
  });
  const { data: selectedSession } = useSessionQuery(sessionId);

  const hasSessions = (data?.total ?? 0) > 0;
  const selected =
    selectedSession && selectedSession.category === category ? selectedSession : undefined;

  if (isPending) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-line bg-card">
        <LogoLoader />
      </div>
    );
  }

  if (!hasSessions) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-12 text-center">
        <CalendarIcon className="mx-auto h-8 w-8 text-secondary" />
        <p className="mt-3 text-sm text-secondary">
          {t(
            "Media is organized per session, and this page has none yet.",
            "يتم تنظيم الوسائط حسب الجلسة، ولا توجد جلسات في هذه الصفحة بعد."
          )}
        </p>
        <button
          type="button"
          onClick={onAddSession}
          className="mt-4 h-11 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          {t("Add the first session", "أضف أول جلسة")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-card p-4">
        <h3 className="text-sm font-semibold text-primary">
          {t("Choose a session", "اختر جلسة")}
        </h3>
        <p className="mt-1 text-xs text-secondary">
          {t(
            "Search by title, date, or location. This is easier when the page has many sessions.",
            "ابحث بالعنوان أو التاريخ أو الموقع. هذا أسهل عندما تحتوي الصفحة على جلسات كثيرة."
          )}
        </p>
        <SessionPicker
          value={sessionId}
          onChange={onSessionChange}
          category={category}
          className="mt-3 max-w-3xl"
          emptyLabel={t("Search and select a session", "ابحث واختر جلسة")}
          emptyHint={t(
            "Type to find the session instead of scrolling through cards.",
            "اكتب للعثور على الجلسة بدل التمرير بين البطاقات."
          )}
        />
      </div>
      {selected ? (
        <>
          <SessionUploader sessionId={selected.id} sessionTitle={selected.title} />
          <div className="rounded-lg border border-line p-5">
            <MediaGrid sessionId={selected.id} coverImage={selected.coverImage} />
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-secondary">
          {t(
            "Select a session above to upload and manage its media.",
            "اختر جلسة بالأعلى لرفع وإدارة وسائطها."
          )}
        </p>
      )}
    </div>
  );
}
