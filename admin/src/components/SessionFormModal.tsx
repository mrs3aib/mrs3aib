import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "./Modal";
import { TextField } from "./TextField";
import { TextareaField } from "./TextareaField";
import { SelectField } from "./SelectField";
import { Button } from "./Button";
import { FancyDatePicker } from "./FancyDatePicker";
import { sessionFormSchema, type SessionFormValues } from "@/services/sessionSchemas";
import { useLanguage } from "@/i18n/languageContext";
import {
  CATEGORY_LABELS,
  SESSION_CATEGORIES,
  type SessionCategory
} from "@/types/category";
import type { PhotoSession } from "@/types/session";

type SessionFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: SessionFormValues) => Promise<void>;
  session?: PhotoSession | null;
  defaultCategory?: SessionCategory;
  submitting?: boolean;
  submitError?: string | null;
};

export function SessionFormModal({
  open,
  onClose,
  onSubmit,
  session,
  defaultCategory,
  submitting = false,
  submitError
}: SessionFormModalProps) {
  const isEditing = Boolean(session);
  // Archived sessions are restored from the row menu, not here — the status
  // field would otherwise offer only draft/active and quietly un-archive them.
  const isArchived = session?.status === "archived";
  const { t, language } = useLanguage();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema)
  });

  useEffect(() => {
    if (!open) return;
    reset({
      title: session?.title ?? "",
      // No default category: force a deliberate choice on new sessions rather
      // than silently filing everything under the first option.
      category: session?.category ?? defaultCategory,
      eventDate: session?.eventDate.slice(0, 10) ?? "",
      location: session?.location ?? "",
      description: session?.description ?? "",
      // Left undefined for an archived session, whose field is not rendered —
      // sending a value would silently un-archive it on save. Restoring is the
      // row menu's job.
      ...(isArchived
        ? {}
        : { status: session?.status === "active" ? "active" : "draft" }),
      isPublic: session?.isPublic ?? false,
      visibility: session?.visibility ?? "public"
    });
  }, [open, session, defaultCategory, isArchived, reset]);

  const isPublic = watch("isPublic");
  const visibility = watch("visibility");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEditing ? t("Edit session", "تعديل الجلسة") : t("Create session", "إنشاء جلسة")
      }
      closeOnBackdrop={false}
      panelClassName="max-w-3xl"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-5"
        noValidate
      >
        <TextField
          label={t("Title", "العنوان")}
          placeholder={t("Wedding of Ahmed & Sara", "زفاف أحمد وسارة")}
          error={errors.title?.message}
          {...register("title")}
        />
        <SelectField
          label={t("Category", "التصنيف")}
          error={errors.category?.message}
          defaultValue=""
          {...register("category")}
        >
          <option value="" disabled>
            {t("Select a category", "اختر تصنيفاً")}
          </option>
          {SESSION_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category][language]}
            </option>
          ))}
        </SelectField>
        <FancyDatePicker
          label={t("Event date", "تاريخ المناسبة")}
          error={errors.eventDate?.message}
          {...register("eventDate")}
        />
        <TextField
          label={t("Location", "الموقع")}
          placeholder={t("Riyadh, Saudi Arabia", "الرياض، السعودية")}
          error={errors.location?.message}
          {...register("location")}
        />
        <TextareaField
          label={t("Description", "الوصف")}
          placeholder={t(
            "Optional notes about this session",
            "ملاحظات اختيارية عن هذه الجلسة"
          )}
          error={errors.description?.message}
          {...register("description")}
        />

        {/* Status and the public switch together decide what visitors see: a
            session appears only when it is Active *and* public. Keeping the two
            adjacent makes that pairing obvious. */}
        {isArchived ? (
          <p className="rounded-md border border-line bg-base px-3.5 py-2.5 text-xs text-secondary">
            {t(
              "This session is archived and stays hidden from the public site. Restore it from the sessions list to change its status.",
              "هذه الجلسة مؤرشفة وتبقى مخفية عن الموقع العام. استعدها من قائمة الجلسات لتغيير حالتها."
            )}
          </p>
        ) : (
          <div>
            <SelectField
              label={t("Status", "الحالة")}
              error={errors.status?.message}
              {...register("status")}
            >
              <option value="draft">{t("Draft", "مسودة")}</option>
              <option value="active">{t("Active", "نشطة")}</option>
            </SelectField>
            <p className="mt-1.5 text-xs text-secondary">
              {t(
                "Only Active sessions appear on the public site. Draft keeps it hidden while you work.",
                "الجلسات النشطة فقط تظهر في الموقع العام. المسودة تبقيها مخفية أثناء العمل."
              )}
            </p>
          </div>
        )}

        <label className="flex items-start gap-3 text-sm text-primary">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-line accent-accent"
            {...register("isPublic")}
          />
          <span>
            {t("Show in public gallery", "إظهار في المعرض العام")}
            <span className="mt-1 block text-xs text-secondary">
              {t(
                "Visitors can browse and download this folder without signing in.",
                "يمكن للزوار تصفح هذا المجلد وتحميله دون تسجيل الدخول."
              )}
            </span>
          </span>
        </label>

        {/*
          Visibility only means something for a published session — an
          unpublished one is hidden regardless, so offering the choice there
          would imply a distinction that does not exist.
        */}
        {isPublic ? (
          <SelectField
            label={t("Visibility", "الظهور")}
            error={errors.visibility?.message}
            {...register("visibility")}
          >
            <option value="public">
              {t("Public — listed in the gallery", "عام — يظهر في المعرض")}
            </option>
            <option value="private">
              {t(
                "Private — link only, not listed",
                "خاص — بالرابط فقط، لا يظهر في القائمة"
              )}
            </option>
            <option value="protected">
              {t(
                "Protected — listed, opens with the gallery password",
                "محمي — يظهر في القائمة ويُفتح بكلمة مرور المعرض"
              )}
            </option>
          </SelectField>
        ) : null}

        {isPublic && visibility === "protected" ? (
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-secondary">
            {t(
              "Set the password in this session's gallery settings. Until one is set, the album opens without asking.",
              "عيّن كلمة المرور من إعدادات معرض هذه الجلسة. وإلى أن تُعيَّن، سيُفتح الألبوم دون سؤال."
            )}
          </p>
        ) : null}

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
            {isEditing
              ? t("Save changes", "حفظ التغييرات")
              : t("Create session", "إنشاء الجلسة")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
