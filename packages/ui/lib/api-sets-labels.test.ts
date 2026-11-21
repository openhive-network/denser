import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createInstance } from 'i18next';
import { I18N_INTERPOLATION } from './i18n-interpolation.ts';
import { translateApiSetsLabels } from './api-sets-labels.ts';

const APPS = ['blog', 'wallet'] as const;

async function appLabels(app: (typeof APPS)[number], lng: string) {
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
  return translateApiSetsLabels(instance.t);
}

// The way ApiSetsComponent fills a label's `{{name}}` placeholders.
const fill = (template: string | undefined, values: Record<string, string>) =>
  (template ?? '').replace(/\{\{(\w+)\}\}/g, (match, name: string) => values[name] ?? match);

const locales = (app: string) =>
  readdirSync(new URL(`../../../apps/${app}/locales/`, import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

describe('translateApiSetsLabels', () => {
  for (const app of APPS) {
    it(`keeps the component's placeholders for it to fill in (${app}, pl)`, async () => {
      const labels = await appLabels(app, 'pl');
      assert.equal(fill(labels.yourChoiceOf, { node: 'https://api.hive.blog' }), 'Twój wybór: https://api.hive.blog');
      assert.equal(fill(labels.errors, { value: '3' }), 'Błędy: 3%');
      assert.equal(
        fill(labels.groupSplitSet, { set: 'Bridge', node: labels.noNode ?? '' }),
        'Bridge używa brak węzła'
      );
      assert.equal(
        fill(labels.fallbackNotice, { selected: 'A', set: 'Bridge', node: 'B' }),
        'A jest niedostępny dla Bridge; do czasu jego powrotu używany jest B.'
      );
    });

    it(`renders the component's own English in en (${app})`, async () => {
      const labels = await appLabels(app, 'en');
      assert.equal(labels.heading, 'API servers by API set');
      assert.equal(labels.median, 'Median: {{value}}');
      assert.equal(labels.listSeparator, ', ');
      assert.equal(labels.useEverywhere, 'Use for everything it serves');
    });

    for (const lng of locales(app)) {
      it(`resolves every label to text in ${lng} (${app})`, async () => {
        const labels = await appLabels(app, lng);
        for (const [key, value] of Object.entries(labels)) {
          assert.ok(value && !value.startsWith('api_sets.'), `${key} of ${lng} is ${value}`);
        }
      });
    }
  }
});
