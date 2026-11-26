import type { PageMeta, PaginationQuery } from '@fnb/contract';

/**
 * A page of rows returned by a list endpoint. The response interceptor recognises this class
 * and sends `{ data: items, meta }`.
 */
export class Paginated<T> {
  readonly meta: PageMeta;

  constructor(
    readonly items: T[],
    total: number,
    query: PaginationQuery,
  ) {
    this.meta = {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  /** Same page, each row converted (for example from a database row to a response shape). */
  map<U>(convert: (item: T) => U): Paginated<U> {
    return new Paginated(this.items.map(convert), this.meta.total, this.meta);
  }
}

/** `limit` and `offset` of a page, for the repository query. */
export function toLimitOffset(query: PaginationQuery): { limit: number; offset: number } {
  return { limit: query.pageSize, offset: (query.page - 1) * query.pageSize };
}
