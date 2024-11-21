import { cn } from '@ui/lib/utils';
import { Check, ClipboardCopy } from 'lucide-react';
import { useState } from 'react';

interface CopyToKeyboardProps {
  value?: string;
  displayValue: string;
  className?: string;
}

const CopyToKeyboard: React.FC<CopyToKeyboardProps> = ({ value, displayValue, className }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (key?: string) => {
    if (key) {
      navigator.clipboard.writeText(key);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <>
      <div
        className={cn(className, 'relative flex cursor-pointer items-center rounded')}
        onClick={() => copyToClipboard(value)}
      >
        {displayValue}
      </div>
      {copied ? (
        <div className="absolute flex items-center rounded-xl bg-background-tertiary p-2">
          <Check className="text-explorer-light-green h-5 w-5" />
          <span className="ml-1">Copied!</span>
        </div>
      ) : null}
    </>
  );
};

export default CopyToKeyboard;
