import { ToggleGroup } from 'radix-ui';

import { cn } from '../lib/cn';
import { Icon } from './icon';

import type { IconName } from './icon';

export interface SegmentedOption<TValue extends string> {
  value: TValue;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<TValue extends string> {
  /** Accessible name of the group. */
  label: string;
  value: TValue;
  options: readonly SegmentedOption<TValue>[];
  onChange: (value: TValue) => void;
  className?: string;
}

/**
 * A row of mutually exclusive choices. Internal building block of `LanguageSwitcher` and
 * `ThemeSwitcher`; the selected item is marked by surface, weight and `aria-checked`.
 */
export function SegmentedControl<TValue extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<TValue>) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        // Radix reports an empty string when the active item is pressed again; keep the choice.
        const selected = options.find((option) => option.value === next);
        if (selected) {
          onChange(selected.value);
        }
      }}
      className={cn('bg-bg-muted inline-flex gap-1 rounded-md p-1', className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'h-control-sm text-text-muted inline-flex items-center gap-2 rounded-sm px-3 text-sm',
            'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
            'data-[state=on]:bg-bg data-[state=on]:text-text data-[state=on]:font-semibold data-[state=on]:shadow-sm',
          )}
        >
          {option.icon ? <Icon name={option.icon} size={16} /> : null}
          <span>{option.label}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
