import "dotenv/config";
import { prisma } from "@/config/prisma";
import { storageProvider } from "@/services/serviceRegistry";
import { processImage } from "@/services/imageProcessor";

/**
 * Re-encode the poster stills of videos processed before they went through the
 * image pipeline.
 *
 * ffmpeg wrote those frames at the video's own resolution as PNG, so a page of
 * video albums shipped megabytes of covers — one restaurant album's poster was
 * 2.1 MB where an image upload's thumbnail is around 13 KB. New uploads are
 * fixed at the source; this brings the existing rows to the same shape and
 * gives them the blur-up preview they never had.
 *
 * Safe to re-run. A row is skipped once its stored bytes are already WebP, so
 * an interrupted run resumes rather than repeating work, and the script never
 * touches the original video — only the derived still.
 *
 *   npm run backfill:video-thumbnails            # report what would change
 *   npm run backfill:video-thumbnails -- --apply # write the changes
 */

/** WebP files start with "RIFF"…"WEBP"; PNG starts with a distinct 8-byte magic. */
function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  const videos = await prisma.media.findMany({
    where: {
      type: "video",
      processingStatus: "ready",
      thumbnailKey: { not: null }
    },
    select: { id: true, sessionId: true, thumbnailKey: true, previewDataUrl: true }
  });

  console.log(
    `${videos.length} ready video(s) with a thumbnail. ` +
      (apply ? "Applying." : "Dry run — pass --apply to write.")
  );

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let before = 0;
  let after = 0;

  for (const video of videos) {
    const key = video.thumbnailKey as string;
    try {
      const original = await storageProvider.download(key);

      // Already WebP and already previewed: nothing left to do for this row.
      if (isWebp(original) && video.previewDataUrl) {
        skipped += 1;
        continue;
      }

      const frame = await processImage(original);
      before += original.length;
      after += frame.thumbnailBuffer.length;

      if (apply) {
        // The key already ends in `.webp`; only the bytes behind it were PNG,
        // so this overwrites in place and no URL anywhere needs to change.
        await storageProvider.upload(key, frame.thumbnailBuffer, "image/webp");
        await prisma.media.update({
          where: { id: video.id },
          data: { previewDataUrl: frame.previewDataUrl }
        });
      }

      converted += 1;
      console.log(
        `  ${video.id}  ${(original.length / 1024).toFixed(0)} KB -> ` +
          `${(frame.thumbnailBuffer.length / 1024).toFixed(0)} KB`
      );
    } catch (error) {
      failed += 1;
      // One unreadable object should not abandon the rest of the backfill.
      console.error(`  ${video.id}  FAILED:`, (error as Error).message);
    }
  }

  console.log(
    `\nconverted=${converted} skipped=${skipped} failed=${failed}` +
      (converted > 0
        ? `  ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`
        : "")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
