import { prisma } from "@/config/prisma";
import { Prisma, type DeviceType, type PageView } from "@prisma/client";

export type AnalyticsRange = {
  from: Date;
  to: Date;
  /**
   * When true, rows classified as `bot` are excluded from every aggregate.
   * The default for the dashboard: an admin asking "how many people visited"
   * means people, and one crawler sweep can outnumber a week of real traffic.
   */
  excludeBots: boolean;
};

/** One bucket of the visits-over-time chart. */
export type TimeseriesBucket = {
  /** Bucket start, truncated to the hour or the day in UTC. */
  bucket: Date;
  views: number;
  visitors: number;
};

export type PathCount = {
  path: string;
  views: number;
  visitors: number;
};

export type SessionCount = {
  sessionId: string;
  title: string;
  category: string;
  views: number;
  visitors: number;
};

export type LabelledCount = {
  label: string;
  views: number;
};

/**
 * Shared `WHERE` fragment, so a filter can never be applied to one aggregate
 * and forgotten in another — which would show totals that do not add up to the
 * breakdowns beneath them.
 *
 * `alias` qualifies the column names. It is required by the one query that
 * joins `sessions`, which carries a `createdAt` of its own: unqualified, the
 * reference is ambiguous and Postgres rejects the whole statement (42702).
 * Defaulted rather than optional-at-each-callsite so an unqualified query
 * stays readable, and passing the alias is all a future join has to remember.
 */
function whereSql(range: AnalyticsRange, alias?: string): Prisma.Sql {
  // Interpolated, never user input: every caller passes a literal.
  const prefix = alias ? Prisma.raw(`"${alias}".`) : Prisma.empty;
  return Prisma.sql`
    ${prefix}"createdAt" >= ${range.from}
    AND ${prefix}"createdAt" < ${range.to}
    ${range.excludeBots ? Prisma.sql`AND ${prefix}"deviceType" <> 'bot'` : Prisma.empty}
  `;
}

/** The Prisma `where` equivalent of `whereSql`, for the ORM-based queries. */
function whereInput(range: AnalyticsRange): Prisma.PageViewWhereInput {
  return {
    createdAt: { gte: range.from, lt: range.to },
    ...(range.excludeBots ? { deviceType: { not: "bot" as DeviceType } } : {})
  };
}

