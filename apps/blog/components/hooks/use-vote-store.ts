import { create } from 'zustand';

type Store = {
  vote: number[];
  changeVote: (e: number[]) => void;
};

export const useUpVoteStore = create<Store>()((set) => ({
  vote: [100],
  changeVote: (e: number[]) => set(() => ({ vote: e }))
}));

export const useDownVoteStore = create<Store>()((set) => ({
  vote: [100],
  changeVote: (e: number[]) => set(() => ({ vote: e }))
}));
