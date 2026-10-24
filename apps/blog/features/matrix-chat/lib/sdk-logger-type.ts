import type { ICreateClientOpts } from 'matrix-js-sdk';

/** The logger a Matrix client logs through (the SDK exports no name for its type) */
export type MatrixSdkLogger = NonNullable<ICreateClientOpts['logger']>;
