import dynamic from 'next/dynamic';
import { siteConfig } from '@ui/config/site';
import RocketChatWidget from '@/blog/components/rocket-chat-widget';

// Chunks of their own: they render nothing until the client knows the user, and only Matrix mode
// needs one of them
const MatrixChatWidget = dynamic(() => import('@/blog/components/matrix-chat-widget'), { ssr: false });
const MatrixNativeChatWidget = dynamic(() => import('@/blog/components/matrix-native-chat-widget'), { ssr: false });

/** The chat widget of the configured chat server, and for Matrix of the configured client. */
const ChatWidget = () => {
  if (siteConfig.chatProvider !== 'matrix') return <RocketChatWidget />;
  return siteConfig.matrixChat.client === 'element' ? <MatrixChatWidget /> : <MatrixNativeChatWidget />;
};

export default ChatWidget;
