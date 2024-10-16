'use client';
import { startTransition, useEffect, useState } from 'react';
import { MDXClient } from 'next-mdx-remote-client';
import React from 'react';
import { serialize, SerializeResult, SerializeOptions } from 'next-mdx-remote-client/serialize';
import MdEditor from '@/blog/components/md-editor';

import remarkFlexibleToc from 'remark-flexible-toc';
import remarkBreaks from 'remark-breaks';
import remarkFlexibleMarkers from 'remark-flexible-markers';
import remarkEmoji from 'remark-emoji';
import remarkFlexibleParagraphs from 'remark-flexible-paragraphs';
import remarkImages from 'remark-images';
import rehypeRemoveExternalScriptContent from 'rehype-remove-external-script-content';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkSpoiler from '@/blog/components/renderer/lib/remark-spoiler-plugin';
import remarkInsert from 'remark-ins';
import remarkFlexibleContainers, { type FlexibleContainerOptions } from 'remark-flexible-containers';
import rehypeStringify from 'rehype-stringify';
import rehypeFormat from 'rehype-format';
import rehypeParse from 'rehype-parse';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import remarkRehype from 'remark-rehype';
import rehypeRemark from 'rehype-remark';
import remarkMdx from 'remark-mdx';
import recmaMdxEscapeMissingComponents from 'recma-mdx-escape-missing-components';
import remarkFlexibleCodeTitles from 'remark-flexible-code-titles';
import rehypeHighlightLines, { type HighlightLinesOptions } from 'rehype-highlight-code-lines';
import rehypePreLanguage from 'rehype-pre-language';
import recmaMdxChangeProps from 'recma-mdx-change-props';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeReact from 'rehype-react';
import remarkMdxHandler from '@/blog/components/renderer/lib/mdx-elements-handler-plugin';

const options: SerializeOptions = {
  mdxOptions: {
    remarkPlugins: [
      remarkMdxHandler,
      remarkGfm,
      remarkInsert,
      remarkSpoiler,
      remarkFlexibleMarkers,
      remarkEmoji,
      remarkFlexibleParagraphs,
      remarkFlexibleToc,
      remarkBreaks,
      remarkImages,
      remarkRehype,
      remarkFlexibleCodeTitles
    ],
    rehypePlugins: [
      [
        rehypeHighlightLines,
        {
          showLineNumbers: true,
          lineContainerTagName: 'div'
        } as HighlightLinesOptions
      ],
      rehypeRemoveExternalScriptContent,
      rehypeStringify,
      rehypePreLanguage,
      rehypeReact,
      [
        rehypeRaw,
        {
          passThrough: [
            'mdxFlowExpression',
            'mdxJsxFlowElement',
            'mdxJsxTextElement',
            'mdxTextExpression',
            'mdxjsEsm'
          ]
        }
      ]
    ],
    recmaPlugins: [
      [recmaMdxEscapeMissingComponents, ['Bar', 'Toc', 'ContextConsumer', 'ComponentFromOuterProvider']],
      recmaMdxChangeProps
    ]
  }
};

const Page = () => {
  const [mdSource, setMdSource] = useState(
    `https://www.youtube.com/shorts/J70iOZTX0wA
https://www.youtube.com/embed/PeCs2hepb5c
https://www.youtube.com/@SejmRP_PL
https://www.youtube.com/watch?v=DrNzG-S9Di0&list=FLcRhdnpSLcZN3NXHspgxhdA`
  );
  const [md, setMd] = useState<SerializeResult>();

  useEffect(() => {
    async function serializeMd() {
      const mdxSource = await serialize({
        source: mdSource,
        options
      });
      setMd(mdxSource);
    }
    //not sure what wrap with it but it should help with holding render dom when changing state
    startTransition(() => serializeMd());
  }, [mdSource]);
  return (
    <div>
      <div className="h-[500px] w-full">
        <MdEditor
          onChange={(value) => setMdSource(value ?? '')}
          persistedValue={mdSource}
          htmlMode={false}
          windowheight={500}
        />
      </div>
      <div className="prose">{md && 'compiledSource' in md ? <MDXClient {...md} /> : null}</div>
    </div>
  );
};

export default Page;
