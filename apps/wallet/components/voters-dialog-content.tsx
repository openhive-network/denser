import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { DialogContent, DialogTitle } from '@ui/components/dialog';

type VotersDialogContentProps = Omit<ComponentPropsWithoutRef<typeof DialogContent>, 'title' | 'className'> & {
  title: ReactNode;
  children: ReactNode;
};

/** The voters dialog's frame: full screen on phones, about 1150 px wide on desktop, the title above its body. */
function VotersDialogContent({ title, children, ...props }: VotersDialogContentProps) {
  return (
    <DialogContent
      className="flex h-dvh max-w-none flex-col gap-3 rounded-none px-3 pt-3 pb-3 sm:h-[85vh] sm:w-[calc(100vw-2rem)] sm:max-w-6xl sm:rounded-lg sm:px-5"
      aria-describedby={undefined}
      {...props}
    >
      <DialogTitle className="h-fit border-b-2 border-solid border-slate-600 pr-8 pb-2 text-base font-normal leading-normal tracking-normal">
        {title}
      </DialogTitle>
      {children}
    </DialogContent>
  );
}

export default VotersDialogContent;
