import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { ClientFormModal } from "@/components/ClientFormModal";
import { CopyButton } from "@/components/CopyButton";
import { ResetClientPasswordModal } from "@/components/ResetClientPasswordModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LogoLoader } from "@/components/LogoLoader";
import {
  CalendarIcon,
  CheckCircleIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon
} from "@/components/icons";
import { NotificationBell } from "@/components/NotificationBell";
import {
  useClientsQuery,
  useCreateClient,
  useDeleteClient,
  useResetClientPassword,
  useUpdateClient
} from "@/hooks/useClients";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLanguage } from "@/i18n/languageContext";
import type {
  ClientFormValues,
  ResetPasswordFormValues
} from "@/services/clientSchemas";
import type { Client } from "@/types/client";

const PAGE_SIZE = 7;

type Icon = ComponentType<{ className?: string }>;

type Bilingual = { en: string; ar: string };

/**
 * One table row, holding only what the API actually returns for a client.
 *
 * Email, gallery counts, download counts and a status badge used to be shown
 * here, invented per row from the list index. The backend stores none of them,
 * so every value was fiction — the columns are gone rather than guessed.
 */
type ClientRow = {
  id: string;
  name: string;
  phone: string;
  session: string;
  /** Public gallery URL, or null when the client has no session yet. */
  galleryLink: string | null;
  joined: Bilingual;
  client: Client;
};

/**
 * Public URL of the gallery a client is attached to.
 *
 * Built from the site's origin, not the dashboard's: `window.location.origin`
 * is the admin app, so the copied link pointed at the admin host and 404'd for
 * whoever it was sent to.
 *
 * Arabic is the website's configured default locale, so client links always
 * open in Arabic regardless of which language the admin dashboard uses.
 *
 * Null when the client has no session yet — a self-registered account the admin
 * has not linked — or when the site URL is unconfigured, in which case no link
 * is offered rather than a broken one.
 */
