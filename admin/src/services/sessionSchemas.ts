import { z } from "zod";
import { SESSION_CATEGORIES } from "@/types/category";

export const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
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
