import { useEffect, useLayoutEffect, useRef, type UIEvent } from 'react';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import type { ChatMessageView, ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import type { BackPaginationState } from '@/blog/features/matrix-chat/lib/back-pagination';
import type { OutgoingMessage } from '@/blog/features/matrix-chat/lib/outbox';
import { ChatMessageItem } from '@/blog/features/matrix-chat/components/chat-message-item';

/** How close to the top scrolling back starts loading older messages, and to the bottom new ones follow */
const SCROLL_EDGE_PX = 48;

interface ChatTimelineProps {
  session: ChatSession;
  messages: ChatMessageView[];
  pending: OutgoingMessage[];
  pagination: BackPaginationState;
  loadOlder: () => void;
  retry: (message: OutgoingMessage) => void;
  appUrl: string;
}

function OutgoingItem({ message, retry }: { message: OutgoingMessage; retry: (message: OutgoingMessage) => void }) {
  const { t } = useTranslation('common_blog');
  return (
    <li className="px-2 py-1.5 pl-12 text-sm" data-testid="chat-outgoing" data-status={message.status}>
      <p className="whitespace-pre-wrap break-words">{message.text}</p>
      {message.status === 'failed' ? (
        <p className="flex items-center gap-2 text-xs text-destructive" role="alert">
          {t('chat_widget.send_failed')}
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => retry(message)}>
            {t('chat_widget.retry')}
          </Button>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t('chat_widget.sending')}</p>
      )}
    </li>
  );
}

function HistoryControl({ pagination, loadOlder }: Pick<ChatTimelineProps, 'pagination' | 'loadOlder'>) {
  const { t } = useTranslation('common_blog');
  if (!pagination.hasMore) {
    return <p className="py-2 text-center text-xs text-muted-foreground">{t('chat_widget.history_start')}</p>;
  }
  if (pagination.loading) {
    return (
      <p className="py-2 text-center text-xs text-muted-foreground" role="status">
        {t('chat_widget.loading_older')}
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center py-1 text-xs">
      {pagination.failed ? <p className="text-destructive">{t('chat_widget.load_older_failed')}</p> : null}
      <Button variant="link" size="sm" className="h-auto py-1 text-xs" onClick={loadOlder}>
        {t('chat_widget.load_older')}
      </Button>
    </div>
  );
}

/**
 * A room's messages, oldest first, followed by what the composer is sending. Scrolling to the
 * top loads older messages, keeping the ones in view where they are; new messages follow while
 * the timeline is scrolled to its end.
 */
export function ChatTimeline(props: ChatTimelineProps) {
  const { session, messages, pending, pagination, loadOlder, retry, appUrl } = props;
  const { t } = useTranslation('common_blog');
  const scroller = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  const before = useRef({ firstId: '', height: 0 });
  const firstId = messages[0]?.eventId ?? '';

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (before.current.firstId && before.current.firstId !== firstId && !atEnd.current) {
      // Older messages came in above: keep the ones in view where they were
      element.scrollTop += element.scrollHeight - before.current.height;
    } else if (atEnd.current) {
      element.scrollTop = element.scrollHeight;
    }
    before.current = { firstId, height: element.scrollHeight };
  }, [firstId, messages, pending]);

  useEffect(() => {
    // A short history fills no scroll: nothing scrolls up to ask for more
    const element = scroller.current;
    if (element && element.scrollHeight <= element.clientHeight && pagination.hasMore && !pagination.failed) {
      loadOlder();
    }
  }, [messages, pagination.hasMore, pagination.failed, loadOlder]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    atEnd.current = element.scrollHeight - element.scrollTop - element.clientHeight < SCROLL_EDGE_PX;
    if (element.scrollTop < SCROLL_EDGE_PX) loadOlder();
  };

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto" onScroll={onScroll} data-testid="chat-timeline">
      <HistoryControl pagination={pagination} loadOlder={loadOlder} />
      <ol role="log" aria-live="polite" aria-label={t('chat_widget.messages')}>
        {messages.map((message) => (
          <ChatMessageItem key={message.eventId} session={session} message={message} appUrl={appUrl} />
        ))}
        {pending.map((message) => (
          <OutgoingItem key={message.txnId} message={message} retry={retry} />
        ))}
      </ol>
    </div>
  );
}
