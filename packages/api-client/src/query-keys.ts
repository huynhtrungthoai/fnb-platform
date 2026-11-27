/** Query keys of every API resource, so invalidation always matches the hook that reads it. */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
} as const;
