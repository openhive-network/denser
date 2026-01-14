import { FullAccount } from '@hive/common-hiveio-packages/wax';

export interface BaseAccount {
  name: string;
  __loaded?: false;
}

export type Account = FullAccount | BaseAccount;

export type Accounts = Account[];
