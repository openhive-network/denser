import { test, expect } from '../support/fixture-proxy-test';
import { gotoTrendingLoggedIn, expectFirstPostDownvotedState } from '../support/postVotingContext';

/**
 * Logged in, a voted arrow stays a named button in the Tab order: Enter and Space open the vote
 * removal dialog, and closing it with Esc returns focus to the arrow.
 *
 * Fixture set: `postVoting_downvoted` (first post carries a 100% downvote, no slider).
 */

test.use({
  fixtureTestName: 'postVoting_downvoted',
  authenticatedUser: {}
});

test.describe('Voted arrow keyboard access', () => {
  test('VOTE-KB-01: the voted arrow is reachable with Tab and opens the removal dialog', async ({ page }) => {
    await gotoTrendingLoggedIn(page);
    await expectFirstPostDownvotedState(page);

    const upvote = page.getByTestId('upvote-button').first().getByRole('button', { name: 'Upvote', exact: true });
    const downvote = page
      .getByTestId('downvote-button')
      .first()
      .getByRole('button', { name: 'Undo your downvote', exact: true });
    const removalDialog = page.getByRole('alertdialog');

    await upvote.focus();
    await page.keyboard.press('Tab');
    await expect(downvote).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(removalDialog).toBeVisible();
    await expect(page.getByTestId('vote-removal-dialog-header')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(removalDialog).toBeHidden();
    await expect(downvote).toBeFocused();

    await page.keyboard.press('Space');
    await expect(removalDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(removalDialog).toBeHidden();
    await expect(downvote).toBeFocused();
  });
});
