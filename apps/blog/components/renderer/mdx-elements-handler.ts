import { Plugin } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';

type Attributes = { name: string; value: string };
type Children = { type: 'text' | 'break'; value: string };

interface MdxNode extends Node {
  attributes: Attributes[];
  children: Children[];
  name: string;
  type: 'mdxJsxFlowElement' | 'html';
  value?: string;
}

const remarkMdxHandler: Plugin = () => {
  return (tree) => {
    visit(tree, 'mdxJsxFlowElement', (node: MdxNode) => {
      if (node.name === 'a') {
        node.type = 'html';
        node.value = `<a href="${node.attributes[0].value}">${node.children[0].value}</a>`;
      }
    });
  };
};

export default remarkMdxHandler;
