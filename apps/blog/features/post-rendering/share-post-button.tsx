import type { ComponentPropsWithRef } from 'react';

/**
 * Icon-only button for a post footer share control. `label` is both its accessible name and its
 * tooltip; the icon passed as children should be `aria-hidden`. Other props (including those a
 * Radix `asChild` trigger merges in) are passed to the `<button>`.
 */
export function SharePostButton({ label, ...props }: ComponentPropsWithRef<'button'> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="rounded-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      {...props}
    />
  );
}
