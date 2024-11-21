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
    <div
      className={cn(className, 'hover:bg-rowHover flex cursor-pointer items-center rounded')}
      onClick={() => copyToClipboard(value)}
    >
      {displayValue}
      {copied ? (
        <div className="flex items-center text-xs">
          <Check className="text-explorer-light-green h-5 w-5" />
          Coppied!
        </div>
      ) : null}
    </div>
  );
};

export default CopyToKeyboard;
