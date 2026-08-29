import { z } from "zod";

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters")
  // bcrypt ignores anything past 72 bytes, so a longer password would be
  // silently truncated rather than fully used.
  .max(72, "Password must be at most 72 characters");

export const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number in international format, e.g. +966501234567"),
  sessionId: z.string().min(1, "Select a session"),
  password: passwordRules
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const resetPasswordFormSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string().min(1, "Confirm the password")
  })
  .refine((values) => values.password === values.confirmPassword, {
    // Reported on the confirm field so the message appears under the input the
    // person needs to correct.
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
