import {RendererPlugin} from './RendererPlugin';

// Internal Links plugin
export class InternalLinkPlugin implements RendererPlugin {
    name = 'internal-links';

    // Match @user and #tag in text and wrap with internal anchor links
    preProcess = (text: string): string => {
        return (
            text
                // Handle @user
                .replace(/(^|\s)@([a-zA-Z0-9_]+)/g, (_match, prefix, username) => {
                    return `${prefix}<a href="/@${username}">@${username}</a>`;
                })
                // Handle #tag
                .replace(/(^|\s)#([a-zA-Z0-9_]+)/g, (_match, prefix, tag) => {
                    return `${prefix}<a href="/trending/${tag}">#${tag}</a>`;
                })
        );
    };
}
