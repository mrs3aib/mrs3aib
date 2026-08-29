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
