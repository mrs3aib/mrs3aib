import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Button } from "@/components/Button";
import { FancyDatePicker } from "@/components/FancyDatePicker";
import { TextField } from "@/components/TextField";
import { TextareaField } from "@/components/TextareaField";
import { CheckIcon } from "@/components/icons";
import { MediaGrid } from "@/components/MediaGrid";
import { SessionUploader } from "./SessionUploader";
import { useCreateSession } from "@/hooks/useSessions";
import { useLanguage } from "@/i18n/languageContext";
import { sessionFormSchema, type SessionFormValues } from "@/services/sessionSchemas";
import { CATEGORY_LABELS, type SessionCategory } from "@/types/category";
import type { PhotoSession } from "@/types/session";

type Step = 1 | 2;

/** The numbered "1 Details - 2 Media" rail above the step body. */
function StepRail({ step }: { step: Step }) {
  const { t } = useLanguage();
  const steps = [
    { index: 1 as const, label: t("Session details", "تفاصيل الجلسة") },
    { index: 2 as const, label: t("Upload media", "رفع الوسائط") }
  ];

  return (
    <ol className="flex items-center gap-3">
      {steps.map((item, position) => {
        const done = step > item.index;
        const current = step === item.index;
        return (
          <li key={item.index} className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                done
                  ? "bg-success text-white"
                  : current
                    ? "bg-accent text-white"
                    : "border border-line bg-base text-secondary"
              }`}
            >
              {done ? <CheckIcon className="h-4 w-4" /> : item.index}
            </span>
            <span
              className={`truncate text-sm ${current ? "font-medium text-primary" : "text-secondary"}`}
            >
              {item.label}
            </span>
            {position < steps.length - 1 ? (
              <span className={`h-px w-8 shrink-0 sm:w-14 ${done ? "bg-success" : "bg-line"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function AddSessionStepper({
  category,
  onCancel,
  onFinished
}: {
  category: SessionCategory;
  onCancel: () => void;
  /** Called when the admin closes the flow after creating the session. */
  onFinished: (session: PhotoSession) => void;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(1);
  const [created, setCreated] = useState<PhotoSession | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createSession = useCreateSession();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    // The category is fixed by the page the admin is standing on, so it is
    // seeded here instead of being offered as a field.
    defaultValues: { category, status: "draft", isPublic: false }
  });

  const submitDetails = async (values: SessionFormValues) => {
    setSubmitError(null);
    try {
      const session = await createSession.mutateAsync({ ...values, category });
      setCreated(session);
      setStep(2);
    } catch (error) {
      setSubmitError(
        isAxiosError(error) && error.response?.status === 409
          ? t("A session with this title already exists.", "توجد جلسة بهذا العنوان بالفعل.")
          : t(
              "Could not create this session. Please try again.",
              "تعذر إنشاء هذه الجلسة. يرجى المحاولة مرة أخرى."
            )
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-base px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            {t("Add session", "إضافة جلسة")}
          </p>
          <p className="mt-1 truncate text-sm text-secondary">
            {t(
              `Filed under ${CATEGORY_LABELS[category].en}`,
              `ضمن ${CATEGORY_LABELS[category].ar}`
            )}
          </p>
        </div>
        <StepRail step={step} />
      </div>

      {step === 1 ? (
        <form
          onSubmit={(event) => void handleSubmit(submitDetails)(event)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={t("Title", "العنوان")}
              placeholder={t("Wedding of Ahmed & Sara", "زفاف أحمد وسارة")}
              error={errors.title?.message}
              {...register("title")}
            />
            <FancyDatePicker
              label={t("Event date", "تاريخ المناسبة")}
              error={errors.eventDate?.message}
              {...register("eventDate")}
            />
          </div>
          <TextField
            label={t("Location", "الموقع")}
            placeholder={t("Riyadh, Saudi Arabia", "الرياض، السعودية")}
            error={errors.location?.message}
            {...register("location")}
          />
          <TextareaField
            label={t("Description", "الوصف")}
            placeholder={t("Optional notes about this session", "ملاحظات اختيارية عن هذه الجلسة")}
            error={errors.description?.message}
            {...register("description")}
          />

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-[#171b24]"
              {...register("isPublic")}
            />
            {t(
              "Show this session on the public page once it is active",
              "أظهر هذه الجلسة في الصفحة العامة عندما تصبح نشطة"
            )}
          </label>

          {submitError ? (
            <p className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button type="submit" loading={createSession.isPending}>
              {t("Continue to media", "المتابعة إلى الوسائط")}
            </Button>
          </div>
        </form>
      ) : created ? (
        <div className="space-y-5">
          <p className="rounded-lg border border-success/20 bg-success/10 px-4 py-2.5 text-sm text-success">
            {t(
              `"${created.title}" was created. Add its media below.`,
              `تم إنشاء "${created.title}". أضف وسائطها بالأسفل.`
            )}
          </p>

          <SessionUploader sessionId={created.id} sessionTitle={created.title} />

          <div className="rounded-lg border border-line p-5">
            <MediaGrid sessionId={created.id} coverImage={created.coverImage} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-secondary">
              {t(
                "You can keep uploading, or finish and return to the list.",
                "يمكنك متابعة الرفع أو الإنهاء والعودة إلى القائمة."
              )}
            </p>
            <Button type="button" onClick={() => onFinished(created)}>
              {t("Done", "تم")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
