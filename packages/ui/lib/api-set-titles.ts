import type { TFunction } from 'i18next';
import type { TApiSetId } from '@ui/config/api-set-ids';

/** Each API set's title in the app's language. */
export type TApiSetTitles = Readonly<Record<TApiSetId, string>>;

/** The API sets' titles with the app's `t`: the `api_sets.set_titles` keys of both apps. */
export const translateApiSetTitles = (t: TFunction): TApiSetTitles => ({
  core: t('api_sets.set_titles.core'),
  bridge: t('api_sets.set_titles.bridge'),
  lite: t('api_sets.set_titles.lite'),
  'hivemind-rest': t('api_sets.set_titles.hivemind_rest'),
  'balance-api': t('api_sets.set_titles.balance_api'),
  hafah: t('api_sets.set_titles.hafah'),
  hivesense: t('api_sets.set_titles.hivesense'),
  fyp: t('api_sets.set_titles.fyp')
});
