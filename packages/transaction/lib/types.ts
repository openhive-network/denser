export type Vote = {
  voter: string;
  author: string;
  permlink: string;
  weight: number;
};

export type FlagData = {
  community: string;
  username: string;
  permlink: string;
  notes: string;
};
