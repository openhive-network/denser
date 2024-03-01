import { FullAccount } from '@ui/store/app-types';

export interface BaseAccount {
  name: string;
  __loaded?: false;
}

export type Account = FullAccount | BaseAccount;

export type Accounts = Account[];
