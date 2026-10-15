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

/** `label`: the notification region's accessible name; Radix replaces `{hotkey}` in it with the focus hotkey (F8). */
export function Toaster({ label }: { label: string }) {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="w-full">
            <div className="grid w-full gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription className="w-full min-w-0">{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport label={label} />
    </ToastProvider>
  );
}
