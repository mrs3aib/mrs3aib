import { z } from "zod";

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone number must be in international format, e.g. +966501234567");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  // bcrypt truncates silently past 72 bytes; rejecting is better than
  // accepting a password only the first 72 bytes of which will ever matter.
  .max(72, "Password must be at most 72 characters");

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    phone: phoneSchema,
    // Optional, so a client can be added before their shoot exists.
    sessionId: z.string().min(1).optional(),
    password: passwordSchema
  })
});

export const resetClientPasswordSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ password: passwordSchema })
});

export const updateClientSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    sessionId: z.string().min(1).optional()
  })
});

export const clientIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

export const listClientsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    sessionId: z.string().optional()
  })
});
