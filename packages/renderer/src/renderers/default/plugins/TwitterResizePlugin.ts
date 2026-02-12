/// <reference path="./twitter-types.d.ts" />
import type { RendererPlugin } from "./RendererPlugin";

const WIDGETS_JS_URL = "https://platform.twitter.com/widgets.js";
const TWEET_ID_REGEX = /[?&]id=(\d+)/;
const LOAD_TIMEOUT_MS = 10_000;

/**
 * Plugin that replaces Twitter embed iframes with native Twitter widgets.
 * On mount, finds all .twitterWrapper iframes, extracts tweet IDs,
 * loads Twitter's widgets.js and renders tweets via twttr.widgets.createTweet().
 * This gives proper auto-sizing that iframe-only approach cannot achieve
 * (platform.twitter.com/embed/Tweet.html does not send postMessage with height).
 */
export class TwitterResizePlugin implements RendererPlugin {
  name = "twitter-resize";

  private scriptLoading = false;

  private isWidgetsReady(): boolean {
    return typeof window.twttr?.widgets?.createTweet === "function";
  }

  private loadWidgetsJs(): { promise: Promise<void>; cancel: () => void } {
    if (this.isWidgetsReady()) {
      return {
        promise: Promise.resolve(),
        cancel: () => {},
      };
    }

    let aborted = false;
    let resolve_fn: (() => void) | null = null;
    const timeout_ids: ReturnType<typeof setTimeout>[] = [];

    const cancel = () => {
      aborted = true;
      timeout_ids.forEach((id) => clearTimeout(id));
      timeout_ids.length = 0;
      this.scriptLoading = false;
      if (resolve_fn) resolve_fn();
    };

    if (this.scriptLoading) {
      const promise = new Promise<void>((resolve) => {
        resolve_fn = resolve;
        const started = Date.now();
        const check = () => {
          if (aborted || this.isWidgetsReady()) {
            resolve();
            return;
          }
          if (Date.now() - started > LOAD_TIMEOUT_MS) {
            resolve();
            return;
          }
          const timeout_id = setTimeout(check, 100);
          timeout_ids.push(timeout_id);
        };
        check();
      });
      return { promise, cancel };
    }

    this.scriptLoading = true;

    const promise = new Promise<void>((resolve) => {
      resolve_fn = resolve;
      const script = document.createElement("script");
      script.src = WIDGETS_JS_URL;
      script.async = true;

      const main_timeout_id = setTimeout(() => {
        if (aborted) return;
        this.scriptLoading = false;
        resolve();
      }, LOAD_TIMEOUT_MS);
      timeout_ids.push(main_timeout_id);

      script.onerror = () => {
        if (aborted) return;
        clearTimeout(main_timeout_id);
        this.scriptLoading = false;
        resolve();
      };

      script.onload = () => {
        const started = Date.now();
        const check = () => {
          if (aborted) {
            clearTimeout(main_timeout_id);
            resolve();
            return;
          }
          if (this.isWidgetsReady()) {
            clearTimeout(main_timeout_id);
            resolve();
            return;
          }
          if (Date.now() - started > LOAD_TIMEOUT_MS) {
            clearTimeout(main_timeout_id);
            this.scriptLoading = false;
            resolve();
            return;
          }
          const timeout_id = setTimeout(check, 50);
          timeout_ids.push(timeout_id);
        };
        check();
      };

      document.head.appendChild(script);
    });

    return { promise, cancel };
  }

  onMount = (rootElement: HTMLElement): (() => void) | undefined => {
    if (typeof window === "undefined") return undefined;

    const wrappers = rootElement.querySelectorAll(".twitterWrapper");
    if (wrappers.length === 0) return undefined;

    let cancelled = false;
    let cancel_loading: (() => void) | null = null;

    const renderTweets = async () => {
      const load_result = this.loadWidgetsJs();
      cancel_loading = load_result.cancel;

      await load_result.promise;
      if (cancelled) return;

      if (!this.isWidgetsReady()) return;

      const wrapper_list = Array.from(wrappers);
      for (let i = 0; i < wrapper_list.length; i++) {
        if (cancelled) return;
        const wrapper = wrapper_list[i];
        if (!(wrapper instanceof HTMLElement)) continue;
        const iframe = wrapper.querySelector("iframe");
        if (!iframe) continue;

        const src = iframe.getAttribute("src") ?? "";
        const match = src.match(TWEET_ID_REGEX);
        if (!match?.[1]) continue;

        const tweet_id = match[1];
        const is_dark_mode = wrapper.closest(".dark") !== null;

        iframe.style.display = "none";

        const result = await window.twttr?.widgets?.createTweet?.(
          tweet_id,
          wrapper,
          { theme: is_dark_mode ? "dark" : "light" }
        );

        if (cancelled) return;

        if (result !== undefined) {
          iframe.remove();
        } else {
          iframe.style.display = "";
        }
      }
    };

    renderTweets();

    return () => {
      cancelled = true;
      if (cancel_loading) cancel_loading();
    };
  };
}
