export type FlagData = {
  community: string;
  username: string;
  permlink: string;
  notes: string;
};

export interface IProposal {
  creator: string;
  daily_pay: {
    amount: string;
    nai: string;
    precision: number;
  };
  end_date: string;
  id: number;
  permlink: string;
  proposal_id: number;
  receiver: string;
  start_date: string;
  status: string;
  subject: string;
  total_votes: string;
}

export type ProposalData = Omit<IProposal, 'daily_pay' | 'total_votes'> & {
  total_votes: Big;
  daily_pay: { amount: Big };
};
