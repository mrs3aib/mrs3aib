import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LogoLoader } from "@/components/LogoLoader";
import {
  ChevronDownIcon,
  EyeIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UsersIcon
} from "@/components/icons";
import { useLanguage } from "@/i18n/languageContext";
import { CATEGORY_LABELS } from "@/types/category";
import type {
  PhotoSession,
  SessionStatus,
  SessionVisibility
} from "@/types/session";
import { formatDate, formatNumber } from "@/utils/format";
import {
  PAGE_SIZE_OPTIONS,
  STATUS_STYLES,
  VISIBILITY_STYLES
} from "./sessionPageUtils";
import { RowSelectMenu } from "./RowSelectMenu";
import { SessionCard } from "./SessionCard";
import { SessionCover } from "./SessionCover";

type MenuSetter = (
  sessionId: string | null | ((current: string | null) => string | null)
) => void;

type SessionActionHandlers = {
  onEdit: (session: PhotoSession) => void;
  onUpload: (session: PhotoSession) => void;
  onDownloads: (session: PhotoSession) => void;
  onTogglePublic: (session: PhotoSession) => void;
  onSetStatus: (session: PhotoSession, status: SessionStatus) => void;
  onSetVisibility: (session: PhotoSession, visibility: SessionVisibility) => void;
  onSetPassword: (session: PhotoSession) => void;
  onRestore: (session: PhotoSession) => void;
  onArchive: (session: PhotoSession) => void;
  onDelete: (session: PhotoSession) => void;
  onMenuChange: MenuSetter;
};

