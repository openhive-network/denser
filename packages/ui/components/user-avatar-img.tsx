'use client';

import { ImgHTMLAttributes, useCallback, useState } from 'react';
import { getDefaultImageUrl } from '../lib/avatar-utils';

export interface UserAvatarImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

/**
 * `<img>` for a user avatar that swaps to the default avatar once when `src`
 * fails to load. A failing default is left as is, so it never loops.
 */
export function UserAvatarImg({ src, onError, ...props }: UserAvatarImgProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = failedSrc === src;

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setFailedSrc(src);
      onError?.(event);
    },
    [src, onError]
  );

  // An SSR-rendered image can fail before hydration attaches onError, so the
  // already-broken state is picked up when the element mounts.
  const detectEarlyFailure = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && !showFallback && img.complete && img.naturalWidth === 0) setFailedSrc(src);
    },
    [src, showFallback]
  );

  return (
    <img
      {...props}
      ref={detectEarlyFailure}
      src={showFallback ? getDefaultImageUrl() : src}
      onError={showFallback ? onError : handleError}
    />
  );
}
