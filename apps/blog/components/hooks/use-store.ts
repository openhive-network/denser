import { create } from 'zustand';

type Store = {
  downvote: number[];
  upvote: number[];
  changeDownvote: (e: number[]) => void;
  changeUpvote: (e: number[]) => void;
};

export const useStore = create<Store>()((set) => ({
  upvote: [100],
  downvote: [100],
  changeUpvote: (e: number[]) => set(() => ({ upvote: e })),
  changeDownvote: (e: number[]) => set(() => ({ downvote: e }))
}));
