import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { ReactNode } from 'react';
import { Button, Separator } from '@ui/components';
import Link from 'next/link';

export function LeavePageDialog({
  children,
  link,
}: {
  children: ReactNode;
  link: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer" asChild>
        {children}
      </DialogTrigger>


      <DialogContent className="overflow-auto">
     <div className='text-2xl'>You are about to leave this app.</div>
      <Separator/>
        <div className='flex flex-col gap-8'>
            <span>The link you&apos;ve clicked on will lead you to the following website: <span className='font-bold'>{link}</span></span>
        <span>
        We are just verifying with you that you want to continue.
        </span>
      <Link target="_blank" href={link}><Button className='w-fit' variant='outlineRed'>Open Link</Button></Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}