import { Entry } from '@transaction/lib/extended-hive.chain'; 
import { find_first_img } from './post-img';
import Link from 'next/link';
import { proxifyImageUrl } from '@ui/lib/old-profixy';

const truncateTitle = (title: string, maxLength: number = 50) => {
  return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
};

const SuggestionsCard = ({ entry }: { entry: Entry }) => {
  const cardImage = find_first_img(entry);
  return (
    <div className="m-4 flex flex-col rounded-lg bg-background shadow-md">
      <Link href={`/${entry.category}/@${entry.author}/${entry.permlink}`} data-testid="post-image">
        <>
          {cardImage ? (
            <div className="flex h-24 items-center overflow-hidden rounded-t-lg bg-transparent">
              <picture className="articles__feature-img h-ful w-full">
                <source
                  srcSet={proxifyImageUrl(cardImage, '256x512').replace(/ /g, '%20')}
                  media="(min-width: 600px)"
                />
                <img srcSet={cardImage} alt="Post image" loading="lazy" className="w-full" />
              </picture>
            </div>
          ) : null}
        </>
        <h2 className="p-1 text-xs font-semibold">{truncateTitle(entry.title)}</h2>
      </Link>
      <div className="flex flex-col p-1 text-sm text-gray-500">
        <Link href={`/${entry.category}/@${entry.author}/${entry.permlink}`}>{entry.author}</Link>
        <time>{new Date(entry.created).toLocaleDateString()}</time>
      </div>
    </div>
  );
};
export default SuggestionsCard;
