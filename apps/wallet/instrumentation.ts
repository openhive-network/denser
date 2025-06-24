import {commonRegister} from '@hive/ui/lib/common-instrumentation';

export async function register(): Promise<void> {
  await commonRegister('wallet');
}
