import { useId, type ReactNode } from 'react';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { Drawer } from '@ui/components/drawer';
import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import clsx from 'clsx';
import { useTranslation } from '@/blog/i18n/client';

interface ChatDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The chat iframe's address; no iframe is rendered without one */
  iframeSrc?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad?: () => void;
  /** Where "open chat app" leads, in a new tab; no link without one */
  appUrl: string;
  disabled?: boolean;
  /** Unread messages; no badge for 0 or none */
  badgeContent?: number;
  /** Called when the pointer enters, focuses or presses the chat button, ahead of a click */
  onButtonIntent?: () => void;
  /** The drawer's own chat client, shown when there is no iframe */
  children?: ReactNode;
}

/** The chat drawer with its iframe or client and the fixed button toggling it, for any chat server. */
export function ChatDrawer({
  open,
  setOpen,
  iframeSrc,
  iframeRef,
  onIframeLoad,
  appUrl,
  disabled = false,
  badgeContent,
  onButtonIntent,
  children
}: ChatDrawerProps) {
  const { t } = useTranslation('common_blog');
  const chatLabel = t('chat_widget.chat');
  const badgeId = useId();

  return (
    <div>
      <Drawer open={open} side="right" setOpen={setOpen}>
        {iframeSrc ? (
          <iframe
            id="chat-iframe"
            src={iframeSrc}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            title={chatLabel}
            ref={iframeRef}
            onLoad={onIframeLoad}
            // Loaded in the closed drawer, off-screen at its size: out of reach until it opens
            aria-hidden={!open}
            tabIndex={open ? undefined : -1}
            inert={!open}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col" aria-hidden={!open} inert={!open}>
            {children}
          </div>
        )}

        <div className="flex">
          {/* Button closing drawer */}
          <Button
            className="flex-1 hover:text-red-600"
            variant="outline"
            size="sm"
            title={t('chat_widget.close_widget')}
            aria-label={t('chat_widget.close_widget')}
            onClick={() => setOpen(false)}
          >
            <Icons.close />
          </Button>

          {/* Link to open chat app in new tab */}
          {appUrl ? (
            <Link
              href={appUrl}
              className="px-4 hover:cursor-pointer hover:text-red-600"
              aria-label={t('chat_widget.open_app')}
              title={t('chat_widget.open_app')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.externalLink />
            </Link>
          ) : null}
        </div>
      </Drawer>

      {/* Drawer toggler */}
      <div className="group relative z-40 inline-flex w-fit cursor-pointer items-center justify-center">
        <TooltipProvider>
          <Tooltip>
            <div className="fixed bottom-10 right-10 block">
              <TooltipTrigger
                type="button"
                aria-label={t('chat_widget.open_widget')}
                aria-describedby={badgeContent ? badgeId : undefined}
                onClick={() => setOpen(!open)}
                onPointerEnter={onButtonIntent}
                onFocus={onButtonIntent}
                onPointerDown={onButtonIntent}
                disabled={disabled}
              >
                <Icons.messageSquareText className={clsx('h-12 w-12', { 'opacity-25': disabled })} />
              </TooltipTrigger>

              {/* Badge showing unread messages */}
              {badgeContent ? (
                <div
                  id={badgeId}
                  data-testid="chat-unread-badge"
                  className="absolute bottom-auto left-auto right-0 top-0.5 z-50 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-red-600 px-1.5 py-1 text-center align-baseline text-xs font-bold leading-none text-white">
                  <span aria-hidden>{badgeContent}</span>
                  <span className="sr-only">{t('chat_widget.unread_count', { number: badgeContent })}</span>
                </div>
              ) : null}
            </div>
            <TooltipContent>{chatLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
