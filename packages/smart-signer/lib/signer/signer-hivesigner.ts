import { TTransactionPackType } from '@hive/wax';
import { SignChallenge, Signer, SignerOptions, SignTransaction } from './signer';

export class SignerHiveSigner extends Signer {
  constructor(signerOptions: SignerOptions, pack: TTransactionPackType = TTransactionPackType.LEGACY) {
    super(signerOptions, pack);
  }

  destroy(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  signChallenge(arg: SignChallenge): Promise<string> {
    throw new Error('Method not implemented.');
  }
  signTransaction(arg: SignTransaction): Promise<string> {
    throw new Error(
      'This method is not supported by HiveSigner, please handle transactions separately using HiveSigner SDK.'
    );
  }
}
