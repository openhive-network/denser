import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/** WebAuthn's signal methods, which tell the passkey providers what the relying party knows */
type PasskeySignals = {
  signalUnknownCredential?: (options: { rpId: string; credentialId: string }) => Promise<void>;
  signalAllAcceptedCredentials?: (options: { rpId: string; userId: string; allAcceptedCredentialIds: string[] }) => Promise<void>;
};

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The browser's signal methods; none outside a browser or before it has them */
function signals(): PasskeySignals {
  return typeof PublicKeyCredential === 'undefined' ? {} : PublicKeyCredential;
}

/** Signals are advice to the provider: a browser refusing one changes nothing the app relies on */
async function send(name: string, signal: () => Promise<void>): Promise<void> {
  try {
    await signal();
  } catch (error) {
    logger.info('Passkey %s signal not sent: %s', name, error instanceof Error ? error.message : String(error));
  }
}

/** Tells the providers that `credentialId` no longer unlocks anything, so they can hide it */
export async function signalUnknownPasskey(rpId: string, credentialId: Uint8Array): Promise<void> {
  const { signalUnknownCredential } = signals();
  if (typeof signalUnknownCredential !== 'function') return;
  await send('unknown-credential', () =>
    signalUnknownCredential.call(PublicKeyCredential, { rpId, credentialId: base64url(credentialId) })
  );
}

/**
 * Tells the providers that `credentialId` is the one passkey of the user handle `userId`, so they
 * can hide the others of that handle
 */
export async function signalAcceptedPasskey(rpId: string, userId: Uint8Array, credentialId: Uint8Array): Promise<void> {
  const { signalAllAcceptedCredentials } = signals();
  if (typeof signalAllAcceptedCredentials !== 'function') return;
  await send('all-accepted-credentials', () =>
    signalAllAcceptedCredentials.call(PublicKeyCredential, {
      rpId,
      userId: base64url(userId),
      allAcceptedCredentialIds: [base64url(credentialId)]
    })
  );
}
