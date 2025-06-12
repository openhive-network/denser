import { FC } from 'react';

const regex =
  /https?:\/\/(?:www\.)?twitch\.tv\/(?:(videos|channel|clip)\/)?([a-zA-Z0-9_]+)(?:\/clip\/([a-zA-Z0-9-_]+))?/i;

const siteDomain = process.env.REACT_APP_SITE_DOMAIN;

export function getTwitchMetadataFromLink(data: string) {
  const m = data.match(regex);
  if (!m) return undefined;

  const url = m[3]
    ? `https://clips.twitch.tv/embed?clip=${m[3]}&parent=${siteDomain}`
    : m[1] === 'videos'
      ? `https://player.twitch.tv/?video=${m[2]}&parent=${siteDomain}`
      : `https://player.twitch.tv/?channel=${m[2]}&parent=${siteDomain}`;
  return url;
}

export const TwitchEmbed: FC<{ url: string }> = ({ url }) => {
  return (
    <div id="twitch-embed">
      <iframe src={url}></iframe>
    </div>
  );
};
