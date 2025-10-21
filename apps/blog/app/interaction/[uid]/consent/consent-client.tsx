'use client';

import { useConsent } from '@smart-signer/lib/auth/use-consent';
import { PostConsentSchema } from '@smart-signer/lib/auth/utils';
import { CircleSpinner } from 'react-spinners-kit';
import { useState } from 'react';
import { OidcClientDetails } from '@smart-signer/lib/oidc';

interface ConsentClientProps {
  oidcClientDetails: OidcClientDetails;
  redirectTo: string;
}

export default function ConsentClient({ oidcClientDetails, redirectTo }: ConsentClientProps) {
  const registerConsentMutation = useConsent();
  const [runningAction, setRunningAction] = useState('');

  async function registerConsent(consent: boolean = false) {
    if (consent) {
      setRunningAction('yes');
    } else {
      setRunningAction('no');
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
    <div
      className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row
      sm:justify-around sm:gap-0"
    >
      <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
        <div className="text-lg font-bold sm:text-3xl">Consent</div>
        <p>
          We need your consent in Oauth flow for application <strong>{oidcClientDetails.clientName}</strong>.
          This application wants to:
          <ol className="ml-4 mt-2 list-decimal">
            <li>Create an account for you.</li>
            <li>Know your Hive public user profile details.</li>
          </ol>
        </p>
        <p>Please click the appropriate button below:</p>
        <button
          disabled={!!runningAction}
          onClick={() => registerConsent(true)}
          className="w-fit rounded-lg bg-green-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-green-700 focus:outline-none disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
        >
          {runningAction === 'yes' ? (
            <CircleSpinner loading={runningAction === 'yes'} size={18} color="#dc2626" />
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
            <CircleSpinner loading={runningAction === 'no'} size={18} color="#dc2626" />
          ) : (
            'No, I do not consent'
          )}
        </button>
      </div>
    </div>
  );
}
