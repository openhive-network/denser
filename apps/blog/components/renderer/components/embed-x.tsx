import React, { useState, useEffect, FC } from 'react';

const twitterRegex = /(?:https?:\/\/)?(?:www\.)?(twitter|x)\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/;

interface Metadata {
  id: string;
  url: string;
  username: string;
}

export const getXMetadataFromLink = (data: string): Metadata | undefined => {
  if (!data) return undefined;

  const cleanData = data.replace(/^(@|https:\/\/)/, '');

  const match = cleanData.match(twitterRegex);
  if (!match) return undefined;

  const username = match[2]; // The username is in the 2nd capture group
  const id = match[4]; // The ID is in the 4th capture group
  const url = `https://${cleanData}`; // Ensure the URL always starts with https://

  return { id, url, username };
};

export const TwitterEmbedder: FC<{ id: string; username: string }> = ({ id, username }) => {
  return (
    <>
      <blockquote className="twitter-tweet">
        <a href={`https://twitter.com/${username}/status/${id}`}></a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js"></script>
    </>
  );
};
