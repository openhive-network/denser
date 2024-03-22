import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { operation, vote, transfer, ApiOperation } from '@hive/wax';
import { KeyType } from '@smart-signer/types/common';

export async function getOperationForLogin(
    username: string,
    keyType: KeyType,
    loginChallenge: string
): Promise<operation> {
    const hiveChain = await hiveChainService.getHiveChain();
    let operation: operation;
    if (keyType === KeyType.posting) {
        const voteLoginChallenge: vote = vote.create({
            voter: username,
            author: "author",
            permlink: loginChallenge,
            weight: 10000,
        });
        operation = { vote: voteLoginChallenge };
    } else if (keyType === KeyType.active) {
        const transferLoginChallenge: transfer = transfer.create({
            from_account: username,
            to_account: username,
            amount: hiveChain.hive(1),
            memo: loginChallenge,
        });
        operation = { transfer: transferLoginChallenge };
    } else {
        throw new Error('Unsupported keyType');
    }
    return operation;
}

export function getLoginChallengeFromOperationForLogin(
    operation: ApiOperation,
    keyType: KeyType
): string {
    let loginChallenge = '';
    if (keyType === KeyType.posting) {
        loginChallenge = (operation as any).value['permlink'];
    } else if (keyType === KeyType.active) {
        loginChallenge = (operation as any).value['memo'];
    } else {
        throw new Error('Unsupported keyType');
    }
    return loginChallenge;
}
