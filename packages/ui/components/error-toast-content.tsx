import { cn } from '@ui/lib/utils';
import { Button } from './button';
import { ChevronDown, ClipboardCopy } from 'lucide-react';
import { useState } from 'react';

interface ErrorToastContentProps {
  errorTitle: string;
  fullError: string;
  displayControls?: boolean;
  className?: string;
}

const ICON_SIZE = 16;

const ErrorToastContent: React.FC<ErrorToastContentProps> = ({
  errorTitle,
  fullError,
  displayControls = false,
  className
}) => {
  const [showMoreOpen, setShowMoreOpen] = useState(false);

  const copyErrorToClipboard = () => {
    navigator.clipboard.writeText(fullError);
  };

  return (
    <div className={cn('text-white', className)}>
      <div className="flex flex-row items-center justify-between gap-x-16">
        <h1 className="mr-6 font-semibold">{errorTitle}</h1>
        {displayControls && (
          <div className="top-0 flex flex-row gap-x-2">
            <Button onClick={() => setShowMoreOpen(!showMoreOpen)} variant="link" className="p-0">
              <ChevronDown
                className={cn({
                  'rotate-180': showMoreOpen
                })}
                size={ICON_SIZE}
              />
            </Button>
            <Button onClick={copyErrorToClipboard} variant="link" className="p-0 transition active:scale-125">
              <ClipboardCopy size={ICON_SIZE} />
            </Button>
          </div>
        )}
      </div>
      {displayControls && (
        <pre
          className={cn('h-0 w-0 overflow-hidden text-wrap break-words', {
            'h-full max-h-[60vh] w-full overflow-y-auto px-4 md:max-h-[80vh]': showMoreOpen
          })}
        >
          {fullError}
        </pre>
      )}
    </div>
  );
};

export default ErrorToastContent;
