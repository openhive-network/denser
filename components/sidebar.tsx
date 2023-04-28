import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const Sidebar = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-10 h-10 px-0" data-testid="nav-sidebar-menu-button">
          <Icons.sidebarOpen className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent position="right" size="sm" className="w-5/6 md:w-1/5" data-testid="nav-sidebar-menu-content">
        <div className="flex flex-col">
          <ul>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Welcome</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">FAQ</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Block Explorer</Link>
              </SheetTitle>
            </li>
            <Separator className="my-2" />
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Stolen Accounts Recovery</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Change Account Password</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Vote for Witnesses</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Hive Proposals</Link>
              </SheetTitle>
            </li>
            <Separator className="my-2" />
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">OpenHive Chat</Link>
              </SheetTitle>
            </li>
            <Separator className="my-2" />
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Developer Portal</Link>
              </SheetTitle>
            </li>
            <li>
              <SheetTitle className="py-1.5">
                <Link href="/">Hive Whitepaper</Link>
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
                <Link href="/">Terms of Service</Link>
              </SheetTitle>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
