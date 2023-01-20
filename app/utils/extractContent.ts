import sanitize from 'sanitize-html';
import { Remarkable } from 'remarkable';

const HTML_CHAR_MAP: { [key: string]: string } = {
	amp: '&',
	quot: '"',
	lsquo: '‘',
	rsquo: '’',
	sbquo: '‚',
	ldquo: '“',
	rdquo: '”',
	bdquo: '„',
	hearts: '♥',
	trade: '™',
	hellip: '…',
	pound: '£',
	copy: '',
};

const remarkable = new Remarkable();

const remarkableStripper = (md: any) => {
	md.renderer.render = (tokens: any, options: any, env: any) => {
		let str = '';
		for (let i = 0; i < tokens.length; i += 1) {
			if (tokens[i].type === 'inline') {
				str += md.renderer.render(tokens[i].children, options, env);
			} else {
				// console.log('content', tokens[i])
				const { content } = tokens[i];
				str += (content || '') + ' ';
			}
		}
		return str;
	};
};

const re = remarkable.use(remarkableStripper);

export const htmlDecode = (txt: string) =>
	txt.replace(/&[a-z]+;/g, (char) => {
		const charMaped = HTML_CHAR_MAP[char.substring(1, char.length - 1)];
		return charMaped ? charMaped : char;
	});

export async function extractBodySummary(body: string, stripQuotes = false) {
	let desc = body;

	if (stripQuotes) desc = desc.replace(/(^(\n|\r|\s)*)>([\s\S]*?).*\s*/g, '');
	desc = re.render(desc); // render markdown to html
	desc = sanitize(desc, { allowedTags: [] }); // remove all html, leaving text
	desc = htmlDecode(desc);

	// Strip any raw URLs from preview text
	desc = desc.replace(/https?:\/\/[^\s]+/g, '');

	// Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
	// eslint-disable-next-line prefer-destructuring
	desc = desc.trim().split('\n')[0];

	if (desc.length > 120) {
		desc = desc.substring(0, 120).trim();

		// Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
		desc = desc
			.substring(0, 110)
			.trim()
			.replace(/[,!?]?\s+[^\s]+$/, '…');
	}

	return desc;
}
