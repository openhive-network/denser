import { Input } from '@ui/components/input';
import { cutPublicKey } from '../lib/utils';
import CopyToKeyboard from './copy-to-keyboard';
import { FileKey } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthorityAction } from './hooks/use-authority-operation';

interface MemoAuthorityValueProps {
  editMode: boolean;
  isDisabled: boolean;
  width: number;
  memo: { value: string };
  authoritiesActions: AuthorityAction;
}

const MemoAuthorityValue = ({
  editMode,
  isDisabled,
  width,
  memo,
  authoritiesActions
}: MemoAuthorityValueProps) => {
  const [memoValue, setMemoValue] = useState(memo);

  useEffect(() => {
    setMemoValue(memo);
  }, [memo]);

  const handleBlur = () => {
    authoritiesActions({
      type: 'updateMemo',
      payload: {
        memo: memoValue.value
      }
    });
  };
  return (
    <div className="flex justify-between pl-2 text-xs hover:bg-foreground/20 sm:text-base">
      <div className="grid w-full grid-cols-[max-content_1fr_max-content_5rem] gap-1">
        <span className="flex items-center">
          <FileKey className="size-5" />
        </span>
        {editMode ? (
          <Input
            disabled={isDisabled}
            value={memoValue.value}
            onChange={(e) => setMemoValue({ value: e.target.value })}
            onBlur={handleBlur}
          />
        ) : (
          <CopyToKeyboard value={memoValue.value} displayValue={cutPublicKey(memoValue.value, width, 501)} />
        )}
      </div>
    </div>
  );
};
export default MemoAuthorityValue;
