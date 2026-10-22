import { Remarkable } from 'remarkable';

const remarkable = new Remarkable();
export default remarkable;

/** Marks where a block element ends in the stripper's output (ASCII record separator). */
export const BLOCK_BREAK = '\u001e';

// Block tokens that carry their own text, as opposed to an `inline` child list.
const BLOCK_CONTENT_TYPES = new Set(['code', 'fence', 'htmlblock']);

const renderInline = (tokens: { content?: string }[]) => tokens.map(({ content }) => (content || '') + ' ').join('');

/** Removes all markdown leaving just plain text, with BLOCK_BREAK after each block element */
const remarkableStripper = (md: Remarkable) => {
  md.renderer.render = (tokens: any) => {
    let str = '';
    for (let i = 0; i < tokens.length; i += 1) {
      const { type, content, children } = tokens[i];
      if (type === 'inline') {
        str += renderInline(children);
      } else {
        str += (content || '') + ' ';
        if (type.endsWith('_close') || BLOCK_CONTENT_TYPES.has(type)) str += BLOCK_BREAK;
      }
    }
    return str;
  };
};

remarkable.use(remarkableStripper); // removes all markdown
