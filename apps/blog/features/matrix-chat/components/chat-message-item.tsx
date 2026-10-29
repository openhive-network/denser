import { useTranslation } from '@/blog/i18n/client';
import type { ChatMessageContent, ChatMessageView, ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import { linkify } from '@/blog/features/matrix-chat/lib/linkify';
import { ChatPlaceholder } from '@/blog/features/matrix-chat/components/chat-placeholder';
import { ChatMessageFrame } from '@/blog/features/matrix-chat/components/chat-message-frame';

const LINK_CLASS = 'text-destructive underline break-all';

function LinkifiedText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap wrap-break-word">
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
          className="wrap-break-word [&_a]:text-destructive [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-2 [&_code]:font-mono [&_pre]:overflow-x-auto"
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
  return (
    <li className="flex gap-2 px-2 py-1.5" data-testid="chat-message" data-event-id={message.eventId}>
      <ChatMessageFrame
        session={session}
        senderId={message.senderId}
        senderName={message.senderName}
        avatarMxc={message.avatarMxc}
        timestamp={message.timestamp}
      >
        {message.emote ? <span className="italic">* {message.senderName} </span> : null}
        <MessageContent content={message.content} appUrl={appUrl} />
      </ChatMessageFrame>
    </li>
  );
}
