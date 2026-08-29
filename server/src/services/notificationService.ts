import { prisma } from "@/config/prisma";

/**
 * Notifications are derived, not stored.
 *
 * There is no Notification table: the feed is assembled on read from activity
 * that already exists (downloads, uploads, failed processing, new clients).
 * That keeps it truthful with zero write-path coupling, at the cost of read
 * state — which the dashboard tracks per admin in the browser.
 */
export type NotificationKind =
  | "download"
  | "mediaAdded"
  | "mediaFailed"
  | "clientAdded";

export type NotificationDto = {
  id: string;
  kind: NotificationKind;
  /** Bilingual so the dashboard can render without a translation table. */
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  /** Route the dashboard should open when the item is clicked. */
  href: string;
  createdAt: string;
};

export type NotificationFeed = {
  items: NotificationDto[];
  total: number;
};

/** How far back any source will look. */
const LOOKBACK_DAYS = 30;
const PER_SOURCE_LIMIT = 15;

function since(): Date {
  const date = new Date();
  date.setDate(date.getDate() - LOOKBACK_DAYS);
  return date;
}

/** Groups media uploaded to the same session within the same hour. */
function bucketKey(sessionId: string, at: Date): string {
  return `${sessionId}:${at.toISOString().slice(0, 13)}`;
}

export const notificationService = {
  async list(limit = 20): Promise<NotificationFeed> {
    const after = since();

    const [downloads, recentMedia, failedMedia, clients] = await Promise.all([
      prisma.downloadHistory.findMany({
        where: { timestamp: { gte: after } },
        orderBy: { timestamp: "desc" },
        take: PER_SOURCE_LIMIT,
        include: {
          client: { select: { name: true } },
          session: { select: { title: true } }
        }
      }),
      prisma.media.findMany({
        where: { createdAt: { gte: after }, processingStatus: "ready" },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE_LIMIT * 4,
        include: { session: { select: { title: true } } }
      }),
      prisma.media.findMany({
        where: { createdAt: { gte: after }, processingStatus: "failed" },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE_LIMIT,
        include: { session: { select: { title: true } } }
      }),
      prisma.client.findMany({
        where: { createdAt: { gte: after } },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE_LIMIT,
        include: { session: { select: { title: true } } }
      })
    ]);

    const items: NotificationDto[] = [];

    for (const record of downloads) {
      const count = record.mediaIds.length;
      items.push({
        id: `download:${record.id}`,
        kind: "download",
        titleEn: "New download",
        titleAr: "تحميل جديد",
        bodyEn: `${record.client.name} downloaded ${count} file${count === 1 ? "" : "s"} from ${record.session.title}`,
        bodyAr: `${record.client.name} حمّل ${count} ملف من ${record.session.title}`,
        href: `/downloads?sessionId=${record.sessionId}`,
        createdAt: record.timestamp.toISOString()
      });
    }

    // Individual uploads are noisy, so collapse them into one item per session
    // per hour — "128 photos added" rather than 128 separate entries.
    const uploadBuckets = new Map<
      string,
      { sessionId: string; sessionTitle: string; count: number; at: Date }
    >();
    for (const media of recentMedia) {
      const key = bucketKey(media.sessionId, media.createdAt);
      const existing = uploadBuckets.get(key);
      if (existing) {
        existing.count += 1;
        if (media.createdAt > existing.at) existing.at = media.createdAt;
      } else {
        uploadBuckets.set(key, {
          sessionId: media.sessionId,
          sessionTitle: media.session.title,
          count: 1,
          at: media.createdAt
        });
      }
    }
    for (const [key, bucket] of uploadBuckets) {
      items.push({
        id: `media:${key}`,
        kind: "mediaAdded",
        titleEn: "Media uploaded",
        titleAr: "تم رفع وسائط",
        bodyEn: `${bucket.count} file${bucket.count === 1 ? "" : "s"} added to ${bucket.sessionTitle}`,
        bodyAr: `تمت إضافة ${bucket.count} ملف إلى ${bucket.sessionTitle}`,
        href: `/studio?sessionId=${bucket.sessionId}`,
        createdAt: bucket.at.toISOString()
      });
    }

    for (const media of failedMedia) {
      items.push({
        id: `failed:${media.id}`,
        kind: "mediaFailed",
        titleEn: "Processing failed",
        titleAr: "فشلت المعالجة",
        bodyEn: `"${media.originalName}" in ${media.session.title} could not be processed`,
        bodyAr: `تعذرت معالجة "${media.originalName}" في ${media.session.title}`,
        href: `/studio?sessionId=${media.sessionId}&processingStatus=failed`,
        createdAt: media.createdAt.toISOString()
      });
    }

    for (const client of clients) {
      items.push({
        id: `client:${client.id}`,
        kind: "clientAdded",
        titleEn: "New client",
        titleAr: "عميل جديد",
        // A self-registered client has no session until an admin links one.
        bodyEn: client.session
          ? `${client.name} was added to ${client.session.title}`
          : `${client.name} registered and is waiting for a session`,
        bodyAr: client.session
          ? `تمت إضافة ${client.name} إلى ${client.session.title}`
          : `سجّل ${client.name} وينتظر تخصيص جلسة`,
        href: `/clients?sessionId=${client.sessionId}`,
        createdAt: client.createdAt.toISOString()
      });
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { items: items.slice(0, limit), total: items.length };
  }
};
