import {
  OperationVisitor,
  account_create,
  account_create_with_delegation,
  account_update,
  account_update2,
  account_witness_proxy,
  account_witness_vote,
  cancel_transfer_from_savings,
  change_recovery_account,
  claim_account,
  claim_reward_balance,
  collateralized_convert,
  comment,
  comment_options,
  convert,
  create_claimed_account,
  create_proposal,
  custom,
  custom_json,
  decline_voting_rights,
  delegate_vesting_shares,
  delete_comment,
  escrow_approve,
  escrow_dispute,
  escrow_release,
  escrow_transfer,
  feed_publish,
  limit_order_cancel,
  limit_order_create,
  limit_order_create2,
  operation,
  pow,
  pow2,
  recover_account,
  recurrent_transfer,
  remove_proposal,
  request_account_recovery,
  set_withdraw_vesting_route,
  transfer,
  transfer_from_savings,
  transfer_to_savings,
  transfer_to_vesting,
  update_proposal,
  update_proposal_votes,
  vote,
  withdraw_vesting,
  witness_block_approve,
  witness_set_properties,
  witness_update
} from '@hiveio/wax';

export class AccountOperationVisitor extends OperationVisitor<operation | void> {
  public constructor(private readonly account: string) {
    super();
  }

  public vote(op: vote): operation | void {
    if (op.author === this.account || op.voter === this.account)
      return {
        vote: op
      };
  }

  public comment(op: comment): operation | void {
    if (op.author === this.account || op.parent_author === this.account)
      return {
        comment: op
      };
  }

  public transfer(op: transfer): operation | void {
    if (op.from_account === this.account || op.to_account === this.account)
      return {
        transfer: op
      };
  }

  public transfer_to_vesting(op: transfer_to_vesting): operation | void {
    if (op.from_account === this.account || op.to_account === this.account)
      return {
        transfer_to_vesting: op
      };
  }

  public withdraw_vesting(op: withdraw_vesting): operation | void {
    if (op.account === this.account)
      return {
        withdraw_vesting: op
      };
  }

  public limit_order_create(op: limit_order_create): operation | void {
    if (op.owner === this.account)
      return {
        limit_order_create: op
      };
  }

  public limit_order_cancel(op: limit_order_cancel): operation | void {
    if (op.owner === this.account)
      return {
        limit_order_cancel: op
      };
  }

  public feed_publish(op: feed_publish): operation | void {
    if (op.publisher === this.account)
      return {
        feed_publish: op
      };
  }

  public convert(op: convert): operation | void {
    if (op.owner === this.account)
      return {
        convert: op
      };
  }

  public account_create(op: account_create): operation | void {
    if (op.creator === this.account || op.new_account_name === this.account)
      // XXX: Posting, owner etc.
      return {
        account_create: op
      };
  }

  public account_update(op: account_update): operation | void {
    if (op.account === this.account)
      return {
        account_update: op
      };
  }

  public witness_update(op: witness_update): operation | void {
    if (op.owner === this.account)
      return {
        witness_update: op
      };
  }

  public account_witness_vote(op: account_witness_vote): operation | void {
    if (op.account === this.account || op.witness === this.account)
      return {
        account_witness_vote: op
      };
  }

  public account_witness_proxy(op: account_witness_proxy): operation | void {
    if (op.account === this.account || op.proxy === this.account)
      return {
        account_witness_proxy: op
      };
  }

  public pow(op: pow): operation | void {
    if (op.worker_account === this.account)
      return {
        pow: op
      };
  }

  public custom(_op: custom): operation | void {
    // XXX: op.required_auths
  }

  public witness_block_approve(op: witness_block_approve): operation | void {
    if (op.witness === this.account)
      return {
        witness_block_approve: op
      };
  }

  public delete_comment(op: delete_comment): operation | void {
    if (op.author === this.account)
      return {
        delete_comment: op
      };
  }

  public custom_json(_op: custom_json): operation | void {
    /*
     * XXX: op.required_auths
     * XXX: op.required_posting_auths
     */
  }

  public comment_options(op: comment_options): operation | void {
    if (op.author === this.account)
      return {
        comment_options: op
      };
  }

  public set_withdraw_vesting_route(op: set_withdraw_vesting_route): operation | void {
    if (op.from_account === this.account || op.to_account === this.account)
      return {
        set_withdraw_vesting_route: op
      };
  }

  public limit_order_create2(op: limit_order_create2): operation | void {
    if (op.owner === this.account)
      return {
        limit_order_create2: op
      };
  }

  public claim_account(op: claim_account): operation | void {
    if (op.creator === this.account)
      return {
        claim_account: op
      };
  }

