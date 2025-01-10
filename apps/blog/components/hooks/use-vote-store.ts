import { StateCreator, create } from 'zustand';

type VoteStore = {
  vote: number[];
  changeVote: (e: number[]) => void;
};

const voteStoreSlice: StateCreator<VoteStore> = (set) => ({
  vote: [100],
  changeVote: (e: number[]) => set(() => ({ vote: e }))
});

export const useUpVoteStore = create(voteStoreSlice);

export const useDownVoteStore = create(voteStoreSlice);
