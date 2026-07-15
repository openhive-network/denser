'use client';

import { Icons } from '@ui/components/icons';

const PostingLoader = ({ isSubmitting }: { isSubmitting: boolean }) => {
  return isSubmitting ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-background/95 p-8 shadow-lg">
        <Icons.spinner className="h-10 w-10 animate-spin text-red-600" />
        <p className="text-lg font-medium">Submitting...</p>
      </div>
    </div>
  ) : null;
};

export default PostingLoader;
