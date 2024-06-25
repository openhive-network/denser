import { Remarkable } from 'remarkable';
import fs from 'fs';
import path from 'path';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { getTranslations } from '../lib/get-translations';

export const getServerSideProps: GetServerSideProps<{
  data: string;
}> = async (ctx) => {
  const file_path = path.join('lib', 'markdowns', 'welcome.md');
  const data = fs.readFileSync(file_path, { encoding: 'utf8', flag: 'r' });

  return {
    props: {
      data,
      ...(await getTranslations(ctx))
    }
  };
};
function Welcome({ data }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const renderer = new Remarkable({
    html: true,
    xhtmlOut: true,
    typographer: false,
    quotes: '“”‘’'
  });
  const welcome_page = renderer.render(data);
  return (
    <div className="mx-auto my-12 max-w-3xl px-4">
      <div
        id="articleBody"
        className="entry-body markdown-view user-selectable prose max-w-full dark:prose-invert"
        dangerouslySetInnerHTML={{
          __html: welcome_page
        }}
      />
    </div>
  );
}

export default Welcome;
