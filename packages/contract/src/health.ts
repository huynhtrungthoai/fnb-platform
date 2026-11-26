import { z } from 'zod';

/** Whether a backing service answered the last probe. */
export const dependencyStatusSchema = z.enum(['up', 'down']);

/** Status of one backing service. */
export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;

/** Response body of `GET /health`. `degraded` means the API runs but a dependency is down. */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
  dependencies: z.object({
    database: dependencyStatusSchema,
    redis: dependencyStatusSchema,
    storage: dependencyStatusSchema,
  }),
});

/** Response body of `GET /health`. */
export type HealthResponse = z.infer<typeof healthResponseSchema>;
