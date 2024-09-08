import { getLogger } from '@ui/lib/logging';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { Drawer } from '@ui/components/drawer';
import { useState, useRef, useEffect } from 'react';
import { siteConfig } from '@ui/config/site';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { LoginType } from '@smart-signer/types/common';
import Link from 'next/link';
import { Button } from '@ui/components/button';
import { inIframe } from '@smart-signer/lib/utils';
import clsx from 'clsx';
import { useGetChatAuthToken } from "@smart-signer/lib/auth/use-chat-token";

const logger = getLogger('app');

/**
 * Login to Rocket Chat via iframe.
 *
 * @param {{ chatAuthToken: string, loginType: LoginType }} data
 * @param {React.RefObject<HTMLIFrameElement>} iframeRef
 */
const chatLogin = (
  data: { chatAuthToken: string; loginType: LoginType },
  iframeRef: React.RefObject<HTMLIFrameElement>
): void => {
  logger.info('chatLogin start');
  if (siteConfig.openhiveChatIframeIntegrationEnable) {
    logger.info('chatLogin siteConfig.openhiveChatIframeIntegrationEnable is true');
    try {
      if (data && data.chatAuthToken) {
        const message = {
          event: 'login-with-token',
          loginToken: data.chatAuthToken,
          loginType: data.loginType || 'login'
        };
        logger.info('chatLogin posting message', message, data);
        iframeRef.current?.contentWindow?.postMessage({ ...message }, `${siteConfig.openhiveChatUri}`);
      } else {
        logger.warn('chatLogin not posting message, data is wrong', data);
      }
    } catch (error) {
      logger.error('chatLogin not posting message', data);
    }
  } else {
    logger.info('chatLogin siteConfig.openhiveChatIframeIntegrationEnable is false');
  }
};

/**
 * Logout from Rocket Chat via iframe.
 *
 * @export
 * @param {React.RefObject<HTMLIFrameElement>} iframeRef
 */
export const chatLogout = (iframeRef: React.RefObject<HTMLIFrameElement>): void => {
  if (siteConfig.openhiveChatIframeIntegrationEnable) {
    try {
      logger.info('chatLogout posting message');
      iframeRef.current?.contentWindow?.postMessage(
        {
          externalCommand: 'logout'
        },
        `${siteConfig.openhiveChatUri}`
      );
    } catch (error) {
      logger.error('chatLogout error', error);
    }
  }
};

const RocketChatWidget = () => {
  const iframeSrc = `${siteConfig.openhiveChatUri}/channel/general`;
  const iframeTitle = 'Chat';
  const tooltip = 'Chat';
  const { user } = useUser();
  const { loginType, chatAuthToken, oauthConsent } = user;
  const [init, setInit] = useState(true);
  const [badgeContent, setBadgeContent] = useState(0);
  const [disabled, setDisabled] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const iframeRef = useRef(null);
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

    if (event.data.eventName === 'ready') {
      logger.info('Chat application is ready');
      setIsIframeLoaded(true);
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


  const removeIframeListener = () => {
    window.removeEventListener('message', onMessageReceivedFromIframe);
  };

  useEffect(() => {
    const addIframeListener = () => {
      window.addEventListener('message', onMessageReceivedFromIframe);
    };

    // `init` is true when component operates on initial, default
    // values.
    if (!init) {
      if (chatAuthToken) {
        setLoggedIn(true);
        if (isIframeLoaded) {
          chatLogin({ chatAuthToken, loginType }, iframeRef);
        }
      } else {
        if (isIframeLoaded && user.isLoggedIn) {
          getChatAuthToken.mutateAsync().catch(logger.error);
          // chatLogout(iframeRef);
        }
      }
    } else {
      addIframeListener();
      setInit(false);
    }
  }, [chatAuthToken, init, isIframeLoaded, loginType]);

  const onIframeLoad = () => {
    logger.info('Chat iframe has been loaded');
    return () => {
      removeIframeListener();
    };
  };

  return (
    <>
      {!inIframe()
        && user.isLoggedIn
        && (user.strict || siteConfig.openhiveChatAllowNonStrictLogin)
        && (loggedIn || oauthConsent[siteConfig.openhiveChatClientId])
        && (

        <div
          style={{
              ...{
                  display: siteConfig.openhiveChatIframeVisible
                  ? 'block'
                  : 'none'
              },
          }}
        >

          <Drawer open={open} side="right" setOpen={setOpen}>
            {/* Rocket Chat iframe */}
            <iframe
              id="chat-iframe"
              src={iframeSrc}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
              title={iframeTitle}
              ref={iframeRef}
              onLoad={onIframeLoad}
            />

            <div className="flex">
              {/* Button closing drawer */}
              <Button
                className="hover:text-red-600 flex-1"
                variant="outline"
                size="sm"
                title="Close Chat Widget"
                aria-label="Close Chat Widget"
                onClick={() => setOpen(false)}
              >
                <Icons.close />
              </Button>

              {/* Link to open chat app in new tab */}
              <Link
                href={iframeSrc}
                className="hover:cursor-pointer hover:text-red-600 px-4"
                aria-label="Open Chat App"
                title="Open Chat App"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icons.externalLink />
              </Link>
            </div>

          </Drawer>

          {/* Drawer toggler */}
          <div className="z-40 group relative inline-flex w-fit cursor-pointer items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <div className="fixed bottom-10 right-10 block">
                  <TooltipTrigger
                    type="button"
                    aria-label="Open Chat Widget"
                    onClick={() => setOpen(!open)}
                    disabled={disabled}
                  >
                    <Icons.messageSquareText
                      className={clsx(
                        "h-12 w-12",
                        { "opacity-25": disabled }
                      )}
                    />
                  </TooltipTrigger>

                  {/* Badge showing unread messages */}
                  {loggedIn && badgeContent !== 0 ? (
                    <div className="absolute bottom-auto left-auto right-0 top-0.5 z-50 inline-block -translate-y-1/2 translate-x-2/4 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 whitespace-nowrap rounded-full bg-red-600 px-1.5 py-1 text-center align-baseline text-xs font-bold leading-none text-white">
                      {badgeContent}
                    </div>
                  ) : null}

                </div>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

        </div>
      )}
    </>
  );
};

export default RocketChatWidget;