function galleryLinkFor(client: Client): string | null {
  const base = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (!base || !client.sessionId || !client.sessionCategory) return null;
  return `${base.replace(/\/$/, "")}/ar/category/${client.sessionCategory}/${client.sessionId}`;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-secondary">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-primary">{value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eee9e2] text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export default function ClientsPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const defaultSessionId = searchParams.get("sessionId") ?? "";
  const debouncedSearch = useDebouncedValue(search);
  const { t } = useLanguage();

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Client | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useClientsQuery({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined
  });

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const resetClientPassword = useResetClientPassword();

  const visibleRows = useMemo<ClientRow[]>(() => {
    return (data?.items ?? []).map((client) => {
      const createdAt = new Date(client.createdAt);
      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        // Null for a client who registered themselves before an admin gave
        // them a shoot; shown as a dash rather than an empty cell.
        session: client.sessionTitle ?? "—",
        galleryLink: galleryLinkFor(client),
        client,
        joined: {
          en: createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
          ar: createdAt.toLocaleDateString("ar")
        }
      };
    });
  }, [data?.items]);

  const total = data?.total ?? 0;

  const openCreateForm = () => {
    setEditingClient(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setFormError(null);
    setFormOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openCreateForm();
    }
  }, [searchParams]);

  const handleSubmit = async (values: ClientFormValues) => {
    setFormError(null);
    try {
      if (editingClient) {
        // `password` is deliberately not sent: changing an existing client's
        // password goes through the reset action, so a routine edit of their
        // name or session can never overwrite it.
        await updateClient.mutateAsync({
          id: editingClient.id,
          payload: {
            name: values.name,
            phone: values.phone,
            sessionId: values.sessionId
          }
        });
      } else {
        await createClient.mutateAsync({
          name: values.name,
          phone: values.phone,
          sessionId: values.sessionId,
          // Blank means "set a password later" — sent as absent, not "".
          password: values.password
        });
      }
      setFormOpen(false);
    } catch (error) {
      setFormError(
        isAxiosError(error) && error.response?.status === 409
          ? t("This phone number is already assigned to a client.", "رقم الهاتف هذا مخصص لعميل بالفعل.")
          : t("Could not save this client. Please try again.", "تعذر حفظ هذا العميل. يرجى المحاولة مرة أخرى.")
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteClient.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    if (!passwordTarget) return;
    setPasswordError(null);
    try {
      await resetClientPassword.mutateAsync({
        id: passwordTarget.id,
        password: values.password
      });
      setPasswordTarget(null);
    } catch {
      setPasswordError(
        t(
          "Could not set the password. Please try again.",
          "تعذر تعيين كلمة المرور. يرجى المحاولة مرة أخرى."
        )
      );
    }
  };

  const exportClientsCsv = () => {
    const header = ["ID", "Name", "Phone", "Session", "Date added"];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...visibleRows.map((client) =>
        [
          client.id,
          client.name,
          client.phone,
          client.session,
          client.joined.en
        ]
          .map(escape)
          .join(",")
      )
    ];

    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-full space-y-5 overflow-x-hidden">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-line p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <UsersIcon className="h-7 w-7 text-accent" />
              <h1 className="text-3xl font-semibold text-primary">{t("Clients", "العملاء")}</h1>
            </div>
            <p className="mt-2 text-sm text-secondary">
              {t("Manage clients and their access to sessions and galleries", "إدارة العملاء والوصول إلى الجلسات والمعارض")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <NotificationBell size="lg" />
            <button
              type="button"
              onClick={exportClientsCsv}
              disabled={visibleRows.length === 0}
              className="flex h-11 items-center gap-3 rounded-lg bg-[#171b24] px-5 text-sm font-medium text-white shadow-lg shadow-black/10 transition-colors hover:bg-[#222834] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon className="h-5 w-5" />
              {t("Export report", "تصدير التقرير")}
            </button>
          </div>
        </div>

        {/* Only the counts the API really reports. The other four cards here
            (active, new, linked sessions, downloads) were fixed numbers with
            invented month-on-month deltas. */}
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label={t("Total clients", "إجمالي العملاء")} value={`${total}`} icon={UsersIcon} />
          <StatCard
            label={t("Linked sessions", "جلسات مرتبطة")}
            value={`${new Set(visibleRows.map((row) => row.session)).size}`}
            icon={CalendarIcon}
          />
          <StatCard
            label={t("On this page", "في هذه الصفحة")}
            value={`${visibleRows.length}`}
            icon={CheckCircleIcon}
          />
        </div>
      </Card>

      <div className="min-w-0 space-y-5">
        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateForm}
              className="flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <PlusIcon className="h-4 w-4 shrink-0" />
              {t("New client", "عميل جديد")}
            </button>
            <label className="flex h-12 min-w-56 flex-1 items-center gap-3 overflow-hidden rounded-lg border border-line bg-card px-4 text-sm text-secondary transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
              <SearchIcon className="h-4 w-4 shrink-0 text-secondary" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary/60"
                placeholder={t("Search clients, phone, or session...", "ابحث عن عميل، رقم هاتف، أو جلسة...")}
              />
            </label>
          </div>

          <Card className="overflow-hidden">
            {isError ? (
              <div className="p-5">
                <p className="text-sm text-danger">{t("Could not load clients.", "تعذر تحميل العملاء.")}</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 text-xs font-medium text-danger underline underline-offset-2"
                >
                  {t("Try again", "حاول مرة أخرى")}
                </button>
              </div>
            ) : isPending ? (
              <div className="flex min-h-80 items-center justify-center">
                <LogoLoader />
              </div>
            ) : (
              <>
                <div className="max-w-full overflow-hidden">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[32%]" />
                      <col className="w-[20%]" />
                      <col className="w-[22%]" />
                      <col className="w-[18%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-line bg-card text-secondary">
                        <Th>{t("Client", "العميل")}</Th>
                        <Th>{t("Phone", "رقم الهاتف")}</Th>
                        <Th>{t("Session", "الجلسة")}</Th>
                        <Th>{t("Date added", "تاريخ الإضافة")}</Th>
                        <Th>{t("Actions", "الإجراءات")}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((client) => (
                        <tr key={client.id} className="border-b border-line last:border-0 hover:bg-base/65">
                          <td className="px-3 py-4 lg:px-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-xs font-semibold text-accent"
                              >
                                {client.name
                                  .trim()
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()}
                              </span>
                              <p className="truncate font-medium text-primary">{client.name}</p>
                            </div>
                          </td>
                          <td className="truncate px-3 py-4 text-primary lg:px-4" dir="ltr">{client.phone}</td>
                          <td className="px-3 py-4 text-primary lg:px-4">
                            <div className="flex items-center gap-2">
                              <span className="min-w-0 truncate">{client.session}</span>
                              {client.galleryLink ? (
                                <CopyButton
                                  value={client.galleryLink}
                                  label={t("Copy link", "نسخ الرابط")}
                                  className="px-2 py-1 text-[10px] font-medium"
                                />
                              ) : null}
                              {/*
                                `isPublic` governs whether the session appears
                                in the public category listings — not whether
                                the client can reach it. A private session is
                                still fully available to its assigned client,
                                who signs in and opens their own gallery, so
                                this marks reach rather than warning about it.
                              */}
                              {client.galleryLink && !client.client.sessionPubliclyListed ? (
                                <span
                                  title={t(
                                    "Private: not listed in the public galleries. The assigned client can still open it after signing in.",
                                    "خاصة: لا تظهر في المعارض العامة. لا يزال بإمكان العميل المخصّص فتحها بعد تسجيل الدخول."
                                  )}
                                  className="shrink-0 rounded border border-line px-2 py-1 text-[10px] font-medium text-secondary"
                                >
                                  {t("Private", "خاصة")}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="truncate px-3 py-4 text-primary lg:px-4">{t(client.joined.en, client.joined.ar)}</td>
                          <td className="px-3 py-4 lg:px-4">
                            <ClientActionsMenu
                              client={client.client}
                              onEdit={openEditForm}
                              onResetPassword={(target) => {
                                setPasswordError(null);
                                setPasswordTarget(target);
                              }}
                              onDelete={setDeleteTarget}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-5">
                  <p className="text-sm text-secondary">
                    {(() => {
                      const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
                      const last = Math.min(page * PAGE_SIZE, total);
                      return t(
                        `Showing ${first} to ${last} of ${total} clients`,
                        `عرض ${first} إلى ${last} من ${total} عميل`
                      );
                    })()}
                  </p>
                  {/* Page numbers derived from the real total — this used to be a
                      fixed 1-5 run with a hardcoded last page of 36. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1}
                      className="h-10 rounded-lg border border-line px-4 text-sm text-secondary disabled:opacity-50"
                    >
                      {t("Previous", "السابق")}
                    </button>
                    <span className="px-2 text-sm text-secondary">
                      {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={page >= Math.ceil(total / PAGE_SIZE)}
                      className="h-10 rounded-lg border border-line px-4 text-sm text-secondary disabled:opacity-50"
                    >
                      {t("Next", "التالي")}
                    </button>
                  </div>
                  <span className="flex h-10 items-center rounded-lg border border-line px-4 text-sm text-secondary">
                    {t(`${PAGE_SIZE} per page`, `كل صفحة ${PAGE_SIZE}`)}
                  </span>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <ClientFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
          setFormError(null);
        }}
        onSubmit={handleSubmit}
        client={editingClient}
        defaultSessionId={defaultSessionId}
        submitting={createClient.isPending || updateClient.isPending}
        submitError={formError}
      />

      <ResetClientPasswordModal
        open={Boolean(passwordTarget)}
        onClose={() => {
          setPasswordTarget(null);
          setPasswordError(null);
        }}
        onSubmit={handleResetPassword}
        client={passwordTarget}
        submitting={resetClientPassword.isPending}
        submitError={passwordError}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("Delete client", "حذف العميل")}
        description={
          deleteTarget
            ? t(
                `Remove "${deleteTarget.name}"? They will lose access to their gallery immediately.`,
                `هل تريد إزالة "${deleteTarget.name}"؟ سيفقد الوصول إلى معرضه فوراً.`
              )
            : ""
        }
        confirmLabel={t("Delete", "حذف")}
        destructive
        loading={deleteClient.isPending}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="truncate px-3 py-4 text-start text-xs font-medium text-secondary lg:px-4">
      {children}
    </th>
  );
}

function ClientActionsMenu({
  client,
  onEdit,
  onResetPassword,
  onDelete
}: {
  client: Client;
  onEdit: (client: Client) => void;
  onResetPassword: (client: Client) => void;
  onDelete: (client: Client) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const width = 176;
      const viewportPadding = 12;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - width),
        window.innerWidth - width - viewportPadding
      );
      const top = Math.min(rect.bottom + 6, window.innerHeight - viewportPadding);

      setStyle({ position: "fixed", top, left, width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("Client actions", "إجراءات العميل")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-primary transition-colors hover:bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              style={style}
              role="menu"
              className="z-[80] overflow-hidden rounded-lg border border-line bg-card py-1 shadow-2xl shadow-black/15"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit(client);
                }}
                className="block w-full px-4 py-2 text-start text-sm text-primary transition-colors hover:bg-base"
              >
                {t("Edit client", "تعديل العميل")}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onResetPassword(client);
                }}
                className="block w-full px-4 py-2 text-start text-sm text-primary transition-colors hover:bg-base"
              >
                {client.hasPassword
                  ? t("Reset password", "إعادة تعيين كلمة المرور")
                  : t("Set password", "تعيين كلمة المرور")}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDelete(client);
                }}
                className="block w-full px-4 py-2 text-start text-sm text-danger transition-colors hover:bg-danger/10"
              >
                {t("Delete client", "حذف العميل")}
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
