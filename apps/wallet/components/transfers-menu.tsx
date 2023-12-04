import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/components';
import { ReactNode } from 'react';

export function TransfersMenu({ children, props }: { children: ReactNode; props: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {props.map((e) => (
          <DropdownMenuItem>{e}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
