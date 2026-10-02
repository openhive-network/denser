'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link } from '@hive/ui';
import { getDefaultImageUrl } from '@ui/lib/avatar-utils';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { find_first_img } from './lib/card-image';

export default function PostImage({ post, isPriority = false }: { post: Entry; isPriority?: boolean }) {
  // Use stable identifiers as dependencies - the image won't change for the same post
  const cardImage = useMemo(
    () => find_first_img(post),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.author, post.permlink]
  );
  const [image, setImage] = useState<string>(cardImage);

  return (
    <>
      {image ? (
        <Link
          href={`/${post.category}/@${post.author}/${post.permlink}`}
          data-testid="post-image"
          className={clsx({ hidden: post.stats?.gray })}
        >
          <div className="relative flex h-[210px] items-center overflow-hidden bg-transparent sm:h-[360px] md:mr-3.5 md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
            <picture className="articles__feature-img h-ful w-full">
              <source
                srcSet={image}
                media="(min-width: 1000px)"
                onError={() => setImage(getDefaultImageUrl())}
              />
              <img
                srcSet={image}
                alt="Post image"
                loading={isPriority ? 'eager' : 'lazy'}
                fetchPriority={isPriority ? 'high' : undefined}
                className="w-full"
                onError={() => setImage(getDefaultImageUrl())}
              />
            </picture>
          </div>
        </Link>
      ) : null}
    </>
  );
}
