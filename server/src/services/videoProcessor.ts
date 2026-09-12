import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export type VideoProcessingResult = {
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailBuffer: Buffer;
};

function probe(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function extractThumbnail(filePath: string, outputDir: string): Promise<string> {
  const fileName = "thumbnail.png";
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .on("end", () => resolve(join(outputDir, fileName)))
      .on("error", reject)
      .screenshots({
        count: 1,
        timemarks: ["1"],
        filename: fileName,
        folder: outputDir
      });
  });
}

/**
 * Probe a video and grab a still from it.
 *
 * Takes a stream rather than a Buffer: ffmpeg needs a seekable file on disk
 * either way, so buffering the whole object in memory first only added a second
 * full-size copy. A 1.8 GB upload used to occupy 1.8 GB of heap for the length
 * of processing — enough to exhaust a typical Node instance if two landed at
 * once, and impossible past Node's ~2 GB Buffer ceiling. Streaming straight to
 * the temp file keeps memory flat regardless of size.
 *
 * A Buffer is still accepted for callers that already hold one in memory.
 */
export async function processVideo(
  original: Buffer | Readable
): Promise<VideoProcessingResult> {
  const workDir = await mkdtemp(join(tmpdir(), "video-"));
  const inputPath = join(workDir, "input");

  try {
    if (Buffer.isBuffer(original)) {
      await writeFile(inputPath, original);
    } else {
      try {
        // Backpressure is handled by `pipeline`, so the file lands on disk
        // without the whole object ever being resident.
        await pipeline(original, createWriteStream(inputPath));
      } catch (error) {
        // A half-read body keeps its socket checked out of the pool, which
        // starves later downloads. `pipeline` destroys on its own errors, but
        // not if the write target fails first.
        original.destroy();
        throw error;
      }
    }

    const [metadata, thumbnailPath] = await Promise.all([
      probe(inputPath),
      extractThumbnail(inputPath, workDir)
    ]);

    const videoStream = metadata.streams.find((s) => s.codec_type === "video");
    const thumbnailBuffer = await readFile(thumbnailPath);

    return {
      width: videoStream?.width ?? null,
      height: videoStream?.height ?? null,
      duration: metadata.format.duration ?? null,
      thumbnailBuffer
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
