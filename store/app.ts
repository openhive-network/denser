import { FullAccount } from '@/store/app-types';
import { create } from 'zustand';
import { mountStoreDevtool } from 'simple-zustand-devtools';

interface AppState {
  currentProfile: FullAccount | null;
  setCurrentProfile: (currentProfile: FullAccount | null) => void;
  config: any;
  setConfig: (config: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProfile: null,
  setCurrentProfile: (currentProfile) => set(() => ({ currentProfile })),
  config: null,
  setConfig: (config: any) => ({ config })
}));

if (process.env.NODE_ENV === 'development') {
  mountStoreDevtool('AppStore', useAppStore);
}
