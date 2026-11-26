import {
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Inbox,
  Info,
  Languages,
  LoaderCircle,
  Monitor,
  Moon,
  Plus,
  RotateCw,
  Sun,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';

import { cn } from '../lib/cn';

import type { LucideIcon } from 'lucide-react';

/**
 * The icons the platform uses, by stable name. Screens never import the icon library directly;
 * add an entry here when a new icon is needed (plans/03-design-system.md section 6).
 */
const ICONS = {
  check: Check,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  inbox: Inbox,
  info: Info,
  languages: Languages,
  loader: LoaderCircle,
  monitor: Monitor,
  moon: Moon,
  plus: Plus,
  retry: RotateCw,
  sun: Sun,
  trash: Trash2,
  'triangle-alert': TriangleAlert,
  x: X,
} as const satisfies Record<string, LucideIcon>;

/** Name of an icon available in this component set. */
export type IconName = keyof typeof ICONS;

/** Icon size in px; the three sizes of the design system. */
export type IconSize = 16 | 20 | 24;

const SIZE_CLASSES: Record<IconSize, string> = {
  16: 'size-icon-sm',
  20: 'size-icon-md',
  24: 'size-icon-lg',
};

export interface IconProps {
  name: IconName;
  size?: IconSize;
  /** Accessible name. Leave it out when the icon sits next to text that says the same thing. */
  label?: string;
  className?: string;
}

/** An icon from the shared set, sized by token. Decorative unless `label` is given. */
export function Icon({ name, size = 24, label, className }: IconProps) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      className={cn('shrink-0', SIZE_CLASSES[size], className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
