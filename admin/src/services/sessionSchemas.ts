import { z } from "zod";
import { SESSION_CATEGORIES } from "@/types/category";

const customSlugSchema = z.string().trim().toLowerCase().max(120, "URL name is too long").regex(
  /^(?:[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)?$/u,
  "Use letters, numbers, and single hyphens between words"
).optional();

export const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
  slug: customSlugSchema,
  category: z.enum(SESSION_CATEGORIES, { message: "Category is required" }),
  eventDate: z.string().min(1, "Event date is required"),
  location: z.string().min(1, "Location is required").max(160, "Location is too long"),
  description: z.string().max(2000, "Description is too long").optional(),
  // Only the two working states are editable here. Archiving is a separate
  // action in the row menu, so it is not offered as a form option.
  status: z.enum(["draft", "active"]).optional(),
  isPublic: z.boolean().optional(),
  visibility: z.enum(["public", "private", "protected"]).optional()
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
