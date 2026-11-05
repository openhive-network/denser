import { Remarkable } from 'remarkable';

const remarkable = new Remarkable();
export default remarkable;

/** Marks where a block element ends in the stripper's output (ASCII record separator). */
export const BLOCK_BREAK = '\u001e';

// Block tokens that carry their own text, as opposed to an `inline` child list.
const BLOCK_CONTENT_TYPES = new Set(['code', 'fence', 'htmlblock']);

// Code is literal text, while other token text is HTML source whose entities the tag-stripping parser
// decodes; escaping code keeps that parser from reading its `<` and `&` as markup.
const CODE_TOKEN_TYPES = new Set(['code', 'fence']);
const HTML_SPECIAL_CHARS = /[&<>]/g;
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

const tokenHtml = (type: string, content = '') =>
  CODE_TOKEN_TYPES.has(type) ? content.replace(HTML_SPECIAL_CHARS, (ch) => HTML_ESCAPES[ch]) : content;

const renderInline = (tokens: { type: string; content?: string }[]) =>
  tokens.map(({ type, content }) => tokenHtml(type, content) + ' ').join('');

/** Removes all markdown leaving the text as HTML source, with BLOCK_BREAK after each block element */
const remarkableStripper = (md: Remarkable) => {
  md.renderer.render = (tokens: any) => {
    let str = '';
    for (let i = 0; i < tokens.length; i += 1) {
      const { type, content, children } = tokens[i];
      if (type === 'inline') {
        str += renderInline(children);
      } else {
        str += tokenHtml(type, content) + ' ';
        if (type.endsWith('_close') || BLOCK_CONTENT_TYPES.has(type)) str += BLOCK_BREAK;
      }
    }
    return str;
  };
};

remarkable.use(remarkableStripper); // removes all markdown
// Entities stay as written so that the HTML parser stripping the tags decodes them, once.
remarkable.inline.ruler.disable(['entity']);
