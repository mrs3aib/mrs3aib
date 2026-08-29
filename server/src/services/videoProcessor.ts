import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

export async function processVideo(original: Buffer): Promise<VideoProcessingResult> {
  const workDir = await mkdtemp(join(tmpdir(), "video-"));
  const inputPath = join(workDir, "input");

  try {
    await writeFile(inputPath, original);

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
