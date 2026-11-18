import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The configured endpoint reads the runtime env, which does not load under node: stand in a fixed one.
const PUBLIC_VARS_MODULE = "data:text/javascript,export const configuredImagesEndpoint = 'https://images.example';";
const PATH_UTILS_MODULE = 'data:text/javascript,export const getImageSrc = (path) => path;';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@hive/ui/config/public-vars') return { url: PUBLIC_VARS_MODULE, shortCircuit: true };
    if (specifier === './path-utils') return { url: PATH_UTILS_MODULE, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { getUserAvatarUrl, getUserAvatarUrlWithDimensions } = await import('./avatar-utils.ts');

describe('avatar URLs', () => {
  it('carry no query without a version', () => {
    assert.equal(getUserAvatarUrl('alice', 'small'), 'https://images.example/u/alice/avatar/small');
    assert.equal(getUserAvatarUrlWithDimensions('alice', 64, 64), 'https://images.example/u/alice/avatar');
  });

  it('carry the version as ?v= when one is given', () => {
    assert.equal(
      getUserAvatarUrl('alice', 'large', 1763500000000),
      'https://images.example/u/alice/avatar/large?v=1763500000000'
    );
    assert.equal(
      getUserAvatarUrlWithDimensions('alice', 64, 64, 1763500000000),
      'https://images.example/u/alice/avatar?v=1763500000000'
    );
  });

  it('keep the local placeholder for a lite account, version or not', () => {
    assert.equal(getUserAvatarUrl('did:lite:alice', 'small', 1763500000000), '/defaultavatar.png');
  });
});
