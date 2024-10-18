import { FC } from 'react';

const youtubeEmbedRegex =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/watch\?v=|youtu.be\/[^watch]|youtube\.com\/(embed|shorts)\/)([A-Za-z0-9_-]+)[^ ]*/i;
const youtubeIdRegex =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/watch\?v=|youtu.be\/|youtube\.com\/(embed|shorts)\/)([A-Za-z0-9_-]+)/i;

export function getYoutubeaFromLink(
  data: string
): { id: string; url: string; thumbnail: string; isShorts: boolean } | undefined {
  if (!data) {
    return undefined;
  }

  const m1 = data.match(youtubeEmbedRegex);
  const url = m1 ? m1[0] : undefined;
  if (!url) {
    return undefined;
  }

  const m2 = url.match(youtubeIdRegex);
  const id = m2 && m2.length >= 2 ? m2[2] : undefined;
  if (!id) {
    return undefined;
  }
  const isShorts = url.includes('shorts');

  return {
    id,
    url,
    thumbnail: 'https://img.youtube.com/vi/' + id + '/0.jpg',
    isShorts
  };
}

type YoutubeEmbedProps = {
  url: string;
  id: string;
  isShorts: boolean;
};

export const YoutubeEmbed: FC<YoutubeEmbedProps> = ({ url, id, isShorts }) => {
  return (
    <iframe
      width={isShorts ? '315' : '560'}
      height={isShorts ? '560' : '315'}
      src={`https://www.youtube.com/embed/${id}`}
      title=""
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    >
      <a href={url}>{url}</a>
    </iframe>
  );
};