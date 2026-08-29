import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { loginSchema, type LoginFormValues } from "@/services/authSchemas";
import { login } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useLanguage } from "@/i18n/languageContext";
import type { BootstrapOutcome } from "@/hooks/useSessionBootstrap";

export default function LoginPage({
  bootstrapOutcome
}: {
  /**
   * How the startup session check ended, when there was one. Only
   * `unreachable` is shown: it means the session may still be valid and the
   * server simply could not be reached, which signing in again will not fix.
   */
  bootstrapOutcome?: BootstrapOutcome | null;
}) {
  const setSession = useAuthStore((s) => s.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  /**
   * Turn a failed login into something the admin can act on.
   *
   * Everything that was not a 401 used to collapse into "Something went
   * wrong", which is the same message whether the password was mistyped, the
   * laptop is offline, the API is asleep, or too many attempts were made —
   * each of which needs a different response from the person reading it.
   */
  const describeLoginError = (error: unknown): string => {
    if (!isAxiosError(error)) {
      return t(
        "Something went wrong. Please try again.",
        "حدث خطأ ما. يرجى المحاولة مرة أخرى."
      );
    }

    const status = error.response?.status;

    // No response at all: the request never completed. Distinguishing these
    // matters because none of them are the admin's credentials.
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        return t(
          "The server took too long to respond. Please try again.",
          "استغرق الخادم وقتًا طويلاً للرد. يرجى المحاولة مرة أخرى."
        );
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return t(
          "You appear to be offline. Check your connection and try again.",
          "يبدو أنك غير متصل بالإنترنت. تحقق من اتصالك وحاول مرة أخرى."
        );
      }
      return t(
        "Cannot reach the server. It may be starting up — try again in a moment.",
        "تعذّر الوصول إلى الخادم. قد يكون قيد التشغيل — حاول مرة أخرى بعد قليل."
      );
    }

    if (status === 401) {
      return t(
        "Incorrect email or password.",
        "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      );
    }
    if (status === 429) {
      return t(
        "Too many sign-in attempts. Please wait a few minutes and try again.",
        "محاولات تسجيل دخول كثيرة. يرجى الانتظار بضع دقائق والمحاولة مرة أخرى."
      );
    }
    if (status !== undefined && status >= 500) {
      return t(
        "The server had a problem. Please try again in a moment.",
        "حدثت مشكلة في الخادم. يرجى المحاولة مرة أخرى بعد قليل."
      );
    }

    return t(
      "Something went wrong. Please try again.",
      "حدث خطأ ما. يرجى المحاولة مرة أخرى."
    );
  };

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      const { accessToken, admin } = await login(values);
      setSession(accessToken, admin);
    } catch (error) {
      setFormError(describeLoginError(error));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="tracking-nav text-xs font-medium uppercase text-accent">
            {t("Studio Admin", "لوحة إدارة الاستوديو")}
          </p>
          <LanguageSwitcher />
        </div>
        <h1 className="tracking-title font-display mt-3 text-2xl font-semibold text-primary">
          {t("Sign in", "تسجيل الدخول")}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          {t("Manage sessions, clients, and galleries.", "إدارة الجلسات والعملاء والمعارض.")}
        </p>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="mt-8 flex flex-col gap-5"
          noValidate
        >
          <TextField
            label={t("Email", "البريد الإلكتروني")}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label={t("Password", "كلمة المرور")}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {/* A failed *reachability* check is not a failed login, so it is
              shown as a standing notice rather than a form error — and it is
              hidden once a real submit produces its own message. */}
          {!formError && bootstrapOutcome === "unreachable" ? (
            <p
              role="status"
              className="rounded-md border border-line bg-base px-3 py-2 text-sm text-secondary"
            >
              {t(
                "Could not reach the server to restore your session. It may be starting up — if you were signed in, reloading shortly may be enough.",
                "تعذّر الوصول إلى الخادم لاستعادة جلستك. قد يكون قيد التشغيل — إذا كنت مسجّل الدخول، فقد يكفي إعادة تحميل الصفحة بعد قليل."
              )}
            </p>
          ) : null}

          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            {t("Sign in", "تسجيل الدخول")}
          </Button>
        </form>
      </div>
    </div>
  );
}


