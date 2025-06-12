import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import { Button, Separator } from '@ui/components';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

export function LeavePageDialog({ link, children }: { link: string; children: ReactNode }) {
  const { t } = useTranslation('common_blog');
  return (
    <Dialog>
      <DialogTrigger>
        <span className="cursor-pointer text-destructive">{children}</span>
      </DialogTrigger>
      <DialogContent className="overflow-auto">
        <div className="text-2xl">{t('post_content.body.leave_this_app')}</div>
        <Separator />
        <div className="flex flex-col gap-8">
          <span>
            {t('post_content.body.the_link_youve_clicked')}{' '}
            <span className="break-all font-bold">{link}</span>
          </span>
          <span>{t('post_content.body.we_are_just_verifying')}</span>
          <Link target="_blank" rel="noopener noreferrer nofollow external" href={link}>
            <Button className="w-fit" variant="outlineRed">
              {t('post_content.body.open_link')}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
