import { z } from "zod";

export const listNotificationsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
});
