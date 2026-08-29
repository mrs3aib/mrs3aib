const BLOB_FETCH_TIMEOUT_MS = 30_000;

/**
 * Click a synthetic link to start a download.
 *
 * `sameOrigin` must be true only for `blob:`/`data:` URLs we created. For a
 * cross-origin href the `download` attribute is ignored, so the click becomes a
 * *navigation*: the SPA router starts a route transition it can never finish
 * and the page hangs on its loading state. Opening those in a detached tab
 * instead leaves the current page untouched — the browser downloads the file
 * (the server sends `Content-Disposition: attachment`) and closes the tab.
 */
function clickDownloadLink(
  href: string,
  fileName: string | undefined,
  sameOrigin: boolean
): void {
  const a = document.createElement("a");
  a.href = href;
  a.dataset.routeLoader = "false";
  if (sameOrigin) {
    if (fileName) a.download = fileName;
  } else {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Save a file to disk without navigating away.
 *
 * The `download` attribute is ignored for cross-origin URLs, and our signed
 * storage URLs are always cross-origin — so a plain link would just *open* the
 * image in a tab (a preview) instead of saving it. Fetching the bytes and
 * handing the browser a same-origin `blob:` URL makes `download` apply again,
 * which both forces a save and preserves the file name we chose.
 *
 * If the fetch fails (expired signature, CORS not configured on the bucket) we
 * fall back to opening the signed URL directly. The server sets a
 * `Content-Disposition: attachment` header on these URLs, so the browser still
 * saves the file rather than previewing it.
 */
export async function triggerDownload(url: string, fileName?: string): Promise<void> {
  // A hung request must not leave the caller's "preparing" state stuck forever;
  // give up and use the direct link instead.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), BLOB_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      credentials: "omit",
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    clickDownloadLink(objectUrl, fileName, true);
    // Revoke once the browser has picked up the download; immediate revocation
    // can cancel it in Safari.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    clickDownloadLink(url, fileName, false);
  } finally {
    window.clearTimeout(timer);
  }
}
