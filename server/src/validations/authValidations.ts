import { z } from "zod";

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone number must be in international format, e.g. +971501234567");

/**
 * Length is the only rule enforced.
 *
 * Composition requirements (a digit, a symbol, mixed case) push people towards
 * a small set of predictable substitutions and towards writing the result
 * down, so a generous minimum length buys more real resistance than a short
 * password with mandatory punctuation. The maximum is bcrypt's: it silently
 * truncates input beyond 72 bytes, and a password that is quietly cut short is
 * worse than one that is rejected outright.
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export const clientRegisterSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Full name is required").max(120),
    phone: phoneSchema,
    password: passwordSchema
  })
});

export const clientLoginSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    // Not `passwordSchema`: an existing password that predates the current
    // rules must still be accepted at the door, and rejecting it here would
    // report a validation error instead of a failed login.
    password: z.string().min(1, "Password is required")
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema
  })
});

export const updateAdminProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema.optional()
  })
});
