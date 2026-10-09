'use client';

import { useCondenserMigration } from '@smart-signer/lib/use-condenser-migration';
import { BLOG_CONDENSER_MIGRATION } from '../lib/condenser-migration';

/** Invisible component that migrates a Condenser user's login, settings and data into Denser. */
export default function CondenserMigration() {
  useCondenserMigration(BLOG_CONDENSER_MIGRATION);
  return null;
}
