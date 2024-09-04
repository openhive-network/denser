import { GetServerSideProps, GetServerSidePropsResult, Redirect } from 'next';
import { consentPageController } from '@smart-signer/lib/consent-page-controller';
import { getTranslations } from '../../../lib/get-translations';
import { getLogger } from '@ui/lib/logging';
import { oidc, OidcClientDetails } from '@smart-signer/lib/oidc';
import { useConsent } from "@smart-signer/lib/auth/use-consent";
import { postConsentSchema, PostConsentSchema } from '@smart-signer/lib/auth/utils';
import { CircleSpinner } from 'react-spinners-kit';
import { useEffect, useState } from 'react';

const logger = getLogger('app');

export default function ConsentPage({
  oidcClientDetails,
  redirectTo
}: {
  oidcClientDetails: OidcClientDetails;
  redirectTo: string;
}) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  logger.info('oidcClientDetails: %o', oidcClientDetails)

  const registerConsentMutation = useConsent();
  const [runningAction, setRunningAction] = useState('');

  async function registerConsent(consent: boolean = false) {
    if (consent) {
      setRunningAction('yes');
    } else {
      setRunningAction('not');
    }
    if (registerConsentMutation.isLoading) return;
    const data: PostConsentSchema = {
      oauthClientId: oidcClientDetails.clientId,
      consent,
    };
    try {
      await registerConsentMutation.mutateAsync({ data });
      if (redirectTo) {
        logger.info('ConsentPage redirecting to: %s', redirectTo);
        location.replace(redirectTo);
      }
    } catch (error) {
      // do something
    } finally {
      setRunningAction('');
    }
  }

  return isClient &&
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
        sm:justify-around sm:gap-0"
    >
      <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
        <div className="text-lg font-bold sm:text-3xl">Consent</div>
          <p>
            We need your consent in Oauth flow for application
            {oidcClientDetails.clientName}.
            This application wants to:
            <ol>
              <li>
                Create an account for you.
              </li>
              <li>
                Know your Hive public user profile details.
              </li>
            </ol>
          </p>
          <p>
            Please click the appropriate button below:
          </p>
        <button
          disabled={!!runningAction}
          onClick={() => registerConsent(true)}
          className="w-fit rounded-lg bg-green-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-green-700 focus:outline-none disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
        >
          {runningAction === 'yes' ? (
            <CircleSpinner
              loading={runningAction === 'yes'}
              size={18}
              color="#dc2626"
            />
          ) : (
            'Yes, I consent'
          )}
        </button>

        <button
          disabled={!!runningAction}
          onClick={() => registerConsent(false)}
          className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
        >
          {runningAction === 'no' ? (
            <CircleSpinner
              loading={runningAction === 'no'}
              size={18}
              color="#dc2626"
            />
          ) : (
            'No, I do not consent'
          )}
        </button>

      </div>
    </div>
  ;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result: GetServerSidePropsResult<{ [key: string]: any }> & { redirect?: Redirect, props?: { [key: string]: any } }
      = await consentPageController(ctx);
  if (Object.hasOwnProperty.call(result, 'props')) {
    const output: GetServerSidePropsResult<{ [key: string]: any }> = {
      props: {
        ...result.props,
        ...(await getTranslations(ctx)),
      },
    };
    return output;
  }
  return result;
};
