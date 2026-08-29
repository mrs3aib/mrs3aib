import { prisma } from "@/config/prisma";
import type { Client, Prisma } from "@prisma/client";

export const clientRepository = {
  findByPhone(phone: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { phone } });
  },

  findById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { id } });
  },

  findByIdWithSession(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: { session: true }
    });
  },

  list(args: {
    skip: number;
    take: number;
    search?: string | undefined;
    sessionId?: string | undefined;
  }) {
    const where: Prisma.ClientWhereInput = {
      ...(args.sessionId ? { sessionId: args.sessionId } : {}),
      ...(args.search
        ? {
            OR: [
              { name: { contains: args.search, mode: "insensitive" } },
              { phone: { contains: args.search } }
            ]
          }
        : {})
    };
    return prisma.client.findMany({
      where,
      skip: args.skip,
      take: args.take,
      orderBy: { createdAt: "desc" },
      include: {
        // `isPublic` and `status` decide whether the client's gallery link
        // actually reaches their photos, which the admin list surfaces.
        session: {
          select: { title: true, category: true, isPublic: true, status: true }
        }
      }
    });
  },

  count(args: { search?: string | undefined; sessionId?: string | undefined }): Promise<number> {
    const where: Prisma.ClientWhereInput = {
      ...(args.sessionId ? { sessionId: args.sessionId } : {}),
      ...(args.search
        ? {
            OR: [
              { name: { contains: args.search, mode: "insensitive" } },
              { phone: { contains: args.search } }
            ]
          }
        : {})
    };
    return prisma.client.count({ where });
  },

  create(data: Prisma.ClientCreateInput): Promise<Client> {
    return prisma.client.create({ data });
  },

  update(id: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    return prisma.client.update({ where: { id }, data });
  },

  delete(id: string): Promise<Client> {
    return prisma.client.delete({ where: { id } });
  },

  reassignMany(clientIds: string[], sessionId: string): Promise<Prisma.BatchPayload> {
    return prisma.client.updateMany({
      where: { id: { in: clientIds } },
      data: { sessionId }
    });
  }
};
