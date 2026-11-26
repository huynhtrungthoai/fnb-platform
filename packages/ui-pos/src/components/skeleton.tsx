import { cn } from '../lib/cn';

export interface SkeletonProps {
  /** `line` for text, `rect` for a block such as an image, `row` for a table or list row. */
  shape?: 'line' | 'rect' | 'row';
  className?: string;
}

const SHAPE_CLASSES: Record<NonNullable<SkeletonProps['shape']>, string> = {
  line: 'h-5 w-full rounded-sm',
  rect: 'h-32 w-full rounded-md',
  row: 'h-touch-pos w-full rounded-sm',
};

/** Placeholder in the shape of content that is still loading. Purely decorative. */
export function Skeleton({ shape = 'line', className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-bg-muted animate-pulse', SHAPE_CLASSES[shape], className)}
    />
  );
}
