import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '../lib/cn';

import type { ReactNode } from 'react';

/** One tab and its panel. */
export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  /** Accessible name of the tab list. */
  label: string;
  items: readonly TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Splits one screen into panels; the admin theme underlines the active tab. */
export function Tabs({ label, items, value, onChange, className }: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onChange}
      className={cn('flex flex-col gap-4', className)}
    >
      <TabsPrimitive.List
        aria-label={label}
        className="border-border flex gap-1 overflow-x-auto border-b"
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
            className={cn(
              'h-control-sm -mb-px border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap',
              'text-text-muted hover:text-text focus-visible:outline-ring focus-visible:outline-2',
              'data-[state=active]:border-primary data-[state=active]:text-text data-[state=active]:font-semibold',
              'disabled:opacity-50',
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value} className="outline-none">
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
