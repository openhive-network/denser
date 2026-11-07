import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { gotoProfileLoggedIn } from '../support/followMuteContext';
import { rejectBroadcasts } from '../support/rejectBroadcasts';

/**
 * A broadcast the node rejects because the transaction expired before the signer returned it
 * (`transaction_expiration_exception`, e.g. a Peak Vault approval given too late) says nothing was
 * sent and to try again, in the UI language, with none of wax's error text. Reuses MUTE-01's
 * recording (`socialMute`) and flow, like AUTH-ERR-01.
 */

/** hived's rejection of a transaction broadcast after its expiration, trimmed of its stack. */
const TRANSACTION_EXPIRED_ERROR = {
  code: -32003,
  message: 'transaction expiration exception: now < trx_exp: ',
  data: { name: 'transaction_expiration_exception', message: 'transaction expiration exception' }
};

const MESSAGES = [
  {
    locale: 'en',
    message:
      'Your transaction expired before it was approved, so nothing was sent. Please try again and approve it within 10 minutes.'
  },
  {
    locale: 'pl',
    message:
      'Transakcja wygasła, zanim została zatwierdzona, więc nic nie zostało wysłane. Spróbuj ponownie i zatwierdź ją w ciągu 10 minut.'
  }
];

test.use({
  fixtureTestName: 'socialMute',
  authenticatedUser: {}
});

for (const { locale, message } of MESSAGES) {
  test(`TX-EXPIRED-01-${locale} — a transaction that expired before approval reads as nothing sent`, async ({
    page,
    baseURL
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL ?? '' }]);
    const broadcasts = await rejectBroadcasts(page, TRANSACTION_EXPIRED_ERROR);
    await gotoProfileLoggedIn(page);

    await new ProfilePage(page).muteButton.click();

    await expect(page.getByTestId('transaction-expired-message')).toHaveText(message);
    expect(broadcasts.count).toBeGreaterThan(0);
    await expect(page.getByText(/Wax\w*Error|transaction expiration exception/)).toHaveCount(0);
    await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
  });
}
