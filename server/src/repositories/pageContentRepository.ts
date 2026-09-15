import { prisma } from "@/config/prisma";
import type { PageContent, Prisma } from "@prisma/client";

export type PageContentFields = {
  title: string;
  content: Prisma.InputJsonValue;
  published?: boolean;
};

export const pageContentRepository = {
  findByPageKey(pageKey: string): Promise<PageContent | null> {
    return prisma.pageContent.findUnique({ where: { pageKey } });
  },

  findPublishedByPageKey(pageKey: string): Promise<PageContent | null> {
    return prisma.pageContent.findFirst({
      where: { pageKey, published: true }
    });
  },

  /**
   * Published records for many keys at once.
   *
   * The site's category navigation needs one flag per category, which as
   * single lookups was a request and a query each. Prisma resolves this as one
   * `IN` — the row count is bounded by the caller's key list.
   */
  findPublishedByPageKeys(pageKeys: string[]): Promise<PageContent[]> {
    if (pageKeys.length === 0) return Promise.resolve([]);
    return prisma.pageContent.findMany({
      where: { pageKey: { in: pageKeys }, published: true }
    });
  },

  list(): Promise<PageContent[]> {
    return prisma.pageContent.findMany({ orderBy: { updatedAt: "desc" } });
  },

  upsert(pageKey: string, data: PageContentFields): Promise<PageContent> {
    return prisma.pageContent.upsert({
      where: { pageKey },
      create: { pageKey, ...data },
      update: data
    });
  }
};
