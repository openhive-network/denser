'use client';

import { memo } from 'react';
import { Separator } from '@ui/components/separator';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import ImageGallery from './image-gallery';
import RendererContainer from './rendererContainer';
import { postClassName } from '@/blog/features/post-editor/lib/utils';

interface PostBodySectionProps {
  body: string;
  author: string;
  permlink: string;
  mainPost: boolean;
  crossPostBody?: string;
  mutedPost: boolean;
  onShowMutedContent: () => void;
}

/**
 * Memoized component for rendering the post body content.
 * This prevents unnecessary re-renders when the parent's reply state changes.
 */
const PostBodySection = memo(function PostBodySection({
  body,
  author,
  permlink,
  mainPost,
  crossPostBody,
  mutedPost,
  onShowMutedContent
}: PostBodySectionProps) {
  const { t } = useTranslation('common_blog');

  if (mutedPost) {
    return (
      <>
        <Separator />
        <div className="my-8 flex items-center justify-between text-destructive">
          {t('post_content.body.content_were_hidden')}
          <Button variant="outlineRed" onClick={onShowMutedContent}>
            {t('post_content.body.show')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <ImageGallery>
      <RendererContainer
        mainPost={mainPost}
        body={crossPostBody ?? body}
        author={author}
        permlink={permlink}
        className={postClassName}
      />
    </ImageGallery>
  );
});

export default PostBodySection;
