import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "./Modal";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { useSessionsQuery } from "@/hooks/useSessions";
import { clientFormSchema, type ClientFormValues } from "@/services/clientSchemas";
import { useLanguage } from "@/i18n/languageContext";
import type { Client } from "@/types/client";

type ClientFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  client?: Client | null;
  defaultSessionId?: string;
  submitting?: boolean;
  submitError?: string | null;
};

export function ClientFormModal({
  open,
  onClose,
  onSubmit,
  client,
  defaultSessionId,
  submitting = false,
  submitError
}: ClientFormModalProps) {
  const isEditing = Boolean(client);
  const { t } = useLanguage();
  const { data: sessionsData, isPending: sessionsPending } = useSessionsQuery({
    page: 1,
    pageSize: 100
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema)
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      sessionId: client?.sessionId ?? defaultSessionId ?? "",
      password: ""
    });
  }, [open, client, defaultSessionId, reset]);

  const generatePassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const values = crypto.getRandomValues(new Uint32Array(16));
    const password = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
    setValue("password", password, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? t("Edit client", "تعديل العميل") : t("Add client", "إضافة عميل")}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-5"
        noValidate
      >
        <TextField
          label={t("Name", "الاسم")}
          placeholder={t("Sara Al-Faisal", "سارة الفيصل")}
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label={t("Phone number", "رقم الهاتف")}
          placeholder="+966501234567"
          hint={t(
            "The client signs in with this number.",
            "يسجّل العميل الدخول بهذا الرقم."
          )}
          error={errors.phone?.message}
          {...register("phone")}
        />

        {/*
          Only offered when adding. Changing an existing client's password is a
          separate, deliberate action from the client list — folding it into
          the edit form would let a routine change of name or session overwrite
          a password by accident.
        */}
        {isEditing ? null : (
          <>
          <TextField
            type="text"
            autoComplete="new-password"
            label={t("Password", "كلمة المرور")}
            hint={t(
              "Required for client sign-in. Share it with the client securely.",
              "مطلوبة لتسجيل دخول العميل. شاركها مع العميل بطريقة آمنة."
            )}
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={generatePassword}
            className="mt-2 rounded-lg border border-line px-3 py-2 text-xs font-medium text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            {t("Generate secure password", "إنشاء كلمة مرور آمنة")}
          </button>
          </>
        )}

        <div>
          <label
            htmlFor="client-session"
            className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
          >
            {t("Session", "الجلسة")}
          </label>
          <select
            id="client-session"
            disabled={sessionsPending}
            className={`w-full rounded-md border bg-base px-3.5 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-60 ${
              errors.sessionId ? "border-danger" : "border-line"
            }`}
            {...register("sessionId")}
          >
            <option value="">
              {sessionsPending
                ? t("Loading sessions…", "جارٍ تحميل الجلسات…")
                : t("Select a session", "اختر جلسة")}
            </option>
            {sessionsData?.items.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
          {errors.sessionId ? (
            <p className="mt-1.5 text-xs text-danger">{errors.sessionId.message}</p>
          ) : null}
        </div>

        {submitError ? (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        ) : null}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button type="submit" loading={submitting}>
            {isEditing ? t("Save changes", "حفظ التغييرات") : t("Add client", "إضافة العميل")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


