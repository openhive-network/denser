import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { Node } from 'unist';

export const remarkDebug: Plugin = () => {
  return (tree: Node) => {
    visit(tree, (node: Node) => {
      console.log('remark Node type:', node.type);
      if ('value' in node) {
        console.log('remark Node value:', (node as any).value);
      }
    });
  };
};

export const rehypeDebug: Plugin = () => {
  return (tree: Node) => {
    visit(tree, (node: Node) => {
      console.log('rehype Node type:', node.type);
      if ('value' in node) {
        console.log('rehype Node value:', (node as any).value);
      }
    });
  };
};
