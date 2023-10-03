import { Button } from "@hive/ui/components/button";
import { Icons } from "@hive/ui/components/icons";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@hive/ui/components/sheet";
import Link from "next/link";
import { Separator } from "@hive/ui/components/separator";
import clsx from "clsx";
import { ReactNode } from "react";
const Item = ({
  href,
  children,
  target = false,
}: {
  href: string;
  children: ReactNode;
  target?: boolean;
}) => {
  return (
    <li className="text-foreground border-b-2 border-white dark:hover:border-red-600 hover:border-red-600 dark:border-slate-950 dark:hover:bg-slate-900 hover:bg-slate-100 cursor-pointer">
      <Link href={href} target={clsx(target ? "_blank" : "")}>
        <SheetClose className="w-full h-full flex items-center p-4 gap-1 text-sm font-semibold">
          {children}
        </SheetClose>
      </Link>
    </li>
  );
};
const Sidebar = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 px-0"
          data-testid="nav-sidebar-menu-button"
        >
          <Icons.sidebarOpen className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        position="right"
        size="sm"
        className="w-5/6 md:w-2/6 pt-12 px-0 overflow-auto"
        data-testid="nav-sidebar-menu-content"
      >
        <div className="flex flex-col">
          <ul className="flex flex-col">
            <Item href="http://localhost:3000/welcome">Welcome</Item>
            <Item href="http://localhost:3000/faq.html">FAQ</Item>
            <Item href="/market">Currency Market</Item>
            <Separator className="my-2" />
            <Item href="/~witnesses">Vote for Witnesses</Item>
            <Item href="/proposals">Hive Proposals</Item>
            <Separator className="my-2" />

            <li className="p-4 text-slate-500 text-sm">
              Third-party exchanges:
            </li>
            <Item href="https://blocktrades.us" target>
              Blocktrades
              <Icons.forward className="w-4" />
            </Item>
            <Item href="https://ionomy.com" target>
              Ionomy
              <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="https://openhive.chat" target>
              Hive Chat <Icons.forward className="w-4" />
            </Item>
            <Item href="https://hiveprojects.io/" target>
              Apps Built on Hive <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="https://developers.hive.io" target>
              Hive API Docs
              <Icons.forward className="w-4" />
            </Item>
            <Item href="https://hive.io/whitepaper.pdf" target>
              Hive Whitepaper <Icons.forward className="w-4" />
            </Item>
            <Separator className="my-2" />
            <Item href="http://localhost:3000/privacy.html">
              Privacy Policy
            </Item>
            <Item href="http://localhost:3000/tos.html">Terms of Service</Item>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
