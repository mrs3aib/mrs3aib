import { z } from "zod";

export const listMediaSchema = z.object({
  query: z.object({
    // Optional: omitting it lists media across every session, which is what the
    // studio library view needs.
    sessionId: z.string().min(1).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    type: z.enum(["image", "video"]).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    processingStatus: z.enum(["processing", "ready", "failed"]).optional(),
    sort: z.enum(["newest", "oldest", "largest", "smallest", "name"]).optional()
  })
});

export const requestUploadUrlSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    size: z.number().int().positive()
  })
});

/**
 * The URL itself is only length-checked here; whether it is really a YouTube
 * link is decided by the parser in the service, which is the one place that
 * knows every accepted form.
 */
export const addYouTubeLinkSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1),
    url: z.string().trim().min(1).max(500),
    title: z.string().trim().min(1).max(255).optional()
  })
});

export const mediaIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});
