import { Plugin } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';

type Children = { type: 'text' | 'break'; value: string };
type BlockquoteChild = { type: string; children?: Children[] };
interface Blockquote extends Node {
  type: 'blockquote' | 'html';
  children: BlockquoteChild[];
  value?: string;
}

const spoilerRegex = /\[([^\]]+)\]/;

const remarkSpoiler: Plugin = () => {
  return (tree) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const firstChild = node.children[0]?.children;
      if (!firstChild) return;

      firstChild.forEach((child) => {
        console.log('child:', child);
        const value = child.value;
        if (!value.startsWith('! ')) return;

        const isSpoilerWithSummary = value.startsWith('! [');
        const spoilerContent = value.substring(2);
        const summaryMatch = isSpoilerWithSummary ? value.match(spoilerRegex) : null;
        const summaryText = summaryMatch?.[1] || 'Reveal spoiler';
        const cleanValue = isSpoilerWithSummary ? spoilerContent.replace(spoilerRegex, '') : spoilerContent;
        const finalValue = cleanValue.replace(/\n\s*/g, '<br/>');
        console.log('finalValue:', finalValue);
        node.type = 'html';
        node.value = `<details><summary>${summaryText}</summary>${finalValue}</details>`;
      });
    });
  };
};

export default remarkSpoiler;
