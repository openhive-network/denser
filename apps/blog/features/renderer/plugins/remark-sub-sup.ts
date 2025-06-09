import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

const SUB_REGEX = /(?<!~)~([^~]+)~(?!~)/g;
const SUP_REGEX = /\^([^^]+)\^/g;

const remarkSubSup: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node) => {
      let value = node.value;

      // Create new RegExp instances to reset lastIndex
      const subRegex = new RegExp(SUB_REGEX);
      const supRegex = new RegExp(SUP_REGEX);

      if (subRegex.test(value) || supRegex.test(value)) {
        (node as unknown as { type: 'html'; value: string }).type = 'html';
        // Apply transformations in sequence
        value = value.replace(SUB_REGEX, '<sub>$1</sub>');
        node.value = value.replace(SUP_REGEX, '<sup>$1</sup>');
      }
    });
  };
};

export default remarkSubSup;
