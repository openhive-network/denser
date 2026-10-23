import { getLogger } from '@ui/lib/logging';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { siteConfig } from '@ui/config/site';
import { LoginType } from '@smart-signer/types/common';
import { inIframe } from '@smart-signer/lib/utils';
import { useGetChatAuthToken } from '@smart-signer/lib/auth/use-chat-token';
import { useChatTokenRequest } from '@/blog/components/hooks/use-chat-token-request';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { ChatDrawer } from '@/blog/components/chat-drawer';
import { isEligibleForChat } from '@/blog/lib/chat-eligibility';

const logger = getLogger('app');

/**
 * Login to Rocket Chat via iframe using postMessage.
 *
 * RC has two different message formats:
 * 1. { event: 'login-with-token', loginToken } - requires Accounts_Iframe_api_url to be set
 * 2. { externalCommand: 'login-with-token', token } - requires Iframe_Integration_receive_enable
 *
 * We use externalCommand format as it:
 * - Works with just Iframe_Integration_* settings (no API URL needed)
 * - Avoids cross-origin cookie issues with API URL approach
 * - Fixed in RC 8.0.0 (PR #37829)
 *
 * @param {{ chatAuthToken: string, loginType: LoginType }} data
 * @param {React.RefObject<HTMLIFrameElement | null>} iframeRef
 */
const chatLogin = (
  data: { chatAuthToken: string; loginType: LoginType },
  iframeRef: React.RefObject<HTMLIFrameElement | null>
): void => {
  logger.info('chatLogin start');
  if (siteConfig.openhiveChatIframeIntegrationEnable) {
    logger.info('chatLogin siteConfig.openhiveChatIframeIntegrationEnable is true');
    try {
      if (data && data.chatAuthToken) {
        // Use 'externalCommand' format - works with Iframe_Integration_* settings
        // This is the recommended approach for RC 8.0.0+
        const message = {
          externalCommand: 'login-with-token',
          token: data.chatAuthToken
        };
        logger.info('chatLogin posting externalCommand message');
        iframeRef.current?.contentWindow?.postMessage(message, `${siteConfig.openhiveChatUri}`);
      } else {
        logger.warn('chatLogin not posting message, data is wrong', data);
      }
    } catch (error) {
      logger.error(data, 'chatLogin not posting message');
    }
  } else {
    logger.info('chatLogin siteConfig.openhiveChatIframeIntegrationEnable is false');
  }
};

/**
 * Logout from Rocket Chat via iframe.
 *
 * Uses externalCommand format to match chatLogin approach.
 *
 * @export
 * @param {React.RefObject<HTMLIFrameElement | null>} iframeRef
 */
export const chatLogout = (iframeRef: React.RefObject<HTMLIFrameElement | null>): void => {
  if (siteConfig.openhiveChatIframeIntegrationEnable) {
    try {
      logger.info('chatLogout posting externalCommand message');
      iframeRef.current?.contentWindow?.postMessage(
        {
          externalCommand: 'logout'
        },
        `${siteConfig.openhiveChatUri}`
      );
    } catch (error) {
      logger.error(error, 'chatLogout error');
    }
  }
};

