import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@hive/ui/lib/old-profixy';
import env from '@beam-australia/react-env';

type HiveRendererContextType = {
  hiveRenderer: DefaultRenderer | undefined;
  setHiveRenderer: (hiveRenderer: DefaultRenderer) => void;
};

export const HiveRendererContext = createContext<HiveRendererContextType>({
  hiveRenderer: undefined,
  setHiveRenderer: () => {}
});

export const useHiveChainContext = () => useContext(HiveRendererContext);
export const HiveContentRendererProvider: FC<PropsWithChildren> = ({ children }) => {
  const [hiveRenderer, setHiveRenderer] = useState<DefaultRenderer | undefined>(undefined);
  const createRenderer = async () => {
    const renderer = new DefaultRenderer({
      baseUrl: 'https://hive.blog/',
      breaks: true,
      skipSanitization: false,
      allowInsecureScriptTags: false,
      addNofollowToLinks: true,
      addTargetBlankToLinks: true,
      cssClassForInternalLinks: 'link',
      cssClassForExternalLinks: 'link link-external',
      doNotShowImages: false,
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
    createRenderer();
  }, []);
  return (
    <HiveRendererContext.Provider value={{ hiveRenderer, setHiveRenderer }}>
      {children}
    </HiveRendererContext.Provider>
  );
};
