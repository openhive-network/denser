import { useTranslation } from '@/wallet/i18n/client';
import DecodeMemoDialog from '@/wallet/components/decode-memo-dialog';
import { hasEncryptedMemoMarker } from '@/wallet/lib/encrypted-memo';

const HistoryMemoCell = ({
  memo,
  username,
  isOwnAccount
}: {
  memo: string | undefined;
  username: string;
  isOwnAccount: boolean;
}) => {
  const { t } = useTranslation('common_wallet');
  if (!memo) return <td></td>;
  if (!hasEncryptedMemoMarker(memo)) {
    return <td className="hidden break-all px-4 py-2 sm:block">{memo}</td>;
  }
  return (
    <td className="hidden break-all px-4 py-2 sm:block" data-testid="wallet-account-history-encoded-memo">
      <span className="italic text-primary/50">{t('transfers_page.decode_memo_encrypted_placeholder')}</span>
      {isOwnAccount && (
        <div>
          <DecodeMemoDialog username={username} encodedMemo={memo} />
        </div>
      )}
    </td>
  );
};

export default HistoryMemoCell;
