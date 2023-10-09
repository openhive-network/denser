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
      (
        | "claim_reward_balance"
        | "transfer"
        | "transfer_from_savings"
        | "transfer_to_savings"
        | "interest"
        | "cancel_transfer_from_savings"
        | "fill_order"
        | "transfer_to_vesting"
      ),
      {
        open_pays?: string;
        current_pays?: string;
        owner?: string;
        is_saved_into_hbd_balance?: boolean;
        interest: string;
        request_id?: number;
        amount?: string;
        from?: string;
        memo?: string;
        to?: string;
        account?: string;
        reward_hbd?: string;
        reward_hive?: string;
        reward_vests?: string;
      },
    ];
  },
];
