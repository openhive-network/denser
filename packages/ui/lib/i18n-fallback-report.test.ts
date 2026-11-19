import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInstance } from 'i18next';
import { reportFallbacks, type I18nFallback } from './i18n-fallback-report.ts';

const RESOURCES = {
  en: {
    common: { greeting: 'Hello', farewell: 'Goodbye', apples_one: '{{count}} apple', apples_other: '{{count}} apples' },
    shared: { close: 'Close' }
  },
  pl: {
    common: { greeting: 'Cześć', apples_one: '{{count}} jabłko', apples_few: '{{count}} jabłka' },
    shared: { close: 'Zamknij' }
  }
};

/** An instance like the apps' (English fallback, a default namespace) that records what it reports. */
async function reportingInstance(lng: string) {
  const reports: I18nFallback[] = [];
  const instance = createInstance();
  await instance.init({
    ...reportFallbacks(instance, (fallback) => reports.push(fallback)),
    lng,
    fallbackLng: 'en',
    supportedLngs: ['en', 'pl'],
    ns: ['common', 'shared'],
    defaultNS: 'common',
    fallbackNS: 'common',
    resources: RESOURCES
  });
  return { instance, reports };
}

describe('reportFallbacks', () => {
  it('reports a key the language lacks and still renders the English text', async () => {
    const { instance, reports } = await reportingInstance('pl');
    assert.equal(instance.t('farewell'), 'Goodbye');
    assert.deepEqual(reports, [{ language: 'pl', namespace: 'common', key: 'farewell' }]);
  });

  it('reports nothing for keys the language has', async () => {
    const { instance, reports } = await reportingInstance('pl');
    assert.equal(instance.t('greeting'), 'Cześć');
    assert.equal(instance.t('close', { ns: 'shared' }), 'Zamknij');
    assert.equal(instance.t('apples', { count: 3 }), '3 jabłka');
    assert.deepEqual(reports, []);
  });

  it('reports a key once however often it is rendered', async () => {
    const { instance, reports } = await reportingInstance('pl');
    for (let render = 0; render < 5; render++) instance.t('farewell');
    assert.equal(reports.length, 1);
  });

  it('reports a key again for another language', async () => {
    const { instance, reports } = await reportingInstance('pl');
    instance.t('nowhere');
    await instance.changeLanguage('en');
    instance.t('nowhere');
    assert.deepEqual(
      reports.map(({ language }) => language),
      ['pl', 'en']
    );
  });

  it('reports a plural form the language lacks', async () => {
    const { instance, reports } = await reportingInstance('pl');
    assert.equal(instance.t('apples', { count: 5 }), '5 apples');
    assert.deepEqual(reports, [{ language: 'pl', namespace: 'common', key: 'apples' }]);
  });

  it('reports a key no language has, in English too', async () => {
    const { instance, reports } = await reportingInstance('en');
    assert.equal(instance.t('nowhere'), 'nowhere');
    assert.deepEqual(reports, [{ language: 'en', namespace: 'common', key: 'nowhere' }]);
  });

  it('reports the language a fixed t asks for', async () => {
    const { instance, reports } = await reportingInstance('en');
    assert.equal(instance.getFixedT('pl', 'common')('farewell'), 'Goodbye');
    assert.deepEqual(reports, [{ language: 'pl', namespace: 'common', key: 'farewell' }]);
  });
});
