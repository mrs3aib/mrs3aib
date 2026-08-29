export type PaginationParams = {
  page?: number | undefined;
  pageSize?: number | undefined;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function toSkipTake(params: PaginationParams): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return { items, total, page, pageSize };
}