  public create_claimed_account(op: create_claimed_account): operation | void {
    if (op.creator === this.account || op.new_account_name === this.account)
      // XXX: Posting, owner etc.
      return {
        create_claimed_account: op
      };
  }

  public request_account_recovery(op: request_account_recovery): operation | void {
    if (op.account_to_recover === this.account || op.recovery_account === this.account)
      // XXX: new_owner_authority
      return {
        request_account_recovery: op
      };
  }

  public recover_account(op: recover_account): operation | void {
    if (op.account_to_recover === this.account)
      // XXX: recent_owner_authority, new_owner_authority
      return {
        recover_account: op
      };
  }

  public change_recovery_account(op: change_recovery_account): operation | void {
    if (op.account_to_recover === this.account || op.new_recovery_account === this.account)
      return {
        change_recovery_account: op
      };
  }

  public escrow_transfer(op: escrow_transfer): operation | void {
    if (op.agent === this.account || op.from_account === this.account || op.to_account === this.account)
      return {
        escrow_transfer: op
      };
  }

  public escrow_dispute(op: escrow_dispute): operation | void {
    if (
      op.agent === this.account ||
      op.from_account === this.account ||
      op.to_account === this.account ||
      op.who === this.account
    )
      return {
        escrow_dispute: op
      };
  }

  public escrow_release(op: escrow_release): operation | void {
    if (
      op.agent === this.account ||
      op.from_account === this.account ||
      op.receiver === this.account ||
      op.to_account === this.account ||
      op.who === this.account
    )
      return {
        escrow_release: op
      };
  }

  public pow2(op: pow2): operation | void {
    if (
      op.work?.equihash_pow?.input?.worker_account === this.account ||
      op.work?.pow2?.input?.worker_account === this.account
    )
      return {
        pow2: op
      };
  }

  public escrow_approve(op: escrow_approve): operation | void {
    if (
      op.agent === this.account ||
      op.from_account === this.account ||
      op.to_account === this.account ||
      op.who === this.account
    )
      return {
        escrow_approve: op
      };
  }

  public transfer_to_savings(op: transfer_to_savings): operation | void {
    if (op.from_account === this.account || op.to_account === this.account)
      return {
        transfer_to_savings: op
      };
  }

  public transfer_from_savings(op: transfer_from_savings): operation | void {
    if (op.from_account === this.account || op.to_account === this.account)
      return {
        transfer_from_savings: op
      };
  }

  public cancel_transfer_from_savings(op: cancel_transfer_from_savings): operation | void {
    if (op.from_account === this.account)
      return {
        cancel_transfer_from_savings: op
      };
  }

  public decline_voting_rights(op: decline_voting_rights): operation | void {
    if (op.account === this.account)
      return {
        decline_voting_rights: op
      };
  }

  public claim_reward_balance(op: claim_reward_balance): operation | void {
    if (op.account === this.account)
      return {
        claim_reward_balance: op
      };
  }

  public delegate_vesting_shares(op: delegate_vesting_shares): operation | void {
    if (op.delegatee === this.account || op.delegator === this.account)
      return {
        delegate_vesting_shares: op
      };
  }

  public account_create_with_delegation(op: account_create_with_delegation): operation | void {
    if (op.creator === this.account || op.new_account_name === this.account)
      // XXX: Posting, owner etc.
      return {
        account_create_with_delegation: op
      };
  }

  public witness_set_properties(op: witness_set_properties): operation | void {
    if (op.owner === this.account)
      return {
        witness_set_properties: op
      };
  }

  public account_update2(op: account_update2): operation | void {
    if (op.account === this.account)
      // XXX: Posting, owner etc.
      return {
        account_update2: op
      };
  }

  public create_proposal(op: create_proposal): operation | void {
    if (op.creator === this.account || op.receiver === this.account)
      return {
        create_proposal: op
      };
  }

  public update_proposal_votes(op: update_proposal_votes): operation | void {
    if (op.voter === this.account)
      return {
        update_proposal_votes: op
      };
  }

  public remove_proposal(op: remove_proposal): operation | void {
    if (op.proposal_owner === this.account)
      return {
        remove_proposal: op
      };
  }

  public update_proposal(op: update_proposal): operation | void {
    if (op.creator === this.account)
      return {
        update_proposal: op
      };
  }

  public collateralized_convert(op: collateralized_convert): operation | void {
    if (op.owner === this.account)
      return {
        collateralized_convert: op
      };
  }

  public recurrent_transfer(op: recurrent_transfer): operation | void {
    if (op.from_account === this.account || op.to_account === this.account)
      return {
        recurrent_transfer: op
      };
  }
}
