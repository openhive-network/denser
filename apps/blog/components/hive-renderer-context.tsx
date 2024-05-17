import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@ui/lib/old-profixy';
import env from '@beam-australia/react-env';
import imageUserBlocklist from '@hive/ui/config/lists/image-user-blocklist';
import { useRouter } from 'next/router';

type HiveRendererContextType = {
  hiveRenderer: DefaultRenderer | undefined;
  setAuthor: (author: string) => void;
  setDoNotShowImages: (doNotShowImages: boolean) => void;
};

export const HiveRendererContext = createContext<HiveRendererContextType>({
  hiveRenderer: undefined,
  setAuthor: () => {},
  setDoNotShowImages: () => {}
});

export const useHiveRendererContext = () => useContext(HiveRendererContext);
export const HiveContentRendererProvider: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const [author, setAuthor] = useState<string>('');
  const [doNotShowImages, setDoNotShowImages] = useState<boolean>(false);
  const createRenderer = (author: string, doNotShowImages: boolean) => {
    const isAuthorBlocked = imageUserBlocklist.includes(author);
    const renderer = new DefaultRenderer({
      baseUrl: 'https://hive.blog/',
      breaks: true,
      skipSanitization: false,
      allowInsecureScriptTags: false,
      addNofollowToLinks: true,
      addTargetBlankToLinks: true,
      cssClassForInternalLinks: '',
      cssClassForExternalLinks: 'link-external',
      doNotShowImages: doNotShowImages || isAuthorBlocked || false,
      ipfsPrefix: '',
      assetsWidth: 640,
      assetsHeight: 480,
      imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
      usertagUrlFn: (account: string) => '/@' + account,
      hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
      isLinkSafeFn: (url: string) =>
        (!!url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) &&
          !!url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`)) ||
        !!url.match(`^(/(?!/)|#)`),
      addExternalCssClassToMatchingLinksFn: (url: string) =>
        !url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) &&
        !url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`) &&
        !url.match(`^(/(?!/)|#)`)
    });
    return renderer;
  };

  const hiveRenderer = useMemo(() => {
    return createRenderer(author, doNotShowImages);
  }, [author, doNotShowImages]);

  useLayoutEffect(() => {
    const exitingFunction = () => {
      if (doNotShowImages) {
        setDoNotShowImages(false);
      }
    };

    window.addEventListener('beforeunload', exitingFunction);
    router.events.on('routeChangeComplete', exitingFunction);

    return () => {
      window.removeEventListener('beforeunload', exitingFunction);
      router.events.off('routeChangeComplete', exitingFunction);
    };
  }, [doNotShowImages, router.events]);

  return (
    <HiveRendererContext.Provider
      value={{
        hiveRenderer,
        setAuthor,
        setDoNotShowImages
      }}
    >
      {children}
    </HiveRendererContext.Provider>
  );
};
