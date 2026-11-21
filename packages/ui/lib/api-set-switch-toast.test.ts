import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { createInstance } from 'i18next';
import { I18N_INTERPOLATION } from './i18n-interpolation.ts';

const toasts: { description?: string }[] = [];
(globalThis as unknown as { recordToast: (props: { description?: string }) => void }).recordToast = (props) =>
  toasts.push(props);

// The package's path aliases, and a toast that records what it is asked to show.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@ui/components/hooks/use-toast')
      return { url: 'data:text/javascript,export const toast = (p) => globalThis.recordToast(p);', shortCircuit: true };
    if (specifier === '@transaction/lib/api-node-switch')
      return nextResolve(new URL('../../transaction/lib/api-node-switch.ts', import.meta.url).href, context);
    if (specifier === '@ui/lib/api-set-titles') return nextResolve('./api-set-titles.ts', context);
    return nextResolve(specifier, context);
  }
});

const { toastApiSetSwitches } = await import('./api-set-switch-toast.ts');
const { translateApiSetTitles } = await import('./api-set-titles.ts');
const { announceApiNodeSwitch } = await import('../../transaction/lib/api-node-switch.ts');

const SELECTED = 'https://api.hive.blog';
const FALLBACK = 'https://api.openhive.network';

async function appText(app: 'blog' | 'wallet', lng: string) {
  const ns = `common_${app}`;
  const file = new URL(`../../../apps/${app}/locales/${lng}/${ns}.json`, import.meta.url);
  const instance = createInstance();
  await instance.init({
    lng,
    ns,
    defaultNS: ns,
    resources: { [lng]: { [ns]: JSON.parse(readFileSync(file, 'utf8')) } },
    interpolation: I18N_INTERPOLATION
  });
  const t = instance.t;
  return {
    setTitles: translateApiSetTitles(t),
    describe: ({ node, selected, setTitle }: { node: string; selected: string; setTitle: string }) =>
      t('api_sets.node_unavailable', { selected, set: setTitle, node })
  };
}

describe('toastApiSetSwitches', () => {
  beforeEach(() => {
    toasts.length = 0;
  });

  for (const app of ['blog', 'wallet'] as const) {
    it(`toasts a failover in Polish with the Polish API-set title (${app})`, async () => {
      const text = await appText(app, 'pl');
      const unsubscribe = toastApiSetSwitches(() => text);
      announceApiNodeSwitch(FALLBACK, { setId: 'balance-api', selected: SELECTED });
      unsubscribe();
      assert.deepEqual(toasts, [
        {
          description: `${SELECTED} jest niedostępny dla API sald; do czasu jego powrotu używany jest ${FALLBACK}.`
        }
      ]);
    });
  }

  it('names the set in the text given at the time of the switch', async () => {
    const texts = { current: await appText('blog', 'en') };
    const unsubscribe = toastApiSetSwitches(() => texts.current);
    texts.current = await appText('blog', 'pl');
    announceApiNodeSwitch(FALLBACK, { setId: 'lite', selected: SELECTED });
    unsubscribe();
    assert.match(toasts[0]?.description ?? '', / dla Konta lite; /);
  });

  it('toasts nothing for a switch away from a node the user did not choose', async () => {
    const text = await appText('blog', 'pl');
    const unsubscribe = toastApiSetSwitches(() => text);
    announceApiNodeSwitch(FALLBACK);
    unsubscribe();
    assert.deepEqual(toasts, []);
  });
});
