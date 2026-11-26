import { z } from 'zod';

/** Largest page a client may ask for. */
export const MAX_PAGE_SIZE = 100;
/** Page size used when the client sends none. */
export const DEFAULT_PAGE_SIZE = 20;

/** Query string of every list endpoint: `?page=1&pageSize=20`. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/** Page and page size of a list request. */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Paging facts returned next to a page of rows. */
export const pageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

/** Paging facts returned next to a page of rows. */
export type PageMeta = z.infer<typeof pageMetaSchema>;

/** Body of a successful response that returns one value: `{ data }`. */
export const apiSuccessSchema = <T extends z.ZodType>(data: T) => z.object({ data });

/** Body of a successful list response: `{ data: [...], meta }`. */
export const apiPageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: pageMetaSchema });

/** One page of rows with its paging facts. */
export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
