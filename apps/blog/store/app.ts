import { FullAccount } from '@hive/ui/store/app-types';
import { KeyAuthorityType } from '@hive/hb-auth';
import { create } from 'zustand';
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface AppState {
  currentProfile: FullAccount | null;
  setCurrentProfile: (currentProfile: FullAccount | null) => void;
  currentProfileKeyType: KeyAuthorityType | null;
  setCurrentProfileKeyType: (currentProfileKeyType: KeyAuthorityType | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProfile: null,
  setCurrentProfile: (currentProfile) => set(() => ({ currentProfile })),
  currentProfileKeyType: null,
  setCurrentProfileKeyType: (currentProfileKeyType) => set(() => ({ currentProfileKeyType }))
}));

if (process.env.NODE_ENV === 'development') {
  mountStoreDevtool('AppStore', useAppStore);
}
