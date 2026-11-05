import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { siteConfig } from '@ui/config/site';
import { matrixSessionPageUrl, matrixUserId } from '@ui/config/chat';
import { ChatDrawer } from '@/blog/components/chat-drawer';
import { useChatWarmUp, useMatrixChatUser } from '@/blog/components/hooks/use-matrix-chat-drawer';
import { useMatrixChatSession } from '@/blog/features/matrix-chat/hooks/use-matrix-chat-session';
import { useChatSessionVersion } from '@/blog/features/matrix-chat/hooks/use-chat-session-version';
import { useDisplayNameSync } from '@/blog/features/matrix-chat/hooks/use-display-name-sync';

const MatrixChatPanel = dynamic(() => import('@/blog/features/matrix-chat/components/matrix-chat-panel'), {
  ssr: false
});

/**
 * denser's own Matrix client in the chat drawer. Its code, matrix-js-sdk with no crypto, loads
 * when the drawer warms up (`siteConfig.matrixChat.preload`, as Element's iframe does) or opens;
 * it then signs the user in with a login token denser's server mints and syncs, so the chat
 * button shows the unread count. The rooms and timeline render on the first opening. Only the
 * first opening may create the user's Matrix account: a warm-up signs in an existing one only.
 *
 * Sign-out, an account switch or the end of denser's session ends the Matrix session: the client
 * stops and its device is signed out. After an account switch there is no idle warm-up: the next
 * account signs in on intent or opening only, so switching through accounts mints no login token
 * for those switched away from. Element stays available as the full chat app.
 */
const MatrixNativeChatWidget = () => {
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [switched, setSwitched] = useState(false);
  const chatUserRef = useRef('');

  const matrix = siteConfig.matrixChat;
  const chatUser = useMatrixChatUser(!!matrix.homeserverUrl);
  const { reset: resetWarmUp, ...warmUp } = useChatWarmUp(matrix.preload, !switched);
  const { status, session, retry } = useMatrixChatSession({
    userId: chatUser ? matrixUserId(chatUser, matrix) : '',
    start: warmUp.warm,
    createAccount: opened,
    homeserverUrl: matrix.homeserverUrl,
    defaultRoom: matrix.defaultRoom
  });
  useChatSessionVersion(session);
  useDisplayNameSync(session, chatUser);

  useEffect(() => {
    const previous = chatUserRef.current;
    chatUserRef.current = chatUser;
    if (!previous || previous === chatUser) return;
    setOpen(false);
    setOpened(false);
    setSwitched(true);
    resetWarmUp();
  }, [chatUser, resetWarmUp]);

  if (!chatUser) return null;

  const toggle = (next: boolean) => {
    if (next) {
      warmUp.request();
      setOpened(true);
    }
    setOpen(next);
  };

  const appUrl = matrix.elementUrl ? matrixSessionPageUrl(matrix, chatUser, resolvedTheme) : '';
  return (
    <ChatDrawer
      open={open}
      setOpen={toggle}
      appUrl={appUrl}
      badgeContent={session?.unreadCount()}
      onButtonIntent={warmUp.requestOnIntent}
    >
      {opened ? <MatrixChatPanel status={status} session={session} retry={retry} open={open} appUrl={appUrl} /> : null}
    </ChatDrawer>
  );
};

export default MatrixNativeChatWidget;
