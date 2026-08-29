import type { Client, PhotoSession } from "@prisma/client";
import { clientRepository } from "@/repositories/clientRepository";
import { refreshTokenRepository } from "@/repositories/refreshTokenRepository";
import { sessionRepository } from "@/repositories/sessionRepository";
import { hashPassword } from "@/auth/password";
import { toSkipTake, paginate, type PaginatedResult } from "@/utils/pagination";
import { ConflictError, NotFoundError, ValidationError } from "@/types/errors";
import { logger } from "@/config/logger";

/**
 * `session` is null for a self-registered client not yet attached to a shoot.
 *
 * The session fields are picked from `PhotoSession` rather than restated, so
 * `status` keeps its enum type and `category` cannot drift from the schema.
 */
type ClientWithSession = Client & {
  session: Pick<PhotoSession, "title" | "category" | "isPublic" | "status"> | null;
};

export type ClientDto = {
  id: string;
  name: string;
  phone: string;
  sessionId: string | null;
  sessionTitle: string | null;
  sessionCategory: string | null;
  /**
   * Whether this session is listed in the public galleries.
   *
   * Only about public discoverability — a private session is still fully
   * available to its assigned client, who signs in and opens their own
   * gallery. The public listing routes additionally require `active`, so a
   * draft or archived session is unlisted whatever `isPublic` says.
   */
  sessionPubliclyListed: boolean;
  /**
   * Whether this client can sign in at all. The hash itself never leaves the
   * server — the admin list only needs to show who is still waiting for a
   * password, which is every client created before password login existed.
   */
  hasPassword: boolean;
  createdAt: string;
};

function toDto(client: ClientWithSession): ClientDto {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    sessionId: client.sessionId,
    sessionTitle: client.session?.title ?? null,
    sessionCategory: client.session?.category ?? null,
    sessionPubliclyListed:
      client.session?.isPublic === true && client.session.status === "active",
    hasPassword: Boolean(client.passwordHash),
    createdAt: client.createdAt.toISOString()
  };
}

export const clientService = {
  async list(params: {
    page?: number | undefined;
    pageSize?: number | undefined;
    search?: string | undefined;
    sessionId?: string | undefined;
  }): Promise<PaginatedResult<ClientDto>> {
    const { skip, take, page, pageSize } = toSkipTake(params);
    const [clients, total] = await Promise.all([
      clientRepository.list({
        skip,
        take,
        search: params.search,
        sessionId: params.sessionId
      }),
      clientRepository.count({ search: params.search, sessionId: params.sessionId })
    ]);
    return paginate(clients.map(toDto), total, page, pageSize);
  },

  async create(input: {
    name: string;
    phone: string;
    sessionId?: string | undefined;
    password: string;
  }): Promise<ClientDto> {
    if (input.sessionId) {
      const session = await sessionRepository.findById(input.sessionId);
      if (!session) throw new ValidationError("Selected session does not exist");
    }

    // Checked up front so a duplicate number is reported as a plain conflict
    // rather than surfacing as a raw unique-constraint error from Prisma.
    const existing = await clientRepository.findByPhone(input.phone);
    if (existing) {
      throw new ConflictError("A client with this phone number already exists");
    }

    const client = await clientRepository.create({
      name: input.name,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      ...(input.sessionId ? { session: { connect: { id: input.sessionId } } } : {})
    });
    const withSession = await clientRepository.findByIdWithSession(client.id);
    if (!withSession) throw new NotFoundError("Client not found");
    return toDto(withSession);
  },

  async update(
    id: string,
    input: { name?: string; phone?: string; sessionId?: string }
  ): Promise<ClientDto> {
    if (input.sessionId) {
      const session = await sessionRepository.findById(input.sessionId);
      if (!session) throw new ValidationError("Selected session does not exist");
    }

    if (input.phone !== undefined) {
      const existing = await clientRepository.findByPhone(input.phone);
      if (existing && existing.id !== id) {
        throw new ConflictError("A client with this phone number already exists");
      }
    }

    await clientRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.sessionId !== undefined
        ? { session: { connect: { id: input.sessionId } } }
        : {})
    });
    const withSession = await clientRepository.findByIdWithSession(id);
    if (!withSession) throw new NotFoundError("Client not found");
    return toDto(withSession);
  },

  /**
   * Set a client's password on their behalf.
   *
   * This is the recovery path for a forgotten password. With OTP delivery
   * gone there is no channel to send a reset link over, so recovery runs
   * through the studio: the client asks, the admin sets a new password here
   * and passes it on. No proof of the old password is required — the admin is
   * already trusted with every gallery in the system.
   */
  async resetPassword(id: string, password: string): Promise<void> {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError("Client not found");

    await clientRepository.update(id, { passwordHash: await hashPassword(password) });

    // Anyone signed in with the old password is signed out, so a reset
    // prompted by a suspected leak actually closes the existing sessions.
    await refreshTokenRepository.revokeAllForClient(id);
    logger.info({ clientId: id }, "Client password reset by admin");
  },

  async delete(id: string): Promise<void> {
    await clientRepository.delete(id);
  }
};
