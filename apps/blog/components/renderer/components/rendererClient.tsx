import { startTransition, useEffect, useState } from 'react';
import { MDXClient } from 'next-mdx-remote-client';
import React from 'react';
import { serialize, SerializeResult, SerializeOptions } from 'next-mdx-remote-client/serialize';
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
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import rehypePreLanguage from 'rehype-pre-language';
import remarkMdxHandler from '@/blog/components/renderer/lib/mdx-elements-handler-plugin';
import { FC } from 'react';
import rehypeSanitize from 'rehype-sanitize';
import { remarkDebug, rehypeDebug } from '../lib/re-debug';
import clsx from 'clsx';

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
      remarkRehype
      // remarkDebug
    ],
    rehypePlugins: [
      rehypeRaw,
      rehypeSanitize,
      rehypeStringify,
      rehypeRemoveExternalScriptContent,
      rehypePreLanguage
      // rehypeDebug,
    ],
    recmaPlugins: [],
    format: 'md'
  }
};

const Renderer: FC<{ mdSource: string; author: string; type: 'post' | 'comment' }> = ({
  mdSource,
  author,
  type
}) => {
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
    <div
      className={clsx('prose', {
        'font-source text-[16.5px] prose-h1:text-[26.4px] prose-h2:text-[23.1px] prose-h3:text-[19.8px] prose-h4:text-[18.1px] prose-p:mb-6 prose-p:mt-0 prose-img:cursor-pointer sm:text-[17.6px] sm:prose-h1:text-[28px] sm:prose-h2:text-[24.7px] sm:prose-h3:text-[22.1px] sm:prose-h4:text-[19.4px] lg:text-[19.2px] lg:prose-h1:text-[30.7px] lg:prose-h2:text-[28.9px] lg:prose-h3:text-[23px] lg:prose-h4:text-[21.1px]':
          type === 'post'
      })}
    >
      {md && 'compiledSource' in md ? <MDXClient {...md} /> : null}
    </div>
  );
};

export default Renderer;
