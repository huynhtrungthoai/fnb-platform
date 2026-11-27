import { useContext } from 'react';

import { cn } from '../lib/cn';
import { Icon } from './icon';
import { PermissionContext } from './permissions';

import type { IconName } from './icon';
import type { PermissionCode } from '@fnb/contract';
import type { MouseEvent, ReactNode } from 'react';

/** A link of the main menu. */
export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  /** Hidden when the caller lacks it. */
  permission?: PermissionCode;
}

/** A titled group of links; hidden when none of its links are visible. */
export interface NavGroup {
  key: string;
  /** Leave out for a group without a heading. */
  label?: string;
  items: readonly NavItem[];
}

export interface SidebarProps {
  /** Logo and app name at the top. */
  brand?: ReactNode;
  /** Accessible name of the menu. */
  label: string;
  groups: readonly NavGroup[];
  activeKey?: string;
  /**
   * Opens a link inside the app without a page load. Ctrl/Cmd-click and middle-click keep the
   * browser's behaviour (new tab).
   */
  onNavigate?: (href: string) => void;
}

function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Main menu of the Admin, filtered by the caller's permissions. */
export function Sidebar({ brand, label, groups, activeKey, onNavigate }: SidebarProps) {
  const permissions = useContext(PermissionContext);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || permissions.has(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav aria-label={label} className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {brand ? <div className="px-2">{brand}</div> : null}
      {visibleGroups.map((group) => (
        <div key={group.key} className="flex flex-col gap-1">
          {group.label ? (
            <p className="text-text-subtle px-3 pt-2 text-xs font-semibold tracking-wide uppercase">
              {group.label}
            </p>
          ) : null}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(event) => {
                      if (onNavigate && isPlainClick(event)) {
                        event.preventDefault();
                        onNavigate(item.href);
                      }
                    }}
                    className={cn(
                      'h-control-sm rounded-control flex items-center gap-3 px-3 text-sm',
                      'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
                      isActive
                        ? 'bg-primary-subtle text-primary-text font-semibold'
                        : 'text-text-muted hover:bg-bg-muted hover:text-text font-medium',
                    )}
                  >
                    <Icon name={item.icon} size={16} />
                    <span className="truncate">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
