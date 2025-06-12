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
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const loadTwitterScript = () => {
      if (document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
        setScriptLoaded(true);
        // If script already exists, render widgets immediately
        if (window.twttr && window.twttr.widgets) {
          window.twttr.widgets.load();
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
        // Render widgets after script loads
        if (window.twttr && window.twttr.widgets) {
          window.twttr.widgets.load();
        }
      };
      document.body.appendChild(script);
    };

    loadTwitterScript();

    return () => {
      // Cleanup: remove any Twitter widgets that might be attached to this component
      const tweetElements = document.querySelectorAll('.twitter-tweet');
      tweetElements.forEach((element) => {
        const iframe = element.nextElementSibling;
        if (iframe && iframe.tagName === 'IFRAME') {
          try {
            iframe.remove();
          } catch (e) {
            // Ignore removal errors
          }
        }
      });
    };
  }, []);

  // Trigger widget rendering when component updates
  useEffect(() => {
    if (scriptLoaded && window.twttr && window.twttr.widgets) {
      window.twttr.widgets.load();
    }
  }, [scriptLoaded, id]);

  return (
    <blockquote className="twitter-tweet" key={`tweet-${id}`}>
      <a href={`https://twitter.com/${username}/status/${id}`}></a>
    </blockquote>
  );
};
