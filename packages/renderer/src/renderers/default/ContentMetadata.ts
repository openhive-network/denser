import {Remarkable} from 'remarkable';
import {HtmlDOMParser} from './embedder/HtmlDOMParser';

/** What a body references, in order of first appearance; tags and account names lowercased. */
export interface ContentMetadata {
    hashtags: string[];
    usertags: string[];
    images: string[];
    links: string[];
}

// Extraction never mutates the document, so the URL builders and asset sizes are never used.
const EXTRACTION_OPTIONS = {
    width: 640,
    height: 480,
    hideImages: false,
    baseUrl: 'https://hive.blog/',
    imageProxyFn: (url: string) => url,
    hashtagUrlFn: (tag: string) => `/trending/${tag}`,
    usertagUrlFn: (account: string) => `/@${account}`
};

/**
 * Hashtags, mentioned accounts, images and links of a markdown (or `<html>`-wrapped) body,
 * extracted the way condenser's ReplyEditor does: the body is rendered with Remarkable
 * (`html`, `breaks`) and read by the HtmlReady port in non-mutating mode.
 */
export function extractContentMetadata(body: string): ContentMetadata {
    const html = /^<html>/.test(body) ? body : `<html>${new Remarkable({html: true, breaks: true}).render(body)}</html>`;
    const state = new HtmlDOMParser(EXTRACTION_OPTIONS).setMutateEnabled(false).parse(html).getState();
    return {
        hashtags: [...state.hashtags],
        usertags: [...state.usertags],
        images: [...state.images],
        links: [...state.links]
    };
}
