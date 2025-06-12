import { visit } from 'unist-util-visit';
import { Node } from 'unist';
import BadDomains from '@hiveio/hivescript/bad-domains.json';
import GoodDomains from '@hiveio/hivescript/good-domains.json';

interface LinkNode extends Node {
  tagName: string;
  properties: {
    href?: string;
    target?: string;
    rel?: string;
    className?: string;
    'data-confirm-navigation'?: boolean;
  };
}

export default function rehypeLinkHandler() {
  return (tree: Node) => {
    visit(tree, 'element', (node: LinkNode) => {
      if (node.tagName !== 'a' || !node.properties?.href) return;

      const href = node.properties.href;

      // Internal links starting with /
      if (href.startsWith('/')) {
        node.properties.className = 'internal-link';
        return;
      }

      // Handle external links
      try {
        const url = new URL(href);

        // Safe domains - open in new tab
        if (GoodDomains.includes(url.hostname)) {
          node.properties.target = '_blank';
          node.properties.rel = 'noopener noreferrer';
          node.properties.className = 'safe-external-link link-external';
          return;
        }

        // Dangerous domains - convert to text
        if (BadDomains.includes(url.hostname)) {
          node.tagName = 'span';
          delete node.properties.href;
          node.properties.className = 'dangerous-link';
          return;
        }

        // Unknown domains - use confirmation dialog
        node.properties.className = 'unknown-external-link link-external';
      } catch {
        // If URL parsing fails, treat as unknown link
        node.properties.className = 'unknown-external-link';
        if (!href.startsWith('https://')) {
          node.properties.href = `https://${href}`;
        }
      }
    });
  };
}