const RocketChatWidget = () => {
  // Use layout=embedded to prevent OAuth redirect and enable postMessage login
  const iframeSrc = `${siteConfig.openhiveChatUri}/channel/general?layout=embedded`;
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const { loginType, chatAuthToken, oauthConsent } = user;
  const [badgeContent, setBadgeContent] = useState(0);
  // Enable button when we have chatAuthToken - user can open drawer to trigger iframe load
  const [disabled, setDisabled] = useState(!chatAuthToken);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const getChatAuthToken = useGetChatAuthToken();

  const onMessageReceivedFromIframe = (event: MessageEvent) => {
    //
    // See https://developer.rocket.chat/rocket.chat/iframe-integration/iframe-events
    // Warning: above documentation looks to be outdated. I noticed
    // events not mentioned there.
    //

    if (event.origin !== siteConfig.openhiveChatUri) {
      return;
    }

    logger.info('chat onMessageReceivedFromIframe event', event.origin, event.data, event);

    // Fires when iframe window's title changes. This way we replay
    // the behavior of native Rocket Chat's badge in our badge.
    if (event.data.eventName === 'unread-changed') {
      setBadgeContent(event.data.data || 0);
    }

    if (event.data.eventName === 'ready' || event.data.eventName === 'startup') {
      logger.info('Chat application is ready, chatAuthToken present: %s', !!chatAuthToken);
      setIsIframeLoaded(true);
      // If we already have the token when iframe becomes ready, login immediately
      if (chatAuthToken) {
        logger.info('Chat ready event: calling chatLogin with existing token');
        chatLogin({ chatAuthToken, loginType }, iframeRef);
      }
    }

    // User has logged in.
    if (event.data.eventName === 'Custom_Script_Logged_In') {
      // // Should not be needed, but without this chat is not in
      // // `embedded` mode sometimes. Also sometimes user is not
      // // redirected to default channel.
      // iframeRef.current.contentWindow.postMessage(
      //     {
      //         externalCommand: "go",
      //         path: "/channel/general"
      //     },
      //     `${siteConfig.openhiveChatUri}`,
      // );
      setDisabled(false);
    }

    if (event.data.event === 'login-error') {
      if (event.data.response === "You've been logged out by the server. Please log in again. [403]") {
        // TODO This is RC response for login attempt with invalid
        // token. Probably user logged out in our iframe. We should
        // obtain another, valid token from RC and try to login again.
        logger.info('We should obtain valid token and try to login with it');
        getChatAuthToken.mutateAsync().catch(logger.error);
      }
    }

    // User has logged out.
    if (event.data.eventName === 'Custom_Script_Logged_Out') {
      setOpen(false);
      setDisabled(true);
    }
  };

  // The window listener is added once; it reads the handler of the latest render
  const onMessageRef = useRef(onMessageReceivedFromIframe);
  onMessageRef.current = onMessageReceivedFromIframe;

  useEffect(() => {
    const listener = (event: MessageEvent) => onMessageRef.current(event);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  // Enable button when chatAuthToken becomes available
  useEffect(() => {
    if (chatAuthToken) {
      logger.info('RocketChatWidget: chatAuthToken available, enabling button');
      setDisabled(false);
    }
  }, [chatAuthToken]);

  // Signing out unmounts the iframe; the next one has to report it is ready again
  useEffect(() => {
    if (!user.isLoggedIn) {
      setIsIframeLoaded(false);
    }
  }, [user.isLoggedIn]);

  useEffect(() => {
    logger.info('RocketChatWidget useEffect: chatAuthToken=%s, isIframeLoaded=%s, isLoggedIn=%s',
      !!chatAuthToken, isIframeLoaded, user.isLoggedIn);

    if (chatAuthToken) {
      logger.info('RocketChatWidget: have chatAuthToken, setting loggedIn=true');
      setLoggedIn(true);
      if (isIframeLoaded) {
        logger.info('RocketChatWidget: iframe loaded, calling chatLogin');
        chatLogin({ chatAuthToken, loginType }, iframeRef);
      } else {
        logger.info('RocketChatWidget: waiting for iframe to load');
      }
    } else {
      logger.info('RocketChatWidget: no chatAuthToken');
    }
  }, [chatAuthToken, isIframeLoaded, loginType, user.isLoggedIn]);

  useChatTokenRequest(
    { isIframeLoaded, isLoggedIn: user.isLoggedIn, username: user.username, chatAuthToken },
    () => {
      logger.info('RocketChatWidget: calling getChatAuthToken API');
      getChatAuthToken.mutateAsync().catch(logger.error);
    }
  );

  const onIframeLoad = () => {
    logger.info('Chat iframe has been loaded');
  };

  const hasRCAccess = loggedIn || oauthConsent[siteConfig.openhiveChatClientId];
  const meetsCriteria =
    !inIframe() &&
    isEligibleForChat(user, {
      allowNonStrictLogin: siteConfig.openhiveChatAllowNonStrictLogin,
      allowedUsers: siteConfig.openhiveChatAllowedUsers
    }) &&
    siteConfig.openhiveChatIframeVisible;

  if (!meetsCriteria) {
    return null;
  }

  // User is eligible for chat but has no RC account yet - show link to
  // openhive.chat where they can sign up via the OAuth flow.
  if (!hasRCAccess) {
    return (
      <div className="group relative z-40 inline-flex w-fit cursor-pointer items-center justify-center">
        <TooltipProvider>
          <Tooltip>
            <div className="fixed bottom-10 right-10 block">
              <TooltipTrigger
                type="button"
                aria-label={t('chat_widget.set_up_account')}
                onClick={() =>
                  window.open(siteConfig.openhiveChatUri, '_blank', 'noopener,noreferrer')
                }
              >
                <Icons.messageSquareText className="h-12 w-12 opacity-50" />
              </TooltipTrigger>
              <TooltipContent>{t('chat_widget.set_up_account_tooltip')}</TooltipContent>
            </div>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <ChatDrawer
      open={open}
      setOpen={setOpen}
      iframeSrc={iframeSrc}
      iframeRef={iframeRef}
      onIframeLoad={onIframeLoad}
      appUrl={iframeSrc}
      disabled={disabled}
      badgeContent={loggedIn ? badgeContent : 0}
    />
  );
};

export default RocketChatWidget;
