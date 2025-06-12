import { FC } from 'react';

const main =
  /(?:https?:\/\/(?:(?:3speak\.(?:online|co|tv)\/watch\?v=)|(?:3speak\.(?:online|co|tv)\/embed\?v=)))([A-Za-z0-9_\-\/.]+)(&.*)?/i;

export function getThreespeakMetadataFromLink(data: string) {
  if (!data) return null;

  const match = data.match(main);
  if (!match) return undefined;
  const id = match[1];
  return id;
}

export const ThreeSpeakEmbed: FC<{ id: string }> = ({ id }) => {
  const url = `https://3speak.tv/embed?v=${id}`;

  return (
    <div key={`threespeak-${id}`} className="videoWrapper">
      <iframe
        title="3Speak embedded player"
        // eslint-disable-next-line react/jsx-props-no-spreading
        src={url}
      />
    </div>
  );
};
