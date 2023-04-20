import { Remarkable } from 'remarkable';

const remarkable = new Remarkable();
export default remarkable;

/** Removes all markdown leaving just plain text */
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

remarkable.use(remarkableStripper); // removes all markdown
