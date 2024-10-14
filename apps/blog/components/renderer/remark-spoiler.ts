import { Plugin } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';

// Define the shape of a blockquote node
interface Blockquote extends Node {
  type: 'blockquote' | 'html';
  children: Array<{ type: string; value?: string; children?: Array<{ value: string }> }>;
  value?: string;
}

// Create a plugin using the Plugin interface from Unified
const remarkSpoiler: Plugin = () => {
  return (tree) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      // Check if the first child exists and contains text
      const firstChild = node.children[0];
      const firstLine = firstChild?.children?.[0]?.value;

      if (firstLine && firstLine.startsWith('! [')) {
        // Extract the summary text inside [ ] brackets
        const summaryMatch = firstLine.match(/\[([^\]]+)\]/);
        if (!summaryMatch) return;

        const summaryText = summaryMatch[1];
        const contentText = firstLine.replace(/^! \[.*\]\s*/, ''); // Remove the summary part from the first line

        // Replace the blockquote node with a custom HTML <details> element
        node.type = 'html';
        node.value = `<details><summary>${summaryText}</summary>${contentText}`;

        // Append the remaining lines from the blockquote
        const remainingLines = node.children
          .slice(1)
          .map((child) => child.children?.[0]?.value || '')
          .join('\n');
        node.value += `${remainingLines}</details>`;

        // Clear the children because we replaced the entire blockquote with raw HTML
        node.children = [];
      }
    });
  };
};

export default remarkSpoiler;
