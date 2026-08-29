import sharp from "sharp";

const THUMBNAIL_MAX_DIMENSION = 480;
const OPTIMIZED_MAX_DIMENSION = 2400;
const WEBP_QUALITY = 82;

export type ImageProcessingResult = {
  width: number;
  height: number;
  optimizedBuffer: Buffer;
  thumbnailBuffer: Buffer;
};

export async function processImage(original: Buffer): Promise<ImageProcessingResult> {
  const image = sharp(original, { failOn: "none" });
  const metadata = await image.metadata();

  const [optimizedBuffer, thumbnailBuffer] = await Promise.all([
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
      .toBuffer()
  ]);

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    optimizedBuffer,
    thumbnailBuffer
  };
}
