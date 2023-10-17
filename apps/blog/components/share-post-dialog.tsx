import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@hive/ui/components/dialog';
import { ReactNode } from 'react';
import Link from 'next/link';
import ClipboardCopy from './copy-from-input';
import { Icons } from '@hive/ui/components/icons';
import { useTranslation } from 'next-i18next';

export function SharePost({ children, path }: { children: ReactNode; path: string }) {
  const { t } = useTranslation('common_blog');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div title={t('post_content.footer.share_form.share_this_link')}>{children}</div>
      </DialogTrigger>
      <DialogContent className='flex flex-col gap-4 sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle
            className='border-b-2 pb-2 text-3xl'>{t('post_content.footer.share_form.share_this_link')}</DialogTitle>
        </DialogHeader>
        <div className='flex w-full flex-col gap-4'>
          <ClipboardCopy copyText={`https://hive.blog${path}`}
                         label={t('post_content.footer.share_form.url_to_this_post')} />
          <ClipboardCopy
            copyText={`[Call to Action! - Recording of the Last Meeting & Participate in SPK Proof of Access](https://hive.blog${path})`}
            label={t('post_content.footer.share_form.markdown_code_for_a_link_to_this_post')}
          />
        </div>
        <div>
          <div className='flex flex-col gap-1 text-sm'>
            <DialogTitle className='my-2'>{t('post_content.footer.share_form.open_in_alternative')}</DialogTitle>
            <Link target='_blank' className='flex gap-2' href={`https://peakd.com${path}`}>
              {'•'}
              <span className='text-red-600'>https://peakd.com</span>
              <Icons.forward />
            </Link>
            <Link target='_blank' href={`https://ecency.com${path}`} className='flex gap-2'>
              {'•'}
              <span className='text-red-600'>https://ecency.com</span>
              <Icons.forward />
            </Link>
            <Link target='_blank' href={`https://waivio.com${path}`} className='flex gap-2'>
              {'•'} <span className='text-red-600'>https://waivio.com </span>
              <Icons.forward />
            </Link>
          </div>
        </div>
        <div>
          <div className='flex flex-col gap-1 text-sm'>
            <DialogTitle className='my-2'>{t('post_content.footer.share_form.open_in')}</DialogTitle>
            <Link target='_blank' className='flex gap-2' href={`https://hiveblocks.com${path}`}>
              {'•'} <span className='text-red-600'>https://hiveblocks.com </span>
              <Icons.forward />
            </Link>
            <Link target='_blank' href={`https://hive.ausbit.dev${path}`} className='flex gap-2'>
              {'•'} <span className='text-red-600'>https://hive.ausbit.dev </span>
              <Icons.forward />
            </Link>
            <Link target='_blank' href={`https://hiveblockexplorer.com${path}`} className='flex gap-2'>
              {'•'} <span className='text-red-600'>https://hiveblockexplorer.com </span>
              <Icons.forward />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
