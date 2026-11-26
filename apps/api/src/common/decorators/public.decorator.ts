import { SetMetadata } from '@nestjs/common';

/** Metadata key read by the default-deny guard (added in M1-11). */
export const IS_PUBLIC_KEY = 'fnb:isPublic';

/**
 * Marks an endpoint as reachable without a session.
 * The API is default-deny: every endpoint declares `@RequirePermission`, `@Authenticated`
 * or `@Public` (plans/06-permissions.md).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
