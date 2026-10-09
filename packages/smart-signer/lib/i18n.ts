export const SMART_SIGNER_NAMESPACE = 'smart-signer';

/** Loads the smart-signer translations of `language`; apps route `SMART_SIGNER_NAMESPACE` here. */
export const loadSmartSignerTranslations = (language: string) =>
  import(`../locales/${language}/smart-signer.json`);
