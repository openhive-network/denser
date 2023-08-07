export type AccountHistory = [
  number,
  {
    trx_id: string;
    block: number;
    trx_in_block: number;
    op_in_trx: number;
    virtual_op: boolean;
    timestamp: string;
    op?: [
      "claim_reward_balance" | "transfer",
      {
        amount?: string;
        from?: string;
        memo?: string;
        to?: string;
        account?: string;
        reward_hbd?: string;
        reward_hive?: string;
        reward_vests?: string;
      }
    ];
  }
];
