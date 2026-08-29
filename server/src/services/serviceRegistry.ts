import { R2StorageProvider } from "@/storage/r2StorageProvider";

// Single composition point for storage — swap to a different S3-compatible
// provider by constructing a different class here.
export const storageProvider = new R2StorageProvider();
