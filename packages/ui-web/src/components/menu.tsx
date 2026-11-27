import { DropdownMenu } from 'radix-ui';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { IconName } from './icon';
import type { ReactNode } from 'react';

/** One action of a `Menu`. */
export interface MenuItem {
  key: string;
  label: string;
  icon?: IconName;
  onSelect: () => void;
  /** `danger` for actions that are hard to undo; they still go through a `ConfirmDialog`. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface MenuProps {
  /** The element that opens the menu; must be a focusable element such as a button. */
  trigger: ReactNode;
  /** Optional heading inside the menu, for example the signed-in user. */
  header?: ReactNode;
  items: readonly MenuItem[];
  align?: 'start' | 'end';
}

/** A list of actions that pops out from a button (row actions, account menu). */
export function Menu({ trigger, header, items, align = 'end' }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className="z-popover rounded-control border-border bg-bg text-text min-w-48 border p-1 shadow-md"
        >
          {header ? (
            <>
              <div className="px-3 py-2">{header}</div>
              <DropdownMenu.Separator className="bg-border my-1 h-px" />
            </>
          ) : null}
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.key}
              onSelect={item.onSelect}
              {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
              className={cn(
                'rounded-control flex cursor-default items-center gap-2 px-3 py-2 text-sm outline-none select-none',
                'data-[highlighted]:bg-bg-muted data-[disabled]:opacity-50',
                item.tone === 'danger' ? 'text-danger-text' : '',
              )}
            >
              {item.icon ? <Icon name={item.icon} size={16} /> : null}
              <span>{item.label}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
