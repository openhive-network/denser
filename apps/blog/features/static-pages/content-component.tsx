import { Remarkable } from 'remarkable';
import path from 'path';
import fs from 'fs';

const StaticContent = ({ filename }: { filename: string }) => {
  const file_path = path.join('lib', 'markdowns', filename);
  const data = fs.readFileSync(file_path, { encoding: 'utf8', flag: 'r' });
  const renderer = new Remarkable({
    html: true,
    xhtmlOut: true,
    typographer: false,
    quotes: '“”‘’'
  });
  const content = renderer.render(data);
  return (
    <>
      <div className="mx-auto my-12 max-w-3xl px-4">
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
};

export default StaticContent;