export function SessionsTableCard({
  sessions,
  isError,
  isPending,
  hasFilters,
  total,
  page,
  pageSize,
  totalPages,
  pageNumbers,
  menuFor,
  updatePending,
  onRetry,
  onCreate,
  onPageChange,
  onPageSizeChange,
  ...actions
}: {
  sessions: PhotoSession[];
  isError: boolean;
  isPending: boolean;
  hasFilters: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pageNumbers: number[];
  menuFor: string | null;
  updatePending: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
} & SessionActionHandlers) {
  const { t } = useLanguage();

  const statusLabel = (value: SessionStatus) =>
    value === "active"
      ? t("Active", "نشطة")
      : value === "draft"
        ? t("Draft", "مسودة")
        : t("Archived", "مؤرشفة");

  return (
    <SessionCard className="overflow-hidden">
      {isError ? (
        <div className="p-5">
          <p className="text-sm text-danger">
            {t("Could not load sessions.", "تعذر تحميل الجلسات.")}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
          >
            {t("Try again", "حاول مرة أخرى")}
          </button>
        </div>
      ) : isPending ? (
        <div className="flex min-h-80 items-center justify-center">
          <LogoLoader />
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm text-secondary">
            {hasFilters
              ? t(
                  "No sessions match these filters.",
                  "لا توجد جلسات تطابق عوامل التصفية."
                )
              : t(
                  "No sessions yet. Create your first one.",
                  "لا توجد جلسات بعد. أنشئ أول جلسة."
                )}
          </p>
          {hasFilters ? null : (
            <button
              type="button"
              onClick={onCreate}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              <PlusIcon className="h-4 w-4" />
              {t("New session", "جلسة جديدة")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-line bg-card text-secondary">
                  <Th>{t("Session", "الجلسة")}</Th>
                  <Th>{t("Session type", "نوع الجلسة")}</Th>
                  <Th>{t("Event date", "تاريخ المناسبة")}</Th>
                  <Th>{t("Status", "الحالة")}</Th>
                  <Th>{t("Visibility", "الظهور")}</Th>
                  <Th>{t("Clients", "العملاء")}</Th>
                  <Th>{t("Media", "الوسائط")}</Th>
                  <Th>{t("Actions", "الإجراءات")}</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    menuOpen={menuFor === session.id}
                    statusLabel={statusLabel}
                    updatePending={updatePending}
                    {...actions}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <PaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </SessionCard>
  );
}

function SessionRow({
  session,
  menuOpen,
  statusLabel,
  updatePending,
  ...actions
}: {
  session: PhotoSession;
  menuOpen: boolean;
  statusLabel: (status: SessionStatus) => string;
  updatePending: boolean;
} & SessionActionHandlers) {
  const { t, language } = useLanguage();
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);

  // Mirrors the `SessionVisibility` values one-for-one, so the badge reads with
  // the same three words the visibility selector offers.
  const visibilityLabel = (value: SessionVisibility) =>
    value === "private"
      ? t("Private", "خاص")
      : value === "protected"
        ? t("Protected", "محمي")
        : t("Public", "عام");

  return (
    <tr className="border-b border-line last:border-0 hover:bg-base/65">
      <td className="px-3 py-4 lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <SessionCover
            session={session}
            className="h-10 w-10 shrink-0"
            roundedClassName="rounded-full"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLES[session.status].dot}`}
              />
              <p className="truncate font-medium text-primary" title={session.title}>
                {session.title}
              </p>
            </div>
            <p className="mt-1 truncate text-xs text-secondary" title={session.location}>
              {session.location}
            </p>
          </div>
        </div>
      </td>
      <td className="truncate px-3 py-4 text-primary lg:px-4">
        {CATEGORY_LABELS[session.category][language]}
      </td>
      <td className="px-3 py-4 text-primary lg:px-4">
        <span className="block truncate">{formatDate(session.eventDate, language)}</span>
        <span className="mt-1 block truncate text-xs text-secondary">
          {t("Added", "أضيفت")} {formatDate(session.createdAt, language)}
        </span>
      </td>
      <td className="px-3 py-4 lg:px-4">
        <RowSelectMenu<SessionStatus>
          value={session.status}
          disabled={updatePending}
          onChange={(next) => actions.onSetStatus(session, next)}
          options={[
            {
              value: "draft",
              label: t("Draft", "مسودة"),
              description: t("Work in progress, hidden.", "قيد العمل، مخفية.")
            },
            {
              value: "active",
              label: t("Active", "نشطة"),
              description: t("Finished and live.", "مكتملة ومنشورة.")
            },
            {
              value: "archived",
              label: t("Archived", "مؤرشفة"),
              description: t("Retired but kept.", "متقاعدة مع الاحتفاظ بها.")
            }
          ]}
          triggerClassName={`inline-flex max-w-full items-center gap-1.5 truncate rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${STATUS_STYLES[session.status].pill}`}
        >
          {statusLabel(session.status)}
          <ChevronDownIcon className="h-3 w-3 shrink-0" />
        </RowSelectMenu>
      </td>
      <td className="px-3 py-4 lg:px-4">
        <RowSelectMenu<SessionVisibility>
          value={session.visibility}
          disabled={updatePending}
          onChange={(next) => actions.onSetVisibility(session, next)}
          /*
            Visibility only takes effect once a session is published, so an
            unpublished row shows its chosen value struck through rather than
            claiming the album is reachable.
          */
          title={
            session.isPublic
              ? undefined
              : t(
                  "Publish the session for this to take effect.",
                  "انشر الجلسة ليصبح هذا ساري المفعول."
                )
          }
          options={[
            {
              value: "public",
              label: t("Public", "عام"),
              description: t(
                "Listed, anyone can see it.",
                "يظهر في القائمة، ويمكن لأي شخص مشاهدته."
              )
            },
            {
              value: "private",
              label: t("Private", "خاص"),
              description: t(
                "Not listed, shared by link only.",
                "لا يظهر في القائمة، ويُشارك بالرابط فقط."
              )
            },
            {
              value: "protected",
              label: t("Protected", "محمي"),
              description: t(
                "Listed, but a password is needed to see it.",
                "يظهر في القائمة، لكن تلزم كلمة مرور لمشاهدته."
              )
            }
          ]}
          /*
            Coloured by the visibility itself. An unpublished session keeps its
            colour but is struck through, since the setting is chosen but not
            yet in force.
          */
          triggerClassName={`inline-flex max-w-full items-center gap-1.5 truncate rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            VISIBILITY_STYLES[session.visibility]
          } ${session.isPublic ? "" : "line-through opacity-70"}`}
        >
          <EyeIcon className="h-3.5 w-3.5 shrink-0" />
          {visibilityLabel(session.visibility)}
          <ChevronDownIcon className="h-3 w-3 shrink-0" />
        </RowSelectMenu>
      </td>
      <td className="px-3 py-4 lg:px-4">
        <span className="inline-flex items-center gap-2 text-primary">
          <UsersIcon className="h-4 w-4" />
          {formatNumber(session.clientCount)}
        </span>
      </td>
      <td className="px-3 py-4 lg:px-4">
        <span className="inline-flex items-center gap-2 text-primary">
          <ImageIcon className="h-4 w-4" />
          {formatNumber(session.mediaCount)}
        </span>
      </td>
      <td className="px-3 py-4 lg:px-4">
        <div className="relative">
          <button
            ref={actionButtonRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              actions.onMenuChange((current) =>
                current === session.id ? null : session.id
              );
            }}
            aria-label={t("More actions", "إجراءات أخرى")}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-primary transition-colors hover:bg-base"
          >
            <MoreHorizontalIcon className="h-5 w-5" />
          </button>
          {menuOpen ? (
            <SessionActionMenu
              anchorRef={actionButtonRef}
              session={session}
              {...actions}
            />
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SessionActionMenu({
  anchorRef,
  session,
  ...actions
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  session: PhotoSession;
} & SessionActionHandlers) {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const menuWidth = 224;
  const estimatedMenuHeight = session.status === "archived" ? 288 : 336;
  const menuGap = 4;

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight ?? estimatedMenuHeight;
      const left = Math.max(
        8,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
      );
      const hasRoomBelow = rect.bottom + menuHeight + menuGap <= window.innerHeight;
      const top = hasRoomBelow
        ? rect.bottom + menuGap
        : Math.max(8, rect.top - menuHeight - menuGap);

      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, estimatedMenuHeight]);

  if (!position) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[1000] w-56 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-xl"
      style={{ left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
    >
      <MenuItem onClick={() => actions.onEdit(session)}>
        {t("Edit session", "تعديل الجلسة")}
      </MenuItem>
      <MenuItem onClick={() => actions.onUpload(session)}>
        {t("Upload media", "رفع وسائط")}
      </MenuItem>
      <MenuItem onClick={() => actions.onDownloads(session)}>
        {t("View downloads", "عرض التحميلات")}
      </MenuItem>
      {/* Status is set from the column's dropdown, so it is not repeated here. */}
      <MenuItem onClick={() => actions.onTogglePublic(session)}>
        {/*
          This toggles publishing, not `visibility`. Wording it as
          "public/private" would collide with the visibility values, which now
          own those words.
        */}
        {session.isPublic
          ? t("Unpublish", "إلغاء النشر")
          : t("Publish", "نشر")}
      </MenuItem>
      {/*
        Offered only for the visibility it affects. On any other session the
        password is stored but never checked, so the entry would suggest a
        protection that is not in force.
      */}
      {session.visibility === "protected" ? (
        <MenuItem onClick={() => actions.onSetPassword(session)}>
          {t("Set gallery password", "تعيين كلمة مرور المعرض")}
        </MenuItem>
      ) : null}
      {session.status === "archived" ? (
        <MenuItem onClick={() => actions.onRestore(session)}>
          {t("Restore to draft", "استعادة كمسودة")}
        </MenuItem>
      ) : (
        <MenuItem onClick={() => actions.onArchive(session)}>
          {t("Archive", "أرشفة")}
        </MenuItem>
      )}
      <MenuItem destructive onClick={() => actions.onDelete(session)}>
        {t("Delete", "حذف")}
      </MenuItem>
    </div>,
    document.body
  );
}

function PaginationFooter({
  page,
  pageSize,
  total,
  totalPages,
  pageNumbers,
  onPageChange,
  onPageSizeChange
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-5">
      <p className="text-sm text-secondary">
        {t(
          `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total} sessions`,
          `عرض ${(page - 1) * pageSize + 1} إلى ${Math.min(page * pageSize, total)} من ${total} جلسة`
        )}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-10 rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Previous", "السابق")}
        </button>
        {pageNumbers.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={page === item ? "page" : undefined}
            className={`h-10 w-10 rounded-lg text-sm transition-colors ${page === item ? "bg-accent text-white" : "text-primary hover:bg-base"}`}
          >
            {item}
          </button>
        ))}
        {totalPages > (pageNumbers.at(-1) ?? 0) ? (
          <>
            <span className="px-2 text-secondary">...</span>
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="h-10 w-10 rounded-lg text-sm text-primary transition-colors hover:bg-base"
            >
              {totalPages}
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-10 rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("Next", "التالي")}
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-secondary">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-primary outline-none transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        {t("per page", "لكل صفحة")}
      </label>
    </div>
  );
}

function MenuItem({
  onClick,
  destructive = false,
  children
}: {
  onClick: () => void;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2 text-start text-sm transition-colors hover:bg-base ${
        destructive ? "text-danger" : "text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="truncate px-3 py-4 text-start text-xs font-medium text-secondary lg:px-4">
      {children}
    </th>
  );
}
