import { Remarkable } from 'remarkable';
import { GetStaticProps, InferGetStaticPropsType } from 'next';
import path from 'path';
import fs from 'fs';
import { getTranslations } from '../lib/get-translations';

export const getStaticProps: GetStaticProps<{
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
function Faq({ data }: InferGetStaticPropsType<typeof getStaticProps>) {
  const renderer = new Remarkable({
    html: true,
    xhtmlOut: true,
    typographer: false,
    quotes: '“”‘’'
  });
  const faq_page = renderer.render(data);
  return (
    <div className="mx-auto my-12 px-4 max-w-3xl ">
      <div
        id="articleBody"
        className="entry-body markdown-view user-selectable prose max-w-full dark:prose-invert"
        dangerouslySetInnerHTML={{
          __html: faq_page
        }}
      />
    </div>
  );
}

export default Faq;
