import 'highlight.js/styles/github.css';
import 'remark-github-blockquote-alert/alert.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { cn } from '@ui/lib/utils';
import remarkSubSup from './plugins/remark-sub-sup';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkAlert from 'remark-github-blockquote-alert';
import remarkParse from 'remark-parse';
import rehypeMathjax from 'rehype-mathjax';
import rehypeSanitize from 'rehype-sanitize';
import remarkFlexibleParagraphs from 'remark-flexible-paragraphs';
import remarkFlexibleMarkers from 'remark-flexible-markers';

export default function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('prose h-full max-w-none p-2 dark:prose-invert', className)}>
      <ReactMarkdown
        children={content}
        remarkPlugins={[
          remarkParse,
          remarkFlexibleParagraphs,
          remarkFlexibleMarkers,
          remarkAlert,
          remarkMath,
          remarkSubSup,
          remarkBreaks,
          [
            remarkGfm,
            {
              singleTilde: false,
              subscript: true,
              superscript: true
            }
          ]
        ]}
        rehypePlugins={[
          rehypeRaw,
          rehypeKatex,
          rehypeHighlight,
          rehypeMathjax,
          [
            rehypeSanitize,
            {
              attributes: {
                '*': ['className', 'style'],
                a: ['href', 'title'],
                img: ['src', 'alt']
              },
              tagNames: [
                'span',
                'div',
                'p',
                'a',
                'ul',
                'ol',
                'li',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'u',
                'strong',
                'em',
                'blockquote',
                'code',
                'pre',
                'img',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
                'sub',
                'sup',
                'mark'
              ]
            }
          ]
        ]}
      />
    </div>
  );
}
