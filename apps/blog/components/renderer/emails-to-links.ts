import { Plugin } from 'unified';
import { Node } from 'unist';
import { visit } from 'unist-util-visit';

const urlRegex = /<(?:(https?:\/\/[^\s>]+)>)/g; // Match URLs wrapped in < >
const emailRegex = /<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g; // Match emails wrapped in < >

interface TextNode extends Node {
  type: 'text' | 'html';
  value: string;
}

const remarkEmailsToLinks: Plugin = () => {
  return (tree) => {
    visit(tree, 'text', (node: TextNode) => {
      if (node.value) {
        const transformedValue = node.value
          .replace(
            urlRegex,
            (match, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
          )
          .replace(emailRegex, (match, email) => `<a href="mailto:${email}">${email}</a>`);

        // Only replace the text if it has changed
        if (transformedValue !== node.value) {
          // Change the type to 'html' for rendering
          node.type = 'html';
          node.value = transformedValue; // Assign the transformed value
        }
      }
    });
  };
};

export default remarkEmailsToLinks;
