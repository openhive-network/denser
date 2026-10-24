import sanitizeHtml from 'sanitize-html';
import type { ChatMessageContent, ChatMessageView } from './chat-view-types.ts';

/** A timeline event, as the session reads it from the SDK */
export interface ChatEventInput {
  eventId: string;
  type: string;
  sender: string;
  senderName: string;
  avatarMxc: string | null;
  timestamp: number;
  content: Record<string, unknown>;
  isState: boolean;
  redacted: boolean;
}

const HTML_FORMAT = 'org.matrix.custom.html';
const TEXT_MSGTYPES: ReadonlySet<string> = new Set(['m.text', 'm.notice', 'm.emote']);
/** Events that change other events or carry no message: not shown, nor as a placeholder */
const HIDDEN_TYPES: ReadonlySet<string> = new Set(['m.reaction', 'm.room.redaction']);

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike', 'sub', 'sup',
    'code', 'pre', 'blockquote', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'span'
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  // The reply fallback quotes the replied-to message; the drawer shows the reply alone
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'mx-reply'],
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } })
  }
};

const stringField = (content: Record<string, unknown>, key: string): string | undefined => {
  const value = content[key];
  return typeof value === 'string' ? value : undefined;
};

function relationOf(content: Record<string, unknown>): Record<string, unknown> | undefined {
  const relation = content['m.relates_to'];
  return typeof relation === 'object' && relation !== null ? { ...relation } : undefined;
}

/** The plain body of a reply without its fallback: the `> ` lines quoting the replied-to message */
function withoutReplyFallback(body: string, content: Record<string, unknown>): string {
  if (!relationOf(content)?.['m.in_reply_to']) return body;
  const lines = body.split('\n');
  let start = 0;
  while (start < lines.length && lines[start].startsWith('>')) start++;
  if (start === 0) return body;
  if (lines[start] === '') start++;
  return lines.slice(start).join('\n');
}

/** HTML a message may show: the sanitizer's tags, links opening apart from the page */
export function sanitizeMessageHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}

function textMessageContent(content: Record<string, unknown>): ChatMessageContent | null {
  const body = stringField(content, 'body');
  if (body === undefined) return null;
  const formatted = stringField(content, 'formatted_body');
  if (stringField(content, 'format') === HTML_FORMAT && formatted !== undefined) {
    const html = sanitizeMessageHtml(formatted);
    if (html) return { kind: 'html', html };
  }
  return { kind: 'text', text: withoutReplyFallback(body, content) };
}

function contentOf(event: ChatEventInput): ChatMessageContent {
  if (event.type === 'm.room.encrypted') return { kind: 'encrypted' };
  if (event.type !== 'm.room.message') return { kind: 'unsupported' };
  const msgtype = stringField(event.content, 'msgtype');
  const text = msgtype && TEXT_MSGTYPES.has(msgtype) ? textMessageContent(event.content) : null;
  return text ?? { kind: 'unsupported' };
}

/**
 * What the drawer shows of a timeline event, or null for one it leaves out: state events,
 * redacted messages, reactions, redactions and edits (the SDK shows an edit in its original).
 */
export function toMessageView(event: ChatEventInput): ChatMessageView | null {
  if (event.isState || event.redacted || HIDDEN_TYPES.has(event.type)) return null;
  if (relationOf(event.content)?.rel_type === 'm.replace') return null;
  return {
    eventId: event.eventId,
    senderId: event.sender,
    senderName: event.senderName || event.sender,
    avatarMxc: event.avatarMxc,
    timestamp: event.timestamp,
    emote: stringField(event.content, 'msgtype') === 'm.emote',
    content: contentOf(event)
  };
}
