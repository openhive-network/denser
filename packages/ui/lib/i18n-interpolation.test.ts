import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInstance } from 'i18next';
import { addI18nFormatters, I18N_INTERPOLATION } from './i18n-interpolation.ts';

async function translate(template: string, values: Record<string, string>): Promise<string> {
  const instance = createInstance();
  await instance.init({
    lng: 'en',
    resources: { en: { translation: { key: template } } },
    interpolation: I18N_INTERPOLATION
  });
  addI18nFormatters(instance);
  return instance.t('key', values);
}

describe('I18N_INTERPOLATION', () => {
  it('leaves a rate with a slash as plain text', async () => {
    const text = await translate('{{operation}} at least {{hive}} HIVE for {{hbd}} HBD ({{rate}})?', {
      operation: 'Sell',
      hive: '0.001',
      hbd: '0.001',
      rate: '1.000000/HIVE'
    });
    assert.equal(text, 'Sell at least 0.001 HIVE for 0.001 HBD (1.000000/HIVE)?');
  });

  it('leaves HTML-significant characters for the renderer to escape', async () => {
    assert.equal(await translate('{{value}}', { value: `a & b <c> "d" 'e'` }), `a & b <c> "d" 'e'`);
  });

  it('capitalizes a value formatted with capitalize', async () => {
    assert.equal(
      await translate('Twój prywatny klucz {{keyType, capitalize}}', { keyType: 'active' }),
      'Twój prywatny klucz Active'
    );
    assert.equal(await translate('Your {{keyType}} private key', { keyType: 'active' }), 'Your active private key');
  });
});
