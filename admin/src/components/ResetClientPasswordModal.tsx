import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "./Modal";
import { TextField } from "./TextField";
import { Button } from "./Button";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues
} from "@/services/clientSchemas";
import { useLanguage } from "@/i18n/languageContext";
import type { Client } from "@/types/client";

type ResetClientPasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ResetPasswordFormValues) => Promise<void>;
  client: Client | null;
  submitting?: boolean;
  submitError?: string | null;
};

/**
 * Sets a client's password on their behalf.
 *
 * Client sign-in has no self-service reset — there is no OTP or email channel
 * to send a link over — so a client who has forgotten their password asks the
 * studio, and the admin sets a new one here and passes it on.
 */
export function ResetClientPasswordModal({
  open,
  onClose,
  onSubmit,
  client,
  submitting = false,
  submitError
}: ResetClientPasswordModalProps) {
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema)
  });

  useEffect(() => {
    if (!open) return;
    // Cleared on every open so a password typed for one client can never be
    // left sitting in the form when it is reopened for another.
    reset({ password: "", confirmPassword: "" });
  }, [open, client, reset]);

  const isFirstPassword = client ? !client.hasPassword : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isFirstPassword
          ? t("Set password", "تعيين كلمة المرور")
          : t("Reset password", "إعادة تعيين كلمة المرور")
      }
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-5"
        noValidate
      >
        <p className="text-sm text-secondary">
          {client
            ? t(
                `Set a new sign-in password for ${client.name} (${client.phone}). Share it with them directly — it is not sent anywhere.`,
                `عيّن كلمة مرور جديدة لتسجيل دخول ${client.name} (${client.phone}). شاركها معه مباشرة — لن تُرسل إلى أي جهة.`
              )
            : null}
        </p>

        <TextField
          type="password"
          autoComplete="new-password"
          label={t("New password", "كلمة المرور الجديدة")}
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          type="password"
          autoComplete="new-password"
          label={t("Confirm password", "تأكيد كلمة المرور")}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {isFirstPassword ? null : (
          <p className="text-xs text-secondary">
            {t(
              "The client will be signed out on all their devices.",
              "سيتم تسجيل خروج العميل من جميع أجهزته."
            )}
          </p>
        )}

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
            {isFirstPassword
              ? t("Set password", "تعيين كلمة المرور")
              : t("Reset password", "إعادة التعيين")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
