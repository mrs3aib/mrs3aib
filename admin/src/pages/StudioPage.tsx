import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  GridIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  VideoIcon
} from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LogoLoader } from "@/components/LogoLoader";
import { Modal } from "@/components/Modal";
import { SessionPicker } from "@/components/SessionPicker";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDeleteMedia, useMediaQuery } from "@/hooks/useMedia";
import { useLanguage } from "@/i18n/languageContext";
import { formatBytes, formatDate, formatNumber } from "@/utils/format";
import type { Media, MediaProcessingStatus, MediaSort, MediaType } from "@/types/media";

const PAGE_SIZE_OPTIONS = [24, 48, 96];

/** Video durations arrive in seconds; the thumbnail pill wants mm:ss. */
function formatDuration(seconds: number | null): string | null {
  if (seconds === null || Number.isNaN(seconds)) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "image/jpeg" -> "JPEG"; falls back to the file extension. */
function formatFormat(mimeType: string | null, name: string): string {
  if (!mimeType) {
    const extension = name.split(".").pop();
    return extension ? extension.toUpperCase() : "—";
  }
  const subtype = mimeType.split("/")[1];
  if (subtype) return subtype.split(";")[0]!.toUpperCase();
  const extension = name.split(".").pop();
  return extension ? extension.toUpperCase() : "—";
}

function formatMediaSize(size: number | null): string {
  return size === null ? "—" : formatBytes(size);
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

/** Bulk-action bar button, disabled until at least one item is selected. */
function BulkButton({
  children,
  disabled,
  destructive = false,
  onClick
}: {
  children: ReactNode;
  disabled: boolean;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-45 ${
        destructive
          ? "border-danger/30 text-danger hover:bg-danger/5"
          : "border-line text-secondary hover:border-accent hover:bg-base/60 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: MediaProcessingStatus }) {
  const { t } = useLanguage();
  const styles: Record<MediaProcessingStatus, string> = {
    ready: "bg-success/10 text-success",
    processing: "bg-[#fdf1de] text-[#b87223]",
    failed: "bg-danger/10 text-danger"
  };
  const labels: Record<MediaProcessingStatus, string> = {
    ready: t("Ready", "جاهز"),
    processing: t("Processing", "قيد المعالجة"),
    failed: t("Failed", "فشل")
  };
  return (
    <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

/** Shared thumbnail: the signed preview when ready, a neutral placeholder otherwise. */
function Preview({ item, className = "" }: { item: Media; className?: string }) {
  if (item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt={item.originalName}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-base ${className}`}
    >
      {item.type === "video" ? (
        <VideoIcon className="h-6 w-6 text-secondary/50" />
      ) : (
        <ImageIcon className="h-6 w-6 text-secondary/50" />
      )}
    </div>
  );
}

function MediaCard({
  item,
  selected,
  onToggle,
  onPreview,
  onDelete
}: {
  item: Media;
  selected: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const duration = formatDuration(item.duration);

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-base">
        <Preview item={item} />

        {/* `appearance-none` strips the native box so nothing is painted until
            checked; the tick is a peer sibling revealed by :checked. */}
        <label className="group absolute start-2.5 top-2.5 h-6 w-6 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={item.originalName}
            className="peer h-full w-full cursor-pointer appearance-none rounded-md border border-white/70 bg-black/25 backdrop-blur-sm transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          />
          <CheckIcon className="pointer-events-none absolute inset-0 m-auto hidden h-4 w-4 text-white peer-checked:block" />
        </label>

        <button
          type="button"
          onClick={onPreview}
          aria-label={t("Preview", "معاينة")}
          className="absolute end-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-white/85 text-primary backdrop-blur-sm transition-colors hover:bg-white"
        >
          <EyeIcon className="h-4 w-4" />
        </button>

        {duration ? (
          <span className="absolute bottom-2.5 start-2.5 flex items-center gap-1.5 rounded-md bg-black/65 px-2 py-1 text-[11px] text-white">
            <VideoIcon className="h-3 w-3" />
            {duration}
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <p
          className="truncate text-center text-[13px] font-medium text-primary"
          title={item.originalName}
        >
          {item.originalName}
        </p>
        <p className="mt-1 text-center text-[11px] text-secondary">
          {formatFormat(item.mimeType, item.originalName)} · {formatMediaSize(item.size)}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className="truncate rounded-md bg-[#f3ede4] px-2 py-1 text-[11px] text-[#9f733d]"
            title={item.sessionTitle}
          >
            {item.sessionTitle}
          </span>

          <StatusPill status={item.processingStatus} />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              aria-label={t("More actions", "إجراءات أخرى")}
              aria-expanded={menuOpen}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-base hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div
                className="absolute end-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <MenuItem
                  onClick={() => {
                    onPreview();
                    setMenuOpen(false);
                  }}
                >
                  {t("Preview", "معاينة")}
                </MenuItem>
                {item.thumbnailUrl ? (
                  <MenuItem
                    onClick={() => {
                      window.open(item.thumbnailUrl as string, "_blank", "noreferrer");
                      setMenuOpen(false);
                    }}
                  >
                    {t("Open in new tab", "فتح في تبويب جديد")}
                  </MenuItem>
                ) : null}
                <MenuItem
                  onClick={() => {
                    void navigator.clipboard.writeText(item.id);
                    setMenuOpen(false);
                  }}
                >
                  {t("Copy ID", "نسخ المعرّف")}
                </MenuItem>
                <MenuItem
                  destructive
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                >
                  {t("Delete", "حذف")}
                </MenuItem>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
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

export default function StudioPage() {
  const { t, language } = useLanguage();

  const [tab, setTab] = useState<MediaType>("image");
  const [selected, setSelected] = useState<string[]>([]);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0] as number);
  const [searchInput, setSearchInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState<MediaProcessingStatus | "">("");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [previewItem, setPreviewItem] = useState<Media | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<Media[]>([]);

  const search = useDebouncedValue(searchInput.trim(), 300);

  const { data, isPending, isError, refetch } = useMediaQuery({
    page,
    pageSize,
    type: tab,
    sort,
    ...(search ? { search } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(status ? { processingStatus: status } : {})
  });

  const deleteMedia = useDeleteMedia();

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  // Any filter change invalidates the current offset and the selection, which
  // could otherwise hold ids that are no longer on screen.
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [tab, search, sessionId, status, sort, pageSize]);

  const visibleIds = items.map((item) => item.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const none = selected.length === 0;

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  const toggleAll = () => setSelected(allSelected ? [] : visibleIds);

  const selectedItems = useMemo(
    () => items.filter((item) => selected.includes(item.id)),
    [items, selected]
  );

  const hasFilters = Boolean(searchInput || sessionId || status || sort !== "newest");
  const uploadHref = sessionId
    ? `/uploads?sessionId=${encodeURIComponent(sessionId)}`
    : "/uploads";

  const resetFilters = () => {
    setSearchInput("");
    setSessionId("");
    setStatus("");
    setSort("newest");
  };

  /** Deletes run sequentially through the existing single-item endpoint. */
  const confirmDelete = async () => {
    for (const item of deleteTargets) {
      await deleteMedia.mutateAsync(item.id);
    }
    setSelected((current) =>
      current.filter((id) => !deleteTargets.some((item) => item.id === id))
    );
    setDeleteTargets([]);
  };

  /** Opens each selected item's signed URL; only ready items have one. */
  const exportSelected = () => {
    for (const item of selectedItems) {
      if (item.thumbnailUrl) window.open(item.thumbnailUrl, "_blank", "noreferrer");
    }
  };

  const pageNumbers = useMemo(() => {
    const windowSize = 3;
    const start = Math.max(Math.min(page - 1, totalPages - windowSize + 1), 1);
    return Array.from(
      { length: Math.min(windowSize, totalPages) },
      (_, index) => start + index
    );
  }, [page, totalPages]);

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ImageIcon className="h-7 w-7 text-accent" />
            <h1 className="text-2xl font-semibold text-primary">
              {t("Content", "المحتوى")}
            </h1>
          </div>
          <p className="mt-2 text-sm text-secondary">
            {t(
              "Manage the media library of photos and videos",
              "إدارة مكتبة الوسائط والصور والفيديوهات"
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={import.meta.env.VITE_PUBLIC_SITE_URL ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors hover:border-accent hover:bg-base/60 hover:text-primary"
          >
            <EyeIcon className="h-4 w-4 shrink-0" />
            {t("Preview site", "معاينة الموقع")}
          </a>
          <NotificationBell />
          <Link
            to={uploadHref}
            className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#171b24] px-5 text-sm font-medium text-white shadow-lg shadow-black/10 transition-colors hover:bg-[#222834] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            {t("Upload new content", "رفع محتوى جديد")}
          </Link>
        </div>
      </Card>

      {/* Image / video tabs */}
      <div className="flex gap-2 border-b border-line">
        {[
          {
            id: "image" as const,
            label: t("Photos", "الصور"),
            icon: ImageIcon,
            count: data?.imageCount
          },
          {
            id: "video" as const,
            label: t("Videos", "الفيديوهات"),
            icon: VideoIcon,
            count: data?.videoCount
          }
        ].map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`-mb-px flex h-11 items-center gap-2 border-b-2 px-5 text-sm transition-colors ${
              tab === entry.id
                ? "border-accent font-medium text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            <entry.icon className="h-4 w-4 shrink-0" />
            {entry.label}
            {entry.count === undefined ? null : (
              <span className="rounded-full bg-base px-2 py-0.5 text-[11px] text-secondary">
                {formatNumber(entry.count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-11 min-w-56 flex-1 items-center gap-3 rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
            <SearchIcon className="h-4 w-4 shrink-0 text-secondary" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-secondary/60"
              placeholder={t(
                "Search by file or session...",
                "ابحث باسم الملف أو الجلسة..."
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

          <SessionPicker
            value={sessionId}
            onChange={setSessionId}
            emptyLabel={t("All sessions", "كل الجلسات")}
            emptyHint={t("Filter by session", "تصفية حسب الجلسة")}
            clearLabel={t("Show all sessions", "عرض كل الجلسات")}
            className="w-full sm:w-72"
          />

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as MediaProcessingStatus | "")
            }
            aria-label={t("Status", "الحالة")}
            className="h-11 w-40 shrink-0 truncate rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <option value="">{t("All statuses", "كل الحالات")}</option>
            <option value="ready">{t("Ready", "جاهز")}</option>
            <option value="processing">{t("Processing", "قيد المعالجة")}</option>
            <option value="failed">{t("Failed", "فشل")}</option>
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as MediaSort)}
            aria-label={t("Sort", "الترتيب")}
            className="h-11 w-40 shrink-0 truncate rounded-lg border border-line bg-card px-3 text-sm text-secondary outline-none transition-colors hover:border-accent hover:bg-base/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <option value="newest">{t("Newest first", "الأحدث أولاً")}</option>
            <option value="oldest">{t("Oldest first", "الأقدم أولاً")}</option>
            <option value="largest">{t("Largest size", "الأكبر حجماً")}</option>
            <option value="smallest">{t("Smallest size", "الأصغر حجماً")}</option>
            <option value="name">{t("Name (A–Z)", "الاسم (أ–ي)")}</option>
          </select>

          {hasFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-4 text-sm text-secondary transition-colors hover:border-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <CloseIcon className="h-4 w-4" />
              {t("Clear filters", "مسح عوامل التصفية")}
            </button>
          ) : null}
        </div>
      </Card>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm text-secondary">
          <span className="relative h-4 w-4">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={items.length === 0}
              className="peer h-full w-full cursor-pointer appearance-none rounded border border-line bg-transparent transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <CheckIcon className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 text-white peer-checked:block" />
          </span>
          {t(`${selected.length} selected`, `${selected.length} محدد`)}
        </label>

        <BulkButton disabled={none} onClick={exportSelected}>
          <DownloadIcon className="h-4 w-4 shrink-0" />
          {t("Export", "تصدير")}
        </BulkButton>
        <BulkButton disabled={none} onClick={() => setSelected([])}>
          <CloseIcon className="h-4 w-4 shrink-0" />
          {t("Clear selection", "إلغاء التحديد")}
        </BulkButton>
        <BulkButton
          disabled={none}
          destructive
          onClick={() => setDeleteTargets(selectedItems)}
        >
          <TrashIcon className="h-4 w-4 shrink-0" />
          {t("Delete", "حذف")}
        </BulkButton>

        <div className="ms-auto flex items-center gap-3">
          <span className="text-sm text-secondary">
            {t(
              `${formatNumber(total)} items · ${formatBytes(data?.totalSize ?? 0)}`,
              `${formatNumber(total)} عنصر · ${formatBytes(data?.totalSize ?? 0)}`
            )}
          </span>
          <div className="flex gap-1 rounded-lg border border-line bg-card p-1">
            <button
              type="button"
              onClick={() => setLayout("grid")}
              aria-label={t("Grid view", "عرض شبكي")}
              aria-pressed={layout === "grid"}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                layout === "grid"
                  ? "bg-accent text-white"
                  : "text-secondary hover:bg-base"
              }`}
            >
              <GridIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout("list")}
              aria-label={t("List view", "عرض قائمة")}
              aria-pressed={layout === "list"}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                layout === "list"
                  ? "bg-accent text-white"
                  : "text-secondary hover:bg-base"
              }`}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Library */}
      {isError ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-danger">
            {t("Could not load the media library.", "تعذر تحميل مكتبة الوسائط.")}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
          >
            {t("Try again", "حاول مرة أخرى")}
          </button>
        </Card>
      ) : isPending ? (
        <Card className="flex min-h-80 items-center justify-center">
          <LogoLoader />
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-secondary">
            {hasFilters
              ? t(
                  "No content matches these filters.",
                  "لا يوجد محتوى يطابق عوامل التصفية."
                )
              : t("No content in this tab yet.", "لا يوجد محتوى في هذا القسم بعد.")}
          </p>
        </Card>
      ) : layout === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              onToggle={() => toggle(item.id)}
              onPreview={() => setPreviewItem(item)}
              onDelete={() => setDeleteTargets([item])}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-line text-secondary">
                  <th className="w-12 px-4 py-3" />
                  <th className="px-4 py-3 text-start text-xs font-medium">
                    {t("File", "الملف")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium">
                    {t("Session", "الجلسة")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium">
                    {t("Size", "الحجم")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium">
                    {t("Status", "الحالة")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium">
                    {t("Added", "أضيف")}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium">
                    {t("Actions", "الإجراءات")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-line last:border-0 hover:bg-base/65"
                  >
                    <td className="px-4 py-3">
                      <span className="relative block h-4 w-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={item.originalName}
                          className="peer h-full w-full cursor-pointer appearance-none rounded border border-line bg-transparent transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        />
                        <CheckIcon className="pointer-events-none absolute inset-0 m-auto hidden h-3 w-3 text-white peer-checked:block" />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-base">
                          <Preview item={item} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary">
                            {item.originalName}
                          </p>
                          <p className="mt-0.5 text-xs text-secondary">
                            {formatFormat(item.mimeType, item.originalName)}
                            {formatDuration(item.duration)
                              ? ` · ${formatDuration(item.duration)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-primary">
                      {item.sessionTitle}
                    </td>
                    <td className="px-4 py-3 text-primary">
                      {formatMediaSize(item.size)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={item.processingStatus} />
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {formatDate(item.createdAt, language)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          aria-label={t("Preview", "معاينة")}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-secondary transition-colors hover:border-accent hover:text-primary"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargets([item])}
                          aria-label={t("Delete", "حذف")}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/30 text-danger transition-colors hover:bg-danger/5"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <label className="flex items-center gap-2 text-sm text-secondary">
          {t("Show", "عرض")}
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="h-9 rounded-lg border border-line bg-card px-2 text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          {t("per page", "لكل صفحة")}
        </label>

        <div className="flex items-center gap-1.5">
          <PageButton
            label="«"
            aria={t("First page", "الصفحة الأولى")}
            disabled={page <= 1}
            onClick={() => setPage(1)}
          />
          <PageButton
            label="‹"
            aria={t("Previous page", "الصفحة السابقة")}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          />
          {pageNumbers.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPage(item)}
              aria-current={page === item ? "page" : undefined}
              className={`h-9 w-9 rounded-lg text-sm transition-colors ${
                page === item ? "bg-accent text-white" : "text-primary hover:bg-base"
              }`}
            >
              {item}
            </button>
          ))}
          {totalPages > (pageNumbers.at(-1) ?? 0) ? (
            <>
              <span className="px-1 text-secondary">...</span>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                className="h-9 w-9 rounded-lg text-sm text-primary transition-colors hover:bg-base"
              >
                {totalPages}
              </button>
            </>
          ) : null}
          <PageButton
            label="›"
            aria={t("Next page", "الصفحة التالية")}
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          />
          <PageButton
            label="»"
            aria={t("Last page", "الصفحة الأخيرة")}
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
          />
        </div>
      </Card>

      <Modal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.originalName ?? ""}
      >
        {previewItem ? (
          <div className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-lg bg-base">
              <Preview item={previewItem} className="object-contain" />
            </div>
            <dl className="space-y-3 text-sm">
              <DetailRow
                label={t("Session", "الجلسة")}
                value={previewItem.sessionTitle}
              />
              <DetailRow
                label={t("Format", "الصيغة")}
                value={formatFormat(previewItem.mimeType, previewItem.originalName)}
              />
              <DetailRow
                label={t("Size", "الحجم")}
                value={formatMediaSize(previewItem.size)}
              />
              {previewItem.width && previewItem.height ? (
                <DetailRow
                  label={t("Dimensions", "الأبعاد")}
                  value={`${previewItem.width} × ${previewItem.height}`}
                />
              ) : null}
              {formatDuration(previewItem.duration) ? (
                <DetailRow
                  label={t("Duration", "المدة")}
                  value={formatDuration(previewItem.duration) as string}
                />
              ) : null}
              <DetailRow
                label={t("Added", "أضيف")}
                value={formatDate(previewItem.createdAt, language)}
              />
              <DetailRow
                label={t("Media ID", "معرّف الوسائط")}
                value={previewItem.id}
                ltr
              />
            </dl>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteTargets.length > 0}
        title={t("Delete content", "حذف المحتوى")}
        description={
          deleteTargets.length === 1
            ? t(
                `Delete "${deleteTargets[0]?.originalName}" permanently?`,
                `حذف "${deleteTargets[0]?.originalName}" نهائيًا؟`
              )
            : t(
                `Delete ${deleteTargets.length} items permanently?`,
                `حذف ${deleteTargets.length} عنصر نهائيًا؟`
              )
        }
        confirmLabel={t("Delete", "حذف")}
        destructive
        loading={deleteMedia.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTargets([])}
      />
    </div>
  );
}

function PageButton({
  label,
  aria,
  disabled,
  onClick
}: {
  label: string;
  aria: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-sm text-primary transition-colors hover:bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function DetailRow({
  label,
  value,
  ltr = false
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0">
      <dt className="shrink-0 text-secondary">{label}</dt>
      <dd
        className="min-w-0 break-words text-end font-medium text-primary"
        {...(ltr ? { dir: "ltr" } : {})}
      >
        {value}
      </dd>
    </div>
  );
}
