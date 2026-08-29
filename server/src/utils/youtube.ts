/**
 * YouTube link handling.
 *
 * An admin pastes whatever URL their browser gave them, which may be a watch
 * link, a share link, an embed link, or a Shorts link — with or without a
 * playlist, timestamp, or tracking parameters attached. All of those refer to
 * the same video, so the id is parsed once on save and everything downstream
 * (embed URL, thumbnail) is derived from it rather than from the original text.
 */

/** A YouTube video id: exactly 11 characters of base64url alphabet. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

/**
 * Extract the video id from any recognised YouTube URL, or null when the input
 * is not one. A bare 11-character id is accepted too, since that is a natural
 * thing to paste.
 */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A bare id, pasted without the surrounding URL.
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    // Tolerate a scheme-less paste such as "youtu.be/xxxx".
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  // youtu.be/<id> — the id is the whole path.
  if (host.endsWith("youtu.be")) {
    return validId(url.pathname.slice(1).split("/")[0]);
  }

  // youtube.com/watch?v=<id>, the canonical form.
  const queryId = url.searchParams.get("v");
  if (queryId) return validId(queryId);

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id> — all id-in-path forms.
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && ["embed", "shorts", "live", "v"].includes(segments[0] as string)) {
    return validId(segments[1] as string);
  }

  return null;
}

function validId(candidate: string | undefined): string | null {
  if (!candidate) return null;
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

/** The canonical watch URL, stored so the admin always sees a tidy link. */
export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Thumbnail served straight from YouTube's CDN.
 *
 * `hqdefault` is the one size guaranteed to exist for every video; the larger
 * `maxresdefault` 404s on videos never uploaded at that resolution, which would
 * leave a broken tile in the grid.
 */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
