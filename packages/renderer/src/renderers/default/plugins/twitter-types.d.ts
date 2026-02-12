interface TwitterWidgets {
  createTweet?: (
    id: string,
    el: HTMLElement,
    options?: Record<string, string>
  ) => Promise<HTMLElement | undefined>;
  load?: (el?: HTMLElement) => void;
}

interface TwitterApi {
  widgets?: TwitterWidgets;
  ready?: (callback: () => void) => void;
}

declare global {
  interface Window {
    twttr?: TwitterApi;
  }
}

export {};
