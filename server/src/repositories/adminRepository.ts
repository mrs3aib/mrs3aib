import { prisma } from "@/config/prisma";
import type { Admin } from "@prisma/client";

export const adminRepository = {
  findByEmail(email: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { email } });
  },

  findById(id: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { id } });
  },

  update(id: string, data: { name?: string; email?: string; passwordHash?: string }): Promise<Admin> {
    return prisma.admin.update({ where: { id }, data });
  }
};
