import type { NavGroup } from '@fnb/ui-web';
import type { TFunction } from 'i18next';

/**
 * Main menu of the Admin. Each link names the permission of its screen, so the menu shows only
 * what the caller may open (06 section 7.2). Screens of later milestones add their entries here.
 */
export function buildNavigation(t: TFunction<['admin', 'common']>): NavGroup[] {
  return [
    {
      key: 'main',
      items: [{ key: 'home', label: t('admin:nav.home'), icon: 'home', href: '/' }],
    },
  ];
}

/** Key of the menu entry for a path: its first segment, `home` for the root. */
export function activeNavKey(pathname: string): string {
  const [first = ''] = pathname.split('/').filter((segment) => segment.length > 0);
  return first.length > 0 ? first : 'home';
}
