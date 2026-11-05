/** Thrown for an amount with more decimal places than its asset's precision: nothing was signed or sent. */
export class AssetPrecisionError extends Error {
  constructor(
    readonly token: string,
    readonly precision: number
  ) {
    super(`There should be maximum of ${precision} decimal places in ${token} amount`);
    this.name = 'AssetPrecisionError';
  }
}
