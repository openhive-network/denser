import { siteConfig } from '@ui/config/site';
import MatrixChatWidget from '@/blog/components/matrix-chat-widget';
import RocketChatWidget from '@/blog/components/rocket-chat-widget';

/** The chat widget of the configured chat server. */
const ChatWidget = () => (siteConfig.chatProvider === 'matrix' ? <MatrixChatWidget /> : <RocketChatWidget />);

export default ChatWidget;
