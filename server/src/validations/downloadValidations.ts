import { z } from "zod";

export const listDownloadsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    sessionId: z.string().optional(),
    clientId: z.string().optional(),
    search: z.string().trim().min(1).max(200).optional(),
    downloadType: z.enum(["single", "multiple", "zip"]).optional(),
    /** Inclusive date bounds on the download timestamp (YYYY-MM-DD or ISO). */
    from: z.string().datetime().or(z.string().date()).optional(),
    to: z.string().datetime().or(z.string().date()).optional(),
    sort: z
      .enum(["newest", "oldest", "mostFiles", "fewestFiles", "session", "client"])
      .optional(),
    /** Width of the activity chart window, in days. */
    activityDays: z.coerce.number().int().min(1).max(365).optional()
  })
});
