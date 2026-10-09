'use client';

import { useCondenserMigration } from '@smart-signer/lib/use-condenser-migration';
import { WALLET_CONDENSER_MIGRATION } from '../lib/condenser-migration';

/** Invisible component that migrates a Condenser wallet user's login and settings into Denser wallet. */
export default function CondenserMigration() {
  useCondenserMigration(WALLET_CONDENSER_MIGRATION);
  return null;
}
