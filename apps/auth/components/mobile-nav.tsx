'use client';

import * as React from 'react';
import Link, { LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { SidebarOpen } from 'lucide-react';
import { siteConfig } from '@ui/config/site';
import { cn } from '@ui/lib/utils';
import { Button } from '@ui/components/button';
import { Sheet, SheetContent, SheetTrigger } from '@ui/components/sheet';
import { Icons } from '@ui/components/icons';

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <SidebarOpen className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent size="xl" position="left" className="pr-0">
        <MobileLink href="/" className="flex items-center" onOpenChange={setOpen}>
          <Icons.hive className="mr-2 h-4 w-4" />
          <span className="font-bold">{siteConfig.name}</span>
          {siteConfig.chainEnv !== 'mainnet' && <span className="text-xs text-red-600 uppercase" data-testid="type-of-api-endpoint">{siteConfig.chainEnv}</span>}
        </MobileLink>
      </SheetContent>
    </Sheet>
  );
}

interface MobileLinkProps extends LinkProps {
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

function MobileLink({ href, onOpenChange, className, children, ...props }: MobileLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href.toString());
        onOpenChange?.(false);
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  );
}
