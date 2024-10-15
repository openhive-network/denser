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
import remarkSpoiler from '@/blog/components/renderer/remark-spoiler';

import rehypeStringify from 'rehype-stringify';
import rehypeFormat from 'rehype-format';
import rehypeParse from 'rehype-parse';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import remarkRehype from 'remark-rehype';
import rehypeRemark from 'rehype-remark';
import remarkMdx from 'remark-mdx';
import remarkEmailsToLinks from '@/blog/components/renderer/emails-to-links';
import recmaMdxEscapeMissingComponents from 'recma-mdx-escape-missing-components';

const options: SerializeOptions = {
  mdxOptions: {
    remarkPlugins: [
      remarkSpoiler,
      remarkEmailsToLinks,
      remarkGfm,
      remarkFlexibleMarkers,
      remarkEmoji,
      remarkFlexibleParagraphs,
      remarkFlexibleToc,
      remarkBreaks,
      remarkImages,
      remarkRehype
    ],
    rehypePlugins: [
      [rehypeRaw, { passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'] }],
      rehypeRemoveExternalScriptContent,
      rehypeStringify
    ],
    recmaPlugins: [recmaMdxEscapeMissingComponents]
  }
};

const Page = () => {
  const [mdSource, setMdSource] = useState(
    `>! This is a spoiler content.
> This is a second line
    
test 111111

>asdasd
>asdas
    
test 22222

>! [123]This is a spoiler content.
> This is a second linesda
test 33333
    
>sadasda
>asdasd
test 444444
test 555555
`
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
