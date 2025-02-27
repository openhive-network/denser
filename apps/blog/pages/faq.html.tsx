import { Remarkable } from 'remarkable';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import path from 'path';
import fs from 'fs';
import { getTranslations } from '../lib/get-translations';
import { useMemo } from 'react';

export const getServerSideProps: GetServerSideProps<{
  data: string;
}> = async (ctx) => {
  const file_path = path.join('lib', 'markdowns', 'faq.md');
  const data = fs.readFileSync(file_path, { encoding: 'utf8', flag: 'r' });

  return {
    props: {
      data,
      ...(await getTranslations(ctx))
    }
  };
};
function Faq({ data }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const renderer = new Remarkable({
    html: true,
    xhtmlOut: true,
    typographer: false,
    quotes: '“”‘’'
  });
  const content = useMemo(() => renderer.render(data), []);
  return (
    <div className="mx-auto my-12 max-w-3xl px-4 ">
      <div
        id="articleBody"
        className="prose"
        dangerouslySetInnerHTML={{
          __html: content
        }}
      />
    </div>
  );
}

export default Faq;
