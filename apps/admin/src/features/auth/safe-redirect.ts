/** Keeps a redirect target inside the app, so a crafted link cannot send the user elsewhere. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  // Never bounce back to the screens that lead here.
  if (value.startsWith('/login') || value.startsWith('/change-pin')) {
    return '/';
  }
  return value;
}
