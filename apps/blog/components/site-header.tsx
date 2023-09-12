import { Button } from "@hive/ui/components/button";
import { Icons } from "@hive/ui/components/icons";
import { Input } from "@hive/ui/components/input";
import { FC } from "react";
import Sidebar from "./sidebar";
import { ModeToggle } from "./mode-toggle";
import { MainNav } from "./main-nav";
import { siteConfig } from "@hive/ui/config/site";
import Link from "next/link";
import DialogLogin from "./dialog-login";

const SiteHeader: FC = () => {
  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-14 items-center justify-between w-full">
        <Link href="/trending" className="flex items-center space-x-2">
          <Icons.hive className="h-6 w-6" />
          <span className="font-bold sm:inline-block">{siteConfig.name}</span>
        </Link>
        <MainNav />
        <div className="flex items-center space-x-2 sm:space-x-4">
          <nav className="flex items-center space-x-1">
            <div className="hidden sm:flex gap-1 mx-1">
              <DialogLogin>
                <Button variant="ghost" className="text-base hover:text-red-500">
                  Login
                </Button>
              </DialogLogin>
              <Link href='https://signup.hive.io/'>
                <Button variant="redHover">Sign up</Button>
                </Link>
            </div>

            <div>
              <div className="hidden lg:block relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Icons.search className="h-5 w-5 rotate-90" />
                </div>
                <Input
                  type="search"
                  className="block p-4 pl-10 text-sm rounded-full w-[200px]"
                  placeholder="Search..."
                />
              </div>
            </div>
            <Link href='/search'>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 px-0 lg:hidden"
              >
                <Icons.search className="h-5 w-5 rotate-90" />
              </Button>
            </Link>
            <Link href="/submit.html">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 px-0"
                data-testid="nav-pencil"
              >
                <Icons.pencil className="h-5 w-5" />
              </Button>
            </Link>
            <ModeToggle />
            <Sidebar />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
