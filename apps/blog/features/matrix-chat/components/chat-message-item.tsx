import { useTranslation } from '@/blog/i18n/client';
import type { ChatMessageContent, ChatMessageView, ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import { linkify } from '@/blog/features/matrix-chat/lib/linkify';
import { useAvatarUrl } from '@/blog/features/matrix-chat/hooks/use-avatar-url';
import { ChatPlaceholder } from '@/blog/features/matrix-chat/components/chat-placeholder';

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const LINK_CLASS = 'text-destructive underline break-all';

function SenderAvatar({ session, mxc, name }: { session: ChatSession; mxc: string | null; name: string }) {
  const url = useAvatarUrl(session, mxc);
  if (url) {
    // An object URL of the homeserver's thumbnail, which next/image cannot load
    return <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground"
    >
      {name.replace(/^@/, '').charAt(0)}
    </span>
  );
}

function LinkifiedText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {linkify(text).map((segment, index) =>
        segment.href ? (
          <a key={index} href={segment.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {segment.text}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </p>
  );
}

function MessageContent({ content, appUrl }: { content: ChatMessageContent; appUrl: string }) {
  const { t } = useTranslation('common_blog');
  switch (content.kind) {
    case 'text':
      return <LinkifiedText text={content.text} />;
    case 'html':
      return (
        <div
          className="break-words [&_a]:text-destructive [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-2 [&_code]:font-mono [&_pre]:overflow-x-auto"
          // Sanitized by sanitizeMessageHtml: formatting tags and http(s)/mailto links only
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      );
    case 'encrypted':
      return <ChatPlaceholder text={t('chat_widget.encrypted_message')} appUrl={appUrl} />;
    default:
      return <ChatPlaceholder text={t('chat_widget.unsupported_message')} appUrl={appUrl} />;
  }
}

interface ChatMessageItemProps {
  session: ChatSession;
  message: ChatMessageView;
  /** Element, for what the drawer cannot show */
  appUrl: string;
}

/** One message of the timeline: who sent it and when, and what it says. */
export function ChatMessageItem({ session, message, appUrl }: ChatMessageItemProps) {
  const time = new Date(message.timestamp);
  return (
    <li className="flex gap-2 px-2 py-1.5" data-testid="chat-message" data-event-id={message.eventId}>
      <SenderAvatar session={session} mxc={message.avatarMxc} name={message.senderName} />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-semibold" title={message.senderId}>
            {message.senderName}
          </span>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={time.toISOString()}>
            {time.toLocaleTimeString([], TIME_FORMAT)}
          </time>
        </div>
        {message.emote ? <span className="italic">* {message.senderName} </span> : null}
        <MessageContent content={message.content} appUrl={appUrl} />
      </div>
    </li>
  );
}
