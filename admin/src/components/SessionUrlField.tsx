import type { UseFormRegister } from "react-hook-form";
import { sessionFormSchema, type SessionFormValues } from "@/services/sessionSchemas";
import { useLanguage } from "@/i18n/languageContext";
import { TextField } from "./TextField";
import { CheckCircleIcon, CloseIcon } from "./icons";

export function SessionUrlField({
  register,
  title,
  category,
  slug,
  existingSlug,
  error
}: {
  register: UseFormRegister<SessionFormValues>;
  title?: string;
  category?: string;
  slug?: string;
  existingSlug?: string;
  error?: string;
}) {
  const { t, language } = useLanguage();
  const hasInput = Boolean(slug?.trim());
  const validation = sessionFormSchema.shape.slug.safeParse(slug);
  const validFormat = hasInput && validation.success;
  const invalidFormat = hasInput && !validation.success;
  const statusLabel = validFormat
    ? t("Valid URL name format", "صيغة اسم الرابط صحيحة")
    : t("Invalid URL name format", "صيغة اسم الرابط غير صحيحة");
  // Validate the current value on every keystroke, independent of submit errors.
  const liveError = invalidFormat
    ? (slug?.trim().length ?? 0) > 120
      ? t("URL name is too long", "اسم الرابط طويل جداً")
      : t(
          "Use letters, numbers, and single hyphens between words",
          "استخدم الحروف والأرقام وشرطة واحدة بين الكلمات"
        )
    : hasInput
      ? undefined
      : error;
  const suggested =
    (title ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "session";
  const name = slug?.trim().toLowerCase() || existingSlug || suggested;
  const path = category === "weddings" ? "/wedding" : `/category/${category || "…"}`;
  const origin = (import.meta.env.VITE_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const changed = existingSlug && name !== existingSlug;

  return (
    <div>
      <TextField
        label={t("Custom URL name", "اسم الرابط المخصص")}
        placeholder={existingSlug || suggested}
        error={liveError}
        adornmentSide={language === "en" ? "left" : "right"}
        inputAdornment={
          hasInput ? (
            <span
              role="status"
              className={`flex ${validFormat ? "text-green-500" : "text-red-500"}`}
              title={statusLabel}
            >
              {validFormat ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <CloseIcon className="h-4 w-4" />
              )}
              <span className="sr-only">{statusLabel}</span>
            </span>
          ) : undefined
        }
        hint={
          existingSlug
            ? t(
                "Leave blank to keep the current URL name.",
                "اتركه فارغاً للاحتفاظ باسم الرابط الحالي."
              )
            : t(
                "Optional. Leave blank to use the session title. Use letters, numbers, and hyphens.",
                "اختياري. اتركه فارغاً لاستخدام عنوان الجلسة. استخدم الحروف والأرقام والشرطات."
              )
        }
        dir="ltr"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={120}
        {...register("slug")}
      />
      <p className="mt-1.5 break-all text-xs text-secondary" dir="ltr">
        {origin}/ar{path}/{name}
      </p>
      {!existingSlug && !slug?.trim() ? (
        <p className="mt-1.5 text-xs text-secondary">
          {t(
            "A number is added automatically if this name is already used.",
            "يُضاف رقم تلقائياً إذا كان هذا الاسم مستخدماً بالفعل."
          )}
        </p>
      ) : null}
      {changed ? (
        <p className="mt-1.5 text-xs text-secondary">
          {t(
            "Changing this name replaces the current link. Previously shared links using the old name will stop working.",
            "تغيير هذا الاسم يستبدل الرابط الحالي. الروابط المشتركة بالاسم القديم ستتوقف عن العمل."
          )}
        </p>
      ) : null}
    </div>
  );
}
