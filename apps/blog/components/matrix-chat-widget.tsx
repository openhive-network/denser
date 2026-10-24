import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { siteConfig } from '@ui/config/site';
import { matrixSessionPageUrl, matrixUserId, originOf } from '@ui/config/chat';
import { ChatDrawer } from '@/blog/components/chat-drawer';
import { useTranslation } from '@/blog/i18n/client';
import { useChatWarmUp, useMatrixChatUser } from '@/blog/components/hooks/use-matrix-chat-drawer';
import { useMatrixLoginTokenAnswer } from '@/blog/components/hooks/use-matrix-login-token-answer';

const HIDDEN_FRAME_STYLE = { display: 'none' } as const;

/**
 * Element (Matrix) in the chat drawer. Its iframe starts at the session page on Element's origin,
 * which signs the current user in unless Element already holds their session: with a login token
 * it asks this widget for, which denser's server mints and the widget posts to Element's origin
 * without keeping it, or else through SSO via denser's OAuth server. Element posts no
 * unread count to its parent, so there is no badge.
 *
 * Element keeps its session in its own origin's storage: when the chat user signs out or another
 * account becomes current, the session page is loaded without a user, which ends that session.
 *
 * Element follows denser's resolved theme: the session page sets it in Element, and a change of
 * theme loads the session page again, which keeps the session of the same user.
 *
 * Element is warmed up in the closed drawer, as `siteConfig.matrixChat.preload` says, so that
 * the first opening shows it already signed in: the iframe stays where it is, off-screen with the
 * drawer, and opening only slides it in. No idle warm-up under Save-Data, nor after this page
 * ended a session, which the next user's session page must not race; intent still loads.
 */
const MatrixChatWidget = () => {
  const { t } = useTranslation('common_blog');
  // Undefined until next-themes knows it on the client
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [sessionEnds, setSessionEnds] = useState(0);
  const chatUserRef = useRef('');
  const frameRef = useRef<HTMLIFrameElement>(null);

  const matrix = siteConfig.matrixChat;
  const chatUser = useMatrixChatUser(!!matrix.elementUrl);
  const { reset: resetWarmUp, ...warmUp } = useChatWarmUp(matrix.preload, sessionEnds === 0);
  useMatrixLoginTokenAnswer(frameRef, originOf(matrix.elementUrl), chatUser ? matrixUserId(chatUser, matrix) : '');

  useEffect(() => {
    const previous = chatUserRef.current;
    chatUserRef.current = chatUser;
    if (!previous || previous === chatUser) return;
    setOpen(false);
    resetWarmUp();
    setSessionEnds((count) => count + 1);
  }, [chatUser, resetWarmUp]);

  const toggle = (next: boolean) => {
    if (next) warmUp.request();
    setOpen(next);
  };

  const sessionEnd =
    sessionEnds > 0 ? (
      <iframe
        key={sessionEnds}
        src={matrixSessionPageUrl(matrix)}
        title={t('chat_widget.chat')}
        style={HIDDEN_FRAME_STYLE}
        aria-hidden
        tabIndex={-1}
      />
    ) : null;

  if (!chatUser) return sessionEnd;

  const sessionPage = matrixSessionPageUrl(matrix, chatUser, resolvedTheme);
  return (
    <>
      {sessionEnd}
      <ChatDrawer
        open={open}
        setOpen={toggle}
        iframeSrc={warmUp.warm && resolvedTheme ? sessionPage : undefined}
        iframeRef={frameRef}
        appUrl={sessionPage}
        onButtonIntent={warmUp.requestOnIntent}
      />
    </>
  );
};

export default MatrixChatWidget;
