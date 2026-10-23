import { useEffect, useRef, useState } from 'react';
import { siteConfig } from '@ui/config/site';
import { matrixSessionPageUrl } from '@ui/config/chat';
import { inIframe } from '@smart-signer/lib/utils';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { ChatDrawer } from '@/blog/components/chat-drawer';
import { isEligibleForChat } from '@/blog/lib/chat-eligibility';
import { useTranslation } from '@/blog/i18n/client';

const HIDDEN_FRAME_STYLE = { display: 'none' } as const;

/**
 * Element (Matrix) in the chat drawer. Its iframe starts at the session page on Element's origin,
 * which signs the current user in through SSO via denser's OAuth server unless Element already
 * holds their session, so denser's browser code holds no Matrix credentials. Element posts no
 * unread count to its parent, so there is no badge.
 *
 * Element keeps its session in its own origin's storage: when the chat user signs out or another
 * account becomes current, the session page is loaded without a user, which ends that session.
 */
const MatrixChatWidget = () => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const [open, setOpen] = useState(false);
  // Element loads on the first opening of the drawer, not on every page view
  const [opened, setOpened] = useState(false);
  const [sessionEnds, setSessionEnds] = useState(0);
  const chatUserRef = useRef('');

  const matrix = siteConfig.matrixChat;
  const eligible =
    !!matrix.elementUrl &&
    // The SSO authorizes only a user the server signed in
    user.authenticateOnBackend &&
    isEligibleForChat(user, {
      allowNonStrictLogin: siteConfig.openhiveChatAllowNonStrictLogin,
      allowedUsers: siteConfig.openhiveChatAllowedUsers
    }) &&
    !inIframe();
  const chatUser = eligible ? user.username : '';

  useEffect(() => {
    const previous = chatUserRef.current;
    chatUserRef.current = chatUser;
    if (!previous || previous === chatUser) return;
    setOpen(false);
    setOpened(false);
    setSessionEnds((count) => count + 1);
  }, [chatUser]);

  const toggle = (next: boolean) => {
    if (next) setOpened(true);
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

  const sessionPage = matrixSessionPageUrl(matrix, chatUser);
  return (
    <>
      {sessionEnd}
      <ChatDrawer open={open} setOpen={toggle} iframeSrc={opened ? sessionPage : undefined} appUrl={sessionPage} />
    </>
  );
};

export default MatrixChatWidget;
