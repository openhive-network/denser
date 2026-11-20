import { GetServerSideProps, GetServerSidePropsResult, Redirect } from 'next';
import { consentPageController } from '@smart-signer/lib/consent-page-controller';

import { getLogger } from '@ui/lib/logging';
import { OidcClientDetails } from '@smart-signer/lib/oidc';
import { useConsent } from '@smart-signer/lib/auth/use-consent';
import { PostConsentSchema } from '@smart-signer/lib/auth/utils';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/blog/i18n/client';

const logger = getLogger('app');

export default function ConsentPage({
  oidcClientDetails,
  redirectTo
}: {
  oidcClientDetails: OidcClientDetails;
  redirectTo: string;
}) {
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const registerConsentMutation = useConsent();
  const [runningAction, setRunningAction] = useState('');

  async function registerConsent(consent: boolean = false) {
    if (consent) {
      setRunningAction('yes');
    } else {
      setRunningAction('not');
    }
    if (registerConsentMutation.isPending) return;
    const data: PostConsentSchema = {
      oauthClientId: oidcClientDetails.clientId,
      consent
    };
    try {
      await registerConsentMutation.mutateAsync({ data });
      if (redirectTo) {
        location.replace(redirectTo);
      }
    } catch (error) {
      // do something
    } finally {
      setRunningAction('');
    }
  }

  return (
    isClient && (
      <div
        className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
      >
        <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
          <div className="text-lg font-bold sm:text-3xl">{t('oidc.consent_title')}</div>
          <p>
            {t('oidc.consent_request', { application: oidcClientDetails.clientName })}
            <ol>
              <li>{t('oidc.create_account')}</li>
              <li>{t('oidc.read_profile')}</li>
            </ol>
          </p>
          <p>{t('oidc.choose')}</p>
          <button
            disabled={!!runningAction}
            onClick={() => registerConsent(true)}
            className="w-fit rounded-lg bg-green-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-green-700 focus:outline-hidden disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
          >
            {runningAction === 'yes' ? (
              <CircleSpinner loading={runningAction === 'yes'} size={18} color="#dc2626" />
            ) : (
              t('oidc.consent_yes')
            )}
          </button>

          <button
            disabled={!!runningAction}
            onClick={() => registerConsent(false)}
            className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-hidden disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
          >
            {runningAction === 'no' ? (
              <CircleSpinner loading={runningAction === 'no'} size={18} color="#dc2626" />
            ) : (
              t('oidc.consent_no')
            )}
          </button>
        </div>
      </div>
    )
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result: GetServerSidePropsResult<{ [key: string]: any }> & {
    redirect?: Redirect;
    props?: { [key: string]: any };
  } = await consentPageController(ctx);
  if (Object.hasOwnProperty.call(result, 'props')) {
    const output: GetServerSidePropsResult<{ [key: string]: any }> = {
      props: {
        ...result.props
      }
    };
    return output;
  }
  return result;
};
