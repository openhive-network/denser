import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { ReactNode } from 'react';
import { Button, Separator } from '@ui/components';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';

export function LeavePageDialog({
  children,
  link,
}: {
  children: ReactNode;
  link: string;
}) {
  const { t } = useTranslation('common_blog');
  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer" asChild>
        {children}
      </DialogTrigger>


      <DialogContent className="overflow-auto">
     <div className='text-2xl'>{t('post_content.body.leave_this_app')}</div>
      <Separator/>
        <div className='flex flex-col gap-8'>
          <span>{t('post_content.body.the_link_youve_clicked')} <span className='font-bold'>{link}</span></span>
        <span>
          {t('post_content.body.we_are_just_verifying')}
        </span>
      <Link target="_blank" href={link}><Button className='w-fit' variant='outlineRed'>{t('post_content.body.open_link')}</Button></Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}