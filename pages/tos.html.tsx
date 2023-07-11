import { Remarkable } from 'remarkable';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import path from 'path';
import fs from 'fs';
export const getServerSideProps: GetServerSideProps<{
  data: string;
}> = async () => {
  const file_path = path.join('lib', 'markdowns', 'tos.md');
  const data = fs.readFileSync(file_path, { encoding: 'utf8', flag: 'r' });

  return { props: { data } };
};
function TOS({ data }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const renderer = new Remarkable({
    html: true,
    xhtmlOut: true,
    typographer: false,
    quotes: '“”‘’'
  });
  const tos_page = renderer.render(data);
  return (
    <div className="p-12">
      <div className="text-2xl sm:text-5xl">Terms of Service</div>
      <div
        id="articleBody"
        className="entry-body markdown-view user-selectable prose max-w-full dark:prose-invert"
        dangerouslySetInnerHTML={{
          __html: tos_page
        }}
      />
    </div>
  );
}

export default TOS;
