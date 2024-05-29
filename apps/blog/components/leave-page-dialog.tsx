import { Dialog, DialogContent } from '@ui/components/dialog';
import { Button, Separator } from '@ui/components';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';

export function LeavePageDialog({
  link,
  open,
  setOpen
}: {
  link: string;
  open: boolean;
  setOpen: (e: boolean) => void;
}) {
  const { t } = useTranslation('common_blog');
  return (
    <Dialog open={open} onOpenChange={() => setOpen(!open)}>
      <DialogContent className="overflow-auto">
        <div className="text-2xl">{t('post_content.body.leave_this_app')}</div>
        <Separator />
        <div className="flex flex-col gap-8">
          <span>
            {t('post_content.body.the_link_youve_clicked')} <span className="font-bold">{link}</span>
          </span>
          <span>{t('post_content.body.we_are_just_verifying')}</span>
          <Link target="_blank" href={link}>
            <Button className="w-fit" variant="outlineRed" onClick={() => setOpen(false)}>
              {t('post_content.body.open_link')}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
