import { KeyType } from '@smart-signer/types/common';
import { create } from 'zustand';
import { mountStoreDevtool } from 'simple-zustand-devtools';
import { FullAccount } from '@transaction/lib/app-types';

interface AppState {
  currentProfile: FullAccount | null;
  setCurrentProfile: (currentProfile: FullAccount | null) => void;
  currentProfileKeyType: KeyType | null;
  setCurrentProfileKeyType: (currentProfileKeyType: KeyType | null) => void;
  lastReadNotificationDate: number;
  setLastReadNotificationDate: (lastReadNotificationDate: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProfile: null,
  setCurrentProfile: (currentProfile) => set(() => ({ currentProfile })),
  currentProfileKeyType: null,
  setCurrentProfileKeyType: (currentProfileKeyType) => set(() => ({ currentProfileKeyType })),
  lastReadNotificationDate: 0,
  setLastReadNotificationDate: (lastReadNotificationDate) => set(() => ({ lastReadNotificationDate }))
}));

if (process.env.NODE_ENV === 'development') {
  mountStoreDevtool('AppStore', useAppStore);
}
