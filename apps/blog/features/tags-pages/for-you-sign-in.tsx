'use client';

import { Button } from '@ui/components/button';
import DialogLogin from '@/blog/components/dialog-login';
import { useTranslation } from '@/blog/i18n/client';

/** What /for-you shows a signed-out reader: the feed is personal, so they are asked to sign in. */
const ForYouSignIn = () => {
  const { t } = useTranslation('common_blog');
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-12 text-center"
      data-testid="for-you-sign-in"
    >
      <p className="text-lg text-primary/70">{t('for_you_feed.sign_in_prompt')}</p>
      <DialogLogin>
        <Button variant="redHover" data-testid="for-you-sign-in-button">
          {t('navigation.main_nav_bar.login')}
        </Button>
      </DialogLogin>
    </div>
  );
};

export default ForYouSignIn;
