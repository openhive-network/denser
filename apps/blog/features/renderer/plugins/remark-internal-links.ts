import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

const INTERNAL_LINK_REGEX =
  /(?<![\w/.])(@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[.]?[a-zA-Z0-9])*|#[a-zA-Z0-9-]+)(?![\w/.@])/g;

const remarkInternalLinks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node) => {
      const value = node.value;

      if (INTERNAL_LINK_REGEX.test(value)) {
        (node as unknown as { type: 'html'; value: string }).type = 'html';
        node.value = value.replace(INTERNAL_LINK_REGEX, (match) => {
          const path = match.startsWith('@') ? `/${match}` : `/trending/${match.slice(1)}`;
          return `<a href="${path}">${match}</a>`;
        });
      }
    });
  };
};

export default remarkInternalLinks;
