import type { TFunction } from 'i18next';
import type { LoginType } from '@smart-signer/types/common';
import { HIVE_BRIDGE_URL } from '@smart-signer/lib/google-drive-urls';
import { keyChangeFollowUp } from '@/wallet/lib/account-keys';
import { useTranslation } from '@/wallet/i18n/client';

/** What the user has to do after the account's keys change, for a session signed in by `loginType`. */
export function keyChangeFollowUpText(t: TFunction<'common_wallet'>, loginType: `${LoginType}`): string {
  const followUp = keyChangeFollowUp(loginType);
  if (followUp !== 'update_wallet') return t(`account_keys.follow_up.${followUp}`);
  return t('account_keys.follow_up.update_wallet', { wallet: t(`navigation.user_menu.login_method.${loginType}`) });
}

/** `keyChangeFollowUpText` as a paragraph, with a link to Hive Bridge for the Google Drive wallet. */
const KeyChangeFollowUp = ({ loginType }: { loginType: `${LoginType}` }) => {
  const { t } = useTranslation('common_wallet');
  return (
    <p data-testid="key-change-follow-up">
      {keyChangeFollowUpText(t, loginType)}
      {keyChangeFollowUp(loginType) === 'update_google_drive' ? (
        <>
          {' '}
          <a href={HIVE_BRIDGE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-destructive">
            {t('account_keys.open_hive_bridge')}
          </a>
        </>
      ) : null}
    </p>
  );
};

export default KeyChangeFollowUp;
