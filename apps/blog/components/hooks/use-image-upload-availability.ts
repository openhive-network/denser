import { MouseEvent, useCallback } from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { canSignBinaryChallenge } from '@smart-signer/lib/signer/binary-challenge';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from '@/blog/i18n/client';

/**
 * Whether the signed-in user's login method can sign image uploads, and a
 * toast explaining why it can't. `preventFilePicker` is an `onClick` for a
 * file input that keeps the picker closed when uploads are unavailable.
 */
export const useImageUploadAvailability = () => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const canUploadImages = canSignBinaryChallenge(user.loginType);

  const notifyUploadUnavailable = useCallback(() => {
    toast({
      title: t('submit_page.image_upload_unavailable', {
        method: t(`navigation.user_menu.login_method.${user.loginType}`)
      }),
      variant: 'destructive'
    });
  }, [t, user.loginType]);

  const preventFilePicker = useCallback(
    (event: MouseEvent<HTMLInputElement>) => {
      if (canUploadImages) return;
      event.preventDefault();
      notifyUploadUnavailable();
    },
    [canUploadImages, notifyUploadUnavailable]
  );

  return { canUploadImages, notifyUploadUnavailable, preventFilePicker };
};
