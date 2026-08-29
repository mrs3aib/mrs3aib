import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { useLanguage } from "@/i18n/languageContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useArchiveSession,
  useCreateSession,
  useDeleteSession,
  useSessionsQuery,
  useUpdateSession
} from "@/hooks/useSessions";
import type { SessionFormValues } from "@/services/sessionSchemas";
import { SESSION_CATEGORIES, type SessionCategory } from "@/types/category";
import type {
  PhotoSession,
  SessionSort,
  SessionStatus,
  SessionVisibility
} from "@/types/session";
import { SessionPasswordModal } from "@/components/SessionPasswordModal";
import { SessionFilters } from "./sessions/SessionFilters";
import { SessionPageDialogs } from "./sessions/SessionPageDialogs";
import { SessionsHeader } from "./sessions/SessionsHeader";
import { SessionsSidebar } from "./sessions/SessionsSidebar";
import { SessionsTableCard } from "./sessions/SessionsTableCard";
import {
  PAGE_SIZE_OPTIONS,
  categoryBreakdown,
  exportSessionsCsv,
  pageWindow,
  type SessionSummaryRow
} from "./sessions/sessionPageUtils";

export default function SessionsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<SessionStatus | "">("");
  const [category, setCategory] = useState<SessionCategory | "">("");
  const [sort, setSort] = useState<SessionSort>("newest");

  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PhotoSession | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PhotoSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PhotoSession | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<PhotoSession | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const search = useDebouncedValue(searchInput.trim(), 300);
  const routeCategory = searchParams.get("category");
  const defaultCategory =
    routeCategory && SESSION_CATEGORIES.includes(routeCategory as SessionCategory)
      ? (routeCategory as SessionCategory)
      : undefined;

  const { data, isPending, isError, refetch } = useSessionsQuery({
    page,
    pageSize,
    sort,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {})
  });

  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const archiveSession = useArchiveSession();
  const deleteSession = useDeleteSession();

  const sessions = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pageNumbers = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);
  const hasFilters = Boolean(searchInput || status || category || sort !== "newest");

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

  const openCreateForm = () => {
    setEditingSession(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (session: PhotoSession) => {
    setEditingSession(session);
    setFormError(null);
    setFormOpen(true);
    setMenuFor(null);
  };

  // Deep links: `?new=1`/`?create=1` opens the create form, while category
  // seeds both the filter and the new-session category default.
  useEffect(() => {
    if (defaultCategory) setCategory(defaultCategory);
    if (searchParams.get("new") === "1" || searchParams.get("create") === "1") {
      openCreateForm();
    }
    const seeded = searchParams.get("search");
    if (seeded) setSearchInput(seeded);
  }, [defaultCategory, searchParams]);

  // Any filter change invalidates the current page offset.
  useEffect(() => {
    setPage(1);
  }, [search, status, category, sort, pageSize]);

  const resetFilters = () => {
    setSearchInput("");
    setStatus("");
    setCategory("");
    setSort("newest");
  };

  const handleSubmit = async (values: SessionFormValues) => {
    setFormError(null);
    try {
      if (editingSession) {
        await updateSession.mutateAsync({ id: editingSession.id, payload: values });
      } else {
        await createSession.mutateAsync(values);
      }
      setFormOpen(false);
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

  /**
   * Visibility only takes effect on a published session, so choosing one on an
   * unpublished row publishes it in the same save — otherwise the pick would
   * appear to do nothing.
   */
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

  const openUploads = (session: PhotoSession) => {
    setMenuFor(null);
    navigate(`/uploads?sessionId=${session.id}`);
  };

  const openDownloads = (session: PhotoSession) => {
    setMenuFor(null);
    navigate(`/downloads?sessionId=${session.id}`);
  };

  const beginArchive = (session: PhotoSession) => {
    setArchiveTarget(session);
    setMenuFor(null);
  };

  const beginDelete = (session: PhotoSession) => {
    setDeleteTarget(session);
    setMenuFor(null);
  };

  return (
    <div
      className="max-w-full space-y-5 overflow-x-hidden"
      onClick={() => setMenuFor(null)}
    >
      <SessionsHeader
        total={total}
        statusCounts={data?.statusCounts}
        totalMedia={totalMedia}
        sessionCount={sessions.length}
        onExport={() => exportSessionsCsv(sessions)}
      />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <SessionFilters
            searchInput={searchInput}
            status={status}
            category={category}
            sort={sort}
            hasFilters={hasFilters}
            onSearchChange={setSearchInput}
            onStatusChange={setStatus}
            onCategoryChange={setCategory}
            onSortChange={setSort}
            onCreate={openCreateForm}
            onReset={resetFilters}
            onClearSearch={() => setSearchInput("")}
          />

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
            onCreate={openCreateForm}
            onEdit={openEditForm}
            onUpload={openUploads}
            onDownloads={openDownloads}
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
          onCategoryChange={setCategory}
          onEdit={openEditForm}
          onReset={resetFilters}
        />
      </div>

      <SessionPageDialogs
        formOpen={formOpen}
        editingSession={editingSession}
        defaultCategory={editingSession ? undefined : category || defaultCategory}
        archiveTarget={archiveTarget}
        deleteTarget={deleteTarget}
        formError={formError}
        formSubmitting={createSession.isPending || updateSession.isPending}
        archiveLoading={archiveSession.isPending}
        deleteLoading={deleteSession.isPending}
        onCloseForm={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        onArchiveConfirm={() => void handleArchiveConfirm()}
        onArchiveCancel={() => setArchiveTarget(null)}
        onDeleteConfirm={() => void handleDeleteConfirm()}
        onDeleteCancel={() => setDeleteTarget(null)}
      />

      <SessionPasswordModal
        session={passwordTarget}
        onClose={() => setPasswordTarget(null)}
      />
    </div>
  );
}
