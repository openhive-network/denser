import { FC } from 'react';

type YoutubeEmbedProps = {
  url: string;
  id: string;
  isShorts: boolean;
};

const YoutubeEmbed: FC<YoutubeEmbedProps> = ({ url, id, isShorts }) => {
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
export default YoutubeEmbed;