export const analyticsRepository = {
  create(data: {
    path: string;
    locale: string | null;
    sessionId: string | null;
    referrerHost: string | null;
    deviceType: DeviceType;
    visitorHash: string;
  }): Promise<PageView> {
    return prisma.pageView.create({ data });
  },

  countViews(range: AnalyticsRange): Promise<number> {
    return prisma.pageView.count({ where: whereInput(range) });
  },

  /**
   * Distinct visitors in the range.
   *
   * Raw SQL rather than Prisma's `distinct` — that one fetches every matching
   * row and de-duplicates in the client, which on a busy month means pulling
   * the whole table into Node just to learn a single number.
   */
  async countVisitors(range: AnalyticsRange): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorHash") AS count
      FROM "page_views"
      WHERE ${whereSql(range)}
    `;
    return Number(rows[0]?.count ?? 0);
  },

  /**
   * Views and visitors per time bucket.
   *
   * `generate_series` supplies the buckets, so a day with no traffic comes
   * back as a zero rather than being absent — a chart that silently omits
   * empty days draws a straight line across them and misreports a quiet week
   * as a steady one.
   */
  async timeseries(
    range: AnalyticsRange,
    granularity: "hour" | "day"
  ): Promise<TimeseriesBucket[]> {
    // Interpolated, never user input: `granularity` is a union of two literals
    // checked by the caller's Zod schema, and `date_trunc`'s field argument
    // cannot be a bind parameter.
    const unit = granularity === "hour" ? "hour" : "day";
    const step = granularity === "hour" ? "1 hour" : "1 day";

    const rows = await prisma.$queryRaw<
      { bucket: Date; views: bigint; visitors: bigint }[]
    >`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${unit}, ${range.from}::timestamp),
          date_trunc(${unit}, ${range.to}::timestamp - interval '1 millisecond'),
          ${step}::interval
        ) AS bucket
      ),
      counted AS (
        SELECT
          date_trunc(${unit}, "createdAt") AS bucket,
          COUNT(*) AS views,
          COUNT(DISTINCT "visitorHash") AS visitors
        FROM "page_views"
        WHERE ${whereSql(range)}
        GROUP BY 1
      )
      SELECT
        b.bucket,
        COALESCE(c.views, 0) AS views,
        COALESCE(c.visitors, 0) AS visitors
      FROM buckets b
      LEFT JOIN counted c ON c.bucket = b.bucket
      ORDER BY b.bucket ASC
    `;

    return rows.map((row) => ({
      bucket: row.bucket,
      views: Number(row.views),
      visitors: Number(row.visitors)
    }));
  },

  async topPaths(range: AnalyticsRange, limit: number): Promise<PathCount[]> {
    const rows = await prisma.$queryRaw<
      { path: string; views: bigint; visitors: bigint }[]
    >`
      SELECT "path", COUNT(*) AS views, COUNT(DISTINCT "visitorHash") AS visitors
      FROM "page_views"
      WHERE ${whereSql(range)}
      GROUP BY "path"
      ORDER BY views DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({
      path: row.path,
      views: Number(row.views),
      visitors: Number(row.visitors)
    }));
  },

  /**
   * Most-viewed albums, joined to their session so the report can name them.
   *
   * An inner join drops views whose session was deleted (`sessionId` is set
   * null on delete). Those rows still count in the totals above — they were
   * real visits — but there is no longer an album to list them under.
   */
  async topSessions(range: AnalyticsRange, limit: number): Promise<SessionCount[]> {
    const rows = await prisma.$queryRaw<
      {
        sessionId: string;
        title: string;
        category: string;
        views: bigint;
        visitors: bigint;
      }[]
    >`
      SELECT
        v."sessionId"      AS "sessionId",
        s."title"          AS title,
        s."category"::text AS category,
        COUNT(*) AS views,
        COUNT(DISTINCT v."visitorHash") AS visitors
      FROM "page_views" v
      JOIN "sessions" s ON s."id" = v."sessionId"
      WHERE ${whereSql(range, "v")}
      GROUP BY v."sessionId", s."title", s."category"
      ORDER BY views DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({
      sessionId: row.sessionId,
      title: row.title,
      category: row.category,
      views: Number(row.views),
      visitors: Number(row.visitors)
    }));
  },

  /**
   * Referrer hosts, most traffic first.
   *
   * Rows with no referrer are folded into a single "direct" label rather than
   * dropped — for most studios that is the largest bucket, and omitting it
   * would make the share shown beside every other source wrong.
   */
  async referrers(range: AnalyticsRange, limit: number): Promise<LabelledCount[]> {
    const rows = await prisma.$queryRaw<{ label: string; views: bigint }[]>`
      SELECT COALESCE("referrerHost", 'direct') AS label, COUNT(*) AS views
      FROM "page_views"
      WHERE ${whereSql(range)}
      GROUP BY 1
      ORDER BY views DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({ label: row.label, views: Number(row.views) }));
  },

  async devices(range: AnalyticsRange): Promise<LabelledCount[]> {
    const rows = await prisma.pageView.groupBy({
      by: ["deviceType"],
      where: whereInput(range),
      _count: { _all: true }
    });
    return rows
      .map((row) => ({ label: row.deviceType as string, views: row._count._all }))
      .sort((a, b) => b.views - a.views);
  },

  async locales(range: AnalyticsRange): Promise<LabelledCount[]> {
    const rows = await prisma.$queryRaw<{ label: string; views: bigint }[]>`
      SELECT COALESCE("locale", 'unknown') AS label, COUNT(*) AS views
      FROM "page_views"
      WHERE ${whereSql(range)}
      GROUP BY 1
      ORDER BY views DESC
    `;
    return rows.map((row) => ({ label: row.label, views: Number(row.views) }));
  },

  /** Distinct visitors seen since `since` — the "active now" figure. */
  async countVisitorsSince(since: Date, excludeBots: boolean): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorHash") AS count
      FROM "page_views"
      WHERE "createdAt" >= ${since}
      ${excludeBots ? Prisma.sql`AND "deviceType" <> 'bot'` : Prisma.empty}
    `;
    return Number(rows[0]?.count ?? 0);
  },

  /** Newest views, for the live feed. */
  recent(limit: number, excludeBots: boolean) {
    return prisma.pageView.findMany({
      where: excludeBots ? { deviceType: { not: "bot" } } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { session: { select: { title: true } } }
    });
  }
};
