import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { translateNotificationMessage } = await import('./notification-message.ts');

const TRANSLATIONS: Record<string, string> = {
  'user_profile.notifications_tab.voted_on_your_post': '@{{username}} voted on your post {{amount}}',
  'user_profile.notifications_tab.mentioned_you': '@{{username}} mentioned you',
  'user_profile.notifications_tab.mentioned_you_and_others': '@{{username}} mentioned you and {{others}} others',
  'user_profile.notifications_tab.subscribed_to': '@{{username}} subscribed to {{community}}',
  'user_profile.notifications_tab.followed_you': '@{{username}}さんがあなたをフォローしました'
};

function fakeT(key: string, options: Record<string, string>): string {
  return TRANSLATIONS[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => options[name]);
}

describe('translateNotificationMessage', () => {
  it('splits the translation around the source account', () => {
    assert.deepEqual(translateNotificationMessage(' mentioned you', fakeT), { before: '', after: ' mentioned you' });
  });

  it('tells a plain mention from one with others', () => {
    assert.deepEqual(translateNotificationMessage(' mentioned you and 12 others', fakeT), {
      before: '',
      after: ' mentioned you and 12 others'
    });
  });

  it('passes the vote amount and community name through', () => {
    assert.deepEqual(translateNotificationMessage(' voted on your post ($0.01)', fakeT), {
      before: '',
      after: ' voted on your post ($0.01)'
    });
    assert.deepEqual(translateNotificationMessage(' subscribed to Photography Lovers', fakeT), {
      before: '',
      after: ' subscribed to Photography Lovers'
    });
  });

  it('keeps text glued to the account', () => {
    assert.deepEqual(translateNotificationMessage(' followed you', fakeT), {
      before: '',
      after: 'さんがあなたをフォローしました'
    });
  });

  it('returns null for wording it does not know', () => {
    assert.equal(translateNotificationMessage(' flagged a post - Stolen images', fakeT), null);
    assert.equal(translateNotificationMessage(' mentioned you and 1 other', fakeT), null);
  });
});
