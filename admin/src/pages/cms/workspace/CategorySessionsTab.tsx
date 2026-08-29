import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { CloseIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SessionFormModal } from "@/components/SessionFormModal";
import { AddSessionStepper } from "./AddSessionStepper";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useArchiveSession,
  useDeleteSession,
  useSessionsQuery,
  useUpdateSession
} from "@/hooks/useSessions";
import { useLanguage } from "@/i18n/languageContext";
import type { SessionFormValues } from "@/services/sessionSchemas";
import type { SessionCategory } from "@/types/category";
import { SessionPasswordModal } from "@/components/SessionPasswordModal";
import type {
  PhotoSession,
  SessionSort,
  SessionStatus,
  SessionVisibility
} from "@/types/session";
import { SessionsHeader } from "@/pages/sessions/SessionsHeader";
import { SessionsSidebar } from "@/pages/sessions/SessionsSidebar";
import { SessionsTableCard } from "@/pages/sessions/SessionsTableCard";
import {
  PAGE_SIZE_OPTIONS,
  categoryBreakdown,
  exportSessionsCsv,
  pageWindow,
  type SessionSummaryRow
} from "@/pages/sessions/sessionPageUtils";

export function CategorySessionsTab({
  category,
  onOpenMedia
}: {
  category: SessionCategory;
  /** Jump to the Media tab with this session selected. */
  onOpenMedia: (session: PhotoSession) => void;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<SessionStatus | "">("");
  const [passwordTarget, setPasswordTarget] = useState<PhotoSession | null>(null);
  const [sort, setSort] = useState<SessionSort>("newest");
  const [adding, setAdding] = useState(false);
  const [editingSession, setEditingSession] = useState<PhotoSession | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PhotoSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PhotoSession | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 300);

  const { data, isPending, isError, refetch } = useSessionsQuery({
    page,
    pageSize,
    sort,
    category,
    ...(search ? { search } : {}),
    ...(status ? { status } : {})
  });

  const updateSession = useUpdateSession();
  const archiveSession = useArchiveSession();
  const deleteSession = useDeleteSession();

  const sessions = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pageNumbers = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);
  const hasFilters = Boolean(searchInput || status || sort !== "newest");
  const totalMedia = useMemo(
    () => sessions.reduce((sum, session) => sum + session.mediaCount, 0),
    [sessions]
  );
  const sessionTypeBreakdown = useMemo(() => categoryBreakdown(sessions), [sessions]);
  const summaryRows: SessionSummaryRow[] = [
    { value: total, label: t("Total sessions", "إجمالي الجلسات"), status: "" },
    { value: data?.statusCounts?.active, label: t("Active", "نشطة"), status: "active" },
    { value: data?.statusCounts?.draft, label: t("Draft", "مسودة"), status: "draft" },
    {
      value: data?.statusCounts?.archived,
      label: t("Archived", "مؤرشفة"),
      status: "archived"
    }
  ];

  useEffect(() => {
    setPage(1);
  }, [search, status, sort, pageSize]);

  const resetFilters = () => {
    setSearchInput("");
    setStatus("");
    setSort("newest");
    setPage(1);
  };

  const openCategory = (nextCategory: SessionCategory) => {
    setMenuFor(null);
    navigate(`/cms/categories/${nextCategory}?tab=sessions`);
  };

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    setAdding(true);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("add");
        next.set("tab", "sessions");
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  const handleEditSubmit = async (values: SessionFormValues) => {
    if (!editingSession) return;
    setFormError(null);
    try {
      await updateSession.mutateAsync({ id: editingSession.id, payload: values });
      setEditingSession(null);
    } catch (error) {
      setFormError(
        isAxiosError(error) && error.response?.status === 409
          ? t(
              "A session with this title already exists.",
              "توجد جلسة بهذا العنوان بالفعل."
            )
          : t(
              "Could not save this session. Please try again.",
              "تعذر حفظ هذه الجلسة. يرجى المحاولة مرة أخرى."
            )
      );
    }
  };

  const togglePublic = async (session: PhotoSession) => {
    setMenuFor(null);
    await updateSession.mutateAsync({
      id: session.id,
      payload: { isPublic: !session.isPublic }
    });
  };

  const changeStatus = async (session: PhotoSession, next: SessionStatus) => {
    setMenuFor(null);
    await updateSession.mutateAsync({ id: session.id, payload: { status: next } });
  };

  /** Publishes alongside the change — visibility is inert until it does. */
  const changeVisibility = async (
    session: PhotoSession,
    visibility: SessionVisibility
  ) => {
    setMenuFor(null);
    await updateSession.mutateAsync({
      id: session.id,
      payload: { visibility, ...(session.isPublic ? {} : { isPublic: true }) }
    });
  };

  const restoreSession = async (session: PhotoSession) => {
    setMenuFor(null);
    await updateSession.mutateAsync({ id: session.id, payload: { status: "draft" } });
  };

  const beginArchive = (session: PhotoSession) => {
    setArchiveTarget(session);
    setMenuFor(null);
  };

  const beginDelete = (session: PhotoSession) => {
    setDeleteTarget(session);
    setMenuFor(null);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    await archiveSession.mutateAsync(archiveTarget.id);
    setArchiveTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteSession.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5" onClick={() => setMenuFor(null)}>
      <SessionsHeader
        total={total}
        statusCounts={data?.statusCounts}
        totalMedia={totalMedia}
        sessionCount={sessions.length}
        onExport={() => exportSessionsCsv(sessions)}
      />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div
            className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
              adding
                ? "max-h-[1200px] translate-y-0 opacity-100"
                : "pointer-events-none max-h-0 -translate-y-3 opacity-0"
            }`}
          >
            {adding ? (
              <div className="rounded-lg border border-line bg-card p-5 shadow-[0_18px_60px_rgba(25,25,25,0.04)]">
                <AddSessionStepper
                  category={category}
                  onCancel={() => setAdding(false)}
                  onFinished={() => {
                    setAdding(false);
                    setPage(1);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <PlusIcon className="h-4 w-4 shrink-0" />
              {t("New session", "جلسة جديدة")}
            </button>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as SessionStatus | "")}
              aria-label={t("Status", "الحالة")}
              className="h-12 w-40 shrink-0 truncate rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <option value="">{t("All statuses", "كل الحالات")}</option>
              <option value="active">{t("Active", "نشطة")}</option>
              <option value="draft">{t("Draft", "مسودة")}</option>
              <option value="archived">{t("Archived", "مؤرشفة")}</option>
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SessionSort)}
              aria-label={t("Sort", "الترتيب")}
              className="h-12 w-44 shrink-0 truncate rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <option value="newest">{t("Newest first", "الأحدث أولاً")}</option>
              <option value="oldest">{t("Oldest first", "الأقدم أولاً")}</option>
              <option value="eventDate">{t("Event date", "تاريخ المناسبة")}</option>
              <option value="title">{t("Title (A-Z)", "العنوان (أ-ي)")}</option>
              <option value="mediaCount">{t("Most media", "الأكثر وسائط")}</option>
            </select>

            <label className="flex h-12 min-w-56 flex-1 items-center gap-3 overflow-hidden rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
              <SearchIcon className="h-4 w-4 shrink-0 text-secondary" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full min-w-0 bg-transparent outline-none placeholder:text-secondary/60"
                placeholder={t(
                  "Search by title or location...",
                  "ابحث بالعنوان أو الموقع..."
                )}
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label={t("Clear search", "مسح البحث")}
                  className="shrink-0 text-secondary transition-colors hover:text-primary"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <CloseIcon className="h-4 w-4" />
                {t("Clear filters", "مسح عوامل التصفية")}
              </button>
            ) : null}
          </div>

          <SessionsTableCard
            sessions={sessions}
            isError={isError}
            isPending={isPending}
            hasFilters={hasFilters}
            total={total}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            menuFor={menuFor}
            updatePending={updateSession.isPending}
            onRetry={() => void refetch()}
            onCreate={() => setAdding(true)}
            onEdit={(session) => {
              setEditingSession(session);
              setFormError(null);
              setMenuFor(null);
            }}
            onUpload={onOpenMedia}
            onDownloads={(session) => {
              setMenuFor(null);
              navigate(`/downloads?sessionId=${session.id}`);
            }}
            onTogglePublic={(session) => void togglePublic(session)}
            onSetStatus={(session, next) => void changeStatus(session, next)}
            onSetVisibility={(session, visibility) =>
              void changeVisibility(session, visibility)
            }
            onSetPassword={(session) => {
              setMenuFor(null);
              setPasswordTarget(session);
            }}
            onRestore={(session) => void restoreSession(session)}
            onArchive={beginArchive}
            onDelete={beginDelete}
            onMenuChange={setMenuFor}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        <SessionsSidebar
          summaryRows={summaryRows}
          activeStatus={status}
          categoryBreakdown={sessionTypeBreakdown}
          sessions={sessions}
          onStatusChange={setStatus}
          onCategoryChange={openCategory}
          onEdit={(session) => {
            setEditingSession(session);
            setFormError(null);
            setMenuFor(null);
          }}
          onReset={resetFilters}
        />
      </div>

      <SessionFormModal
        open={Boolean(editingSession)}
        onClose={() => {
          setEditingSession(null);
          setFormError(null);
        }}
        onSubmit={handleEditSubmit}
        session={editingSession}
        submitting={updateSession.isPending}
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
        loading={archiveSession.isPending}
        onConfirm={() => void handleArchiveConfirm()}
        onCancel={() => setArchiveTarget(null)}
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
        loading={deleteSession.isPending}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />

      <SessionPasswordModal
        session={passwordTarget}
        onClose={() => setPasswordTarget(null)}
      />
    </div>
  );
}
