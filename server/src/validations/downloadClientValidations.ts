import { z } from "zod";

export const mediaIdParamSchema = z.object({
  params: z.object({ mediaId: z.string().min(1) })
});

export const sessionIdParamSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) })
});

export const downloadMultipleSchema = z.object({
  body: z.object({
    mediaIds: z.array(z.string().min(1)).min(1)
  })
});

export const downloadSelectionSchema = z.object({
  params: z.object({ sessionId: z.string().min(1) }),
  body: z.object({
    // Capped so one request cannot ask the server to archive an unbounded set.
    mediaIds: z.array(z.string().min(1)).min(1).max(500)
  })
});
