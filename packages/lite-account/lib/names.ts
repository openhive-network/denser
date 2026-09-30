/**
 * Lite-account names: the grammar the lite_account app enforces
 * (lowercase letters, digits, hyphens; 3..63 chars; no leading/trailing hyphen),
 * plus an adjective-noun-number generator so users need not pick one.
 */
export const LITE_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/;
export const LITE_DID_PREFIX = 'did:lite:';

export function isValidLiteName(name: string): boolean {
  return LITE_NAME_PATTERN.test(name);
}

export function liteDid(name: string): string {
  return `${LITE_DID_PREFIX}${name}`;
}

const ADJECTIVES = [
  'amber', 'bold', 'brave', 'bright', 'brisk', 'calm', 'clever', 'cosmic', 'crisp', 'daring',
  'eager', 'fair', 'fleet', 'gentle', 'glad', 'golden', 'happy', 'hardy', 'humble', 'jolly',
  'keen', 'kind', 'lively', 'lucky', 'merry', 'mighty', 'nimble', 'noble', 'plucky', 'proud',
  'quick', 'quiet', 'rapid', 'rosy', 'shiny', 'silver', 'smart', 'snowy', 'sunny', 'swift',
  'tidy', 'trusty', 'vivid', 'warm', 'wise', 'witty', 'zesty'
];

const NOUNS = [
  'badger', 'bear', 'beaver', 'bison', 'crane', 'dolphin', 'eagle', 'falcon', 'ferret', 'finch',
  'fox', 'gecko', 'heron', 'ibis', 'jaguar', 'koala', 'lemur', 'lynx', 'marten', 'moose',
  'narwhal', 'newt', 'ocelot', 'otter', 'owl', 'panda', 'parrot', 'pelican', 'puffin', 'quail',
  'rabbit', 'raven', 'robin', 'salmon', 'seal', 'sparrow', 'stoat', 'swan', 'tapir', 'tiger',
  'toucan', 'turtle', 'walrus', 'weasel', 'wombat', 'wren', 'yak', 'zebra'
];

/** Uniform random index in [0, n); uses the platform CSPRNG. */
function randomIndex(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] ?? 0) % n;
}

/** e.g. "brave-otter-4823" — valid under LITE_NAME_PATTERN by construction. */
export function generateLiteName(): string {
  const adjective = ADJECTIVES[randomIndex(ADJECTIVES.length)] ?? 'brave';
  const noun = NOUNS[randomIndex(NOUNS.length)] ?? 'otter';
  const number = 1000 + randomIndex(9000);
  return `${adjective}-${noun}-${number}`;
}
