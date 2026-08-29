export type Client = {
  id: string;
  name: string;
  phone: string;
  /** Null for a client who registered themselves and has no shoot yet. */
  sessionId: string | null;
  sessionTitle: string | null;
  sessionCategory: string | null;
  /**
   * Whether this session is listed in the public galleries. A private session
   * is still reachable by its assigned client after signing in — this is about
   * public discoverability only.
   */
  sessionPubliclyListed: boolean;
  /** False until a password is set — such a client cannot sign in yet. */
  hasPassword: boolean;
  createdAt: string;
};

export type CreateClientPayload = {
  name: string;
  phone: string;
  sessionId?: string;
  password: string;
};

export type UpdateClientPayload = Partial<CreateClientPayload>;

export type ClientListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sessionId?: string;
};

export type ResetClientPasswordPayload = { id: string; password: string };
