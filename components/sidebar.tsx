import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const Sidebar = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 px-0" data-testid="nav-sidebar-menu-button">
          <Icons.sidebarOpen className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        position="right"
        size="sm"
        className="w-5/6 md:w-1/5"
        data-testid="nav-sidebar-menu-content"
      >
        <div className="flex flex-col">
          <ul className="flex flex-col gap-2">
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/welcome">Welcome</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/faq.html">FAQ</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://hiveblocks.com" className="flex">
                  Block Explorer
                  <Icons.forward className="w-4" />
                </Link>
              </SheetTitle>
            </li>
            <Separator className="my-2" />
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://wallet.hive.blog/recover_account_step_1">Stolen Accounts Recovery</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://wallet.hive.blog/change_password">Change Account Password</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://wallet.hive.blog/~witnesses">Vote for Witnesses</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://wallet.hive.blog/proposals">Hive Proposals</Link>
              </SheetTitle>
            </li>
            <Separator className="my-2" />
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://openhive.chat" className="flex">
                  OpenHive Chat <Icons.forward className="w-4" />
                </Link>
              </SheetTitle>
            </li>
            <Separator className="my-2" />
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://developers.hive.io" className="flex">
                  Developer Portal <Icons.forward className="w-4" />
                </Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="https://hive.io/whitepaper.pdf" className="flex">
                  Hive Whitepaper <Icons.forward className="w-4" />
                </Link>
              </SheetTitle>
            </li>
            <Separator className="my-2" />
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Privacy Policy</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/tos.html">Terms of Service</Link>
              </SheetTitle>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
