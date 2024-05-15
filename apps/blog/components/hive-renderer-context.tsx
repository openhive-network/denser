import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { RendererOptions } from '@hiveio/content-renderer/dist/renderers/default/DefaultRenderer';
import { getDoubleSize, proxifyImageUrl } from '@ui/lib/old-profixy';
import env from '@beam-australia/react-env';
import imageUserBlocklist from '@hive/ui/config/lists/image-user-blocklist';

type HiveRendererContextType = {
  hiveRenderer: DefaultRenderer | undefined;
  setHiveRenderer: (hiveRenderer: DefaultRenderer) => void;
  setAuthor: (author: string) => void;
  setDoNotShowImages: (doNotShowImages: boolean) => void;
};

export const HiveRendererContext = createContext<HiveRendererContextType>({
  hiveRenderer: undefined,
  setHiveRenderer: () => {},
  setAuthor: () => {},
  setDoNotShowImages: () => {},
});

export const useHiveRendererContext = () => useContext(HiveRendererContext);
export const HiveContentRendererProvider: FC<PropsWithChildren> = ({ children }) => {
  const [hiveRenderer, setHiveRenderer] = useState<DefaultRenderer | undefined>(undefined);
  const [author, setAuthor] = useState<string>('');
  const [doNotShowImages, setDoNotShowImages] = useState<boolean>(false);
  const createRenderer = async (author: string, doNotShowImages: boolean) => {
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
      doNotShowImages: doNotShowImages || isAuthorBlocked,
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
    setHiveRenderer(renderer);
  };

  useEffect(() => {
    createRenderer(author, doNotShowImages);
  }, [author, doNotShowImages]);

  return (
    <HiveRendererContext.Provider value={{
      hiveRenderer, setHiveRenderer, setAuthor, setDoNotShowImages
    }}>
      {children}
    </HiveRendererContext.Provider>
  );
};
