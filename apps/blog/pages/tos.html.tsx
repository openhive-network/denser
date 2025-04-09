import { Remarkable } from 'remarkable';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import path from 'path';
import fs from 'fs';
import { getTranslations } from '../lib/get-translations';
import { useMemo } from 'react';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps<{
  data: string;
}> = async (ctx) => {
  const file_path = path.join('lib', 'markdowns', 'tos.md');
  const data = fs.readFileSync(file_path, { encoding: 'utf8', flag: 'r' });

  return {
    props: {
      data,
      ...(await getTranslations(ctx))
    }
  };
};
const TAB_TITLE = 'Terms of Service - Hive';
function TOS({ data }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const renderer = new Remarkable({
    html: true,
    xhtmlOut: true,
    typographer: false,
    quotes: '“”‘’'
  });
  const content = useMemo(() => renderer.render(data), []);
  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="mx-auto my-12 max-w-3xl px-4">
        <div className="text-2xl sm:text-5xl">Terms of Service</div>
        <div
          id="articleBody"
          className="prose"
          dangerouslySetInnerHTML={{
            __html: content
          }}
        />
      </div>
    </>
  );
}

export default TOS;
