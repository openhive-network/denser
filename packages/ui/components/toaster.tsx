'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from '@ui/components/toast';
import { useToast } from './hooks/use-toast';

/**
 * `label`: the notification region's accessible name; Radix replaces `{hotkey}` in it with the focus hotkey (F8).
 * `announcementLabel`: the word screen readers hear before each toast's text (Radix's default is English "Notification").
 * `closeLabel`: the accessible name of each toast's icon-only close button.
 */
export function Toaster({
  label,
  announcementLabel,
  closeLabel
}: {
  label: string;
  announcementLabel: string;
  closeLabel: string;
}) {
  const { toasts } = useToast();

  return (
    <ToastProvider label={announcementLabel}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="w-full">
            <div className="grid w-full gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription className="w-full min-w-0">{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose aria-label={closeLabel} />
          </Toast>
        );
      })}
      <ToastViewport label={label} />
    </ToastProvider>
  );
}
