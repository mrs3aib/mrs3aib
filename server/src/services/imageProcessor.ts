import sharp from "sharp";

const THUMBNAIL_MAX_DIMENSION = 480;
/**
 * The blur-up preview inlined into the gallery response.
 *
 * Deliberately tiny: it ships inside the JSON for every item in a page, so it
 * is sized to be smaller than a signed URL pointing at a separate object would
 * be. Upscaled into a full tile it reads as soft colour rather than detail,
 * which is the point — it stands in for the photograph without pretending to
 * be it.
 */
const PREVIEW_MAX_DIMENSION = 20;
const PREVIEW_QUALITY = 45;
const OPTIMIZED_MAX_DIMENSION = 2400;
const WEBP_QUALITY = 82;

export type ImageProcessingResult = {
  width: number;
  height: number;
  optimizedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  /** Blur-up preview as a `data:` URI, ready to inline in a response. */
  previewDataUrl: string;
};

export async function processImage(original: Buffer): Promise<ImageProcessingResult> {
  const image = sharp(original, { failOn: "none" });
  const metadata = await image.metadata();

  const [optimizedBuffer, thumbnailBuffer, previewBuffer] = await Promise.all([
    sharp(original)
      .rotate() // apply EXIF orientation before resizing
      .resize({
        width: OPTIMIZED_MAX_DIMENSION,
        height: OPTIMIZED_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
    sharp(original)
      .rotate()
      .resize({
        width: THUMBNAIL_MAX_DIMENSION,
        height: THUMBNAIL_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
    sharp(original)
      .rotate()
      .resize({
        width: PREVIEW_MAX_DIMENSION,
        height: PREVIEW_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: PREVIEW_QUALITY })
      .toBuffer()
  ]);

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    optimizedBuffer,
    thumbnailBuffer,
    previewDataUrl: `data:image/webp;base64,${previewBuffer.toString("base64")}`
  };
}
