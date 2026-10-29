import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { liteSocialErrorKey, liteSocialFailure, relaysLiteSocial, socialTargetDid } = await import(
  './lite-social-state.ts'
);
const { applyLiteSocialAction, EMPTY_LITE_RELATIONS, followCountDelta, shiftFollowCount, showsLiteSocialAction } = await import(
  './lite-social-cache.ts'
);

type RelayInfo = Parameters<typeof relaysLiteSocial>[0];

const relay = (apps?: Record<string, string[]>): RelayInfo => ({
  enabled: true,
  gate_account: 'test-gateway-4',
  chain_id: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' },
  limits: apps ? { l2: { apps } } : {}
});

const failure = (code: string, retryAfterS?: number) => Object.assign(new Error(code), { code, retryAfterS });

describe('socialTargetDid', () => {
  it('names a Hive account as did:hive and keeps a DID', () => {
    assert.equal(socialTargetDid('test-gateway-1'), 'did:hive:test-gateway-1');
    assert.equal(socialTargetDid('did:lite:bob'), 'did:lite:bob');
    assert.equal(socialTargetDid('did:hive:alice'), 'did:hive:alice');
  });
});

describe('relaysLiteSocial', () => {
  const social = { lite_social_test: ['follow', 'unfollow', 'reblog'] };

  it("offers a method the gateway relays for the node's social app", () => {
    assert.equal(relaysLiteSocial(relay(social), 'lite_social_test', 'follow'), true);
    assert.equal(relaysLiteSocial(relay(social), 'lite_social_test', 'reblog'), true);
  });

  it('offers nothing without the social app, a gateway, the app among its L2 apps or the method', () => {
    assert.equal(relaysLiteSocial(relay(social), null, 'follow'), false);
    assert.equal(relaysLiteSocial(relay(social), 'lite_social', 'follow'), false);
    assert.equal(relaysLiteSocial(relay(social), 'lite_social_test', 'subscribe'), false);
    assert.equal(relaysLiteSocial(relay(), 'lite_social_test', 'follow'), false);
    assert.equal(relaysLiteSocial({ enabled: false }, 'lite_social_test', 'follow'), false);
    assert.equal(relaysLiteSocial(undefined, 'lite_social_test', 'follow'), false);
  });
});

describe('liteSocialErrorKey / liteSocialFailure', () => {
  it('explains each gateway error, identity errors alike', () => {
    assert.equal(liteSocialErrorKey('rate_limited'), 'rate_limited');
    assert.equal(liteSocialErrorKey('auth_failed'), 'identity');
    assert.equal(liteSocialErrorKey('wrong_signer'), 'identity');
    assert.equal(liteSocialErrorKey('method_not_relayed'), 'not_relayed');
    assert.equal(liteSocialErrorKey('pool_busy'), 'busy');
    assert.equal(liteSocialErrorKey('broadcast_failed'), 'unavailable');
    assert.equal(liteSocialErrorKey('teapot'), 'unknown');
    assert.equal(liteSocialErrorKey(undefined), 'unknown');
  });

  it('reads the code and a positive retry from a relay failure only', () => {
    assert.deepEqual(liteSocialFailure(failure('rate_limited', 30)), { code: 'rate_limited', retryAfterS: 30 });
    assert.deepEqual(liteSocialFailure(failure('rate_limited', 0)), { code: 'rate_limited', retryAfterS: undefined });
    assert.equal(liteSocialFailure(new Error('plain')), undefined);
  });
});

describe('lite relations cache', () => {
  const follow = { method: 'follow' as const, target: 'alice' };
  const unfollow = { method: 'unfollow' as const, target: 'alice' };

  it('applies follows, mutes and subscriptions and leaves other actions alone', () => {
    const followed = applyLiteSocialAction(EMPTY_LITE_RELATIONS, follow);
    assert.deepEqual(followed.following, ['alice']);
    assert.deepEqual(applyLiteSocialAction(followed, follow).following, ['alice']);
    assert.deepEqual(applyLiteSocialAction(followed, unfollow).following, []);
    assert.deepEqual(applyLiteSocialAction(EMPTY_LITE_RELATIONS, { method: 'mute', target: 'did:lite:bob' }).muted, ['did:lite:bob']);
    assert.deepEqual(applyLiteSocialAction(EMPTY_LITE_RELATIONS, { method: 'subscribe', community: 'hive-1' }).subscriptions, ['hive-1']);
    const reblog = { method: 'reblog' as const, author: 'a', permlink: 'p' };
    assert.equal(applyLiteSocialAction(followed, reblog), followed);
  });

  it('tells whether a read already shows the action', () => {
    const followed = applyLiteSocialAction(EMPTY_LITE_RELATIONS, follow);
    assert.equal(showsLiteSocialAction(followed, follow), true);
    assert.equal(showsLiteSocialAction(EMPTY_LITE_RELATIONS, follow), false);
    assert.equal(showsLiteSocialAction(EMPTY_LITE_RELATIONS, unfollow), true);
  });

  it('moves the follow counts by a follow or an unfollow, never below zero', () => {
    assert.equal(followCountDelta(follow), 1);
    assert.equal(followCountDelta(unfollow), -1);
    assert.equal(followCountDelta({ method: 'mute', target: 'alice' }), 0);
    const stats = { account: 'alice', follower_count: 0, following_count: 3 };
    assert.deepEqual(shiftFollowCount(stats, 'follower_count', -1), stats);
    assert.equal(shiftFollowCount(stats, 'following_count', 1).following_count, 4);
  });
});
