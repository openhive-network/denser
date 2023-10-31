import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCommunities } from "@/blog/lib/bridge";
import { cn } from "@/blog/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hive/ui/components/card";
import { FC, ReactNode } from "react";
import { useTranslation } from "next-i18next";
import { ExternalLink, Home, Info, Wallet } from "lucide-react";

const Box = ({ children, href }: { children: ReactNode; href: string }) => {
  return (
    <Link
      href={href}
      className="font-semibold flex gap-2 hover:bg-slate-900 hover:text-red-500 px-4 py-1"
    >
      {children}
    </Link>
  );
};

const MainNavbar: FC = () => {
  const { t } = useTranslation("common_blog");
  const sort = "rank";
  const query = null;
  const { isLoading, error, data } = useQuery(
    ["communitiesList", sort, query],
    () => getCommunities(sort, query)
  );

  if (isLoading) return <p>{t("global.loading")}...</p>;

  return (
    <Card
      className={cn(
        "my-4 hidden h-fit w-full flex-col dark:bg-background/95 dark:text-white md:flex"
      )}
      data-testid="card-trending-comunities"
    >
      <CardContent className="p-0">
        <div>
          <div className="font-bold flex gap-2 p-2 bg-slate-950 text-white">
            <Home />
            Blog
          </div>
          <ul className="text-sm">
            <li>
              <Box href="/">Home</Box>
            </li>
            <li>
              <Box href="/">All Communities</Box>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-bold flex gap-2 p-2 bg-slate-950 text-white">
            <Wallet />
            Wallet
          </div>
          <ul className="text-sm">
            <li>
              <Box href="/">Witnesses</Box>
            </li>
            <li>
              <Box href="/">Proposals</Box>
            </li>
            <li>
              <Box href="/">Currency Market</Box>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-bold flex gap-2 p-2 bg-slate-950 text-white">
            <ExternalLink />
            External Apps
          </div>
          <ul className="text-sm">
            <li>
              <Box href="/">Block Explorer</Box>
            </li>
            <li>
              <Box href="/">Hive Chat</Box>
            </li>
            <li>
              <Box href="/">Our dApps</Box>
            </li>
            <li>
              <Box href="/">Hive API Docs</Box>
            </li>
            <li>
              <Box href="/">Blocktrades</Box>
            </li>
            <li>
              <Box href="/">Ionamy</Box>
            </li>
            <li>
              <Box href="/">Apps Built on Hive</Box>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-bold flex gap-2 p-2 bg-slate-950 text-white">
            <Info />
            Explore Hive
          </div>
          <ul className="text-sm">
            <li>
              <Box href="/">Welcome</Box>
            </li>
            <li>
              <Box href="/">What is Hive</Box>
            </li>
            <li>
              <Box href="/">FAQ</Box>
            </li>
            <li>
              <Box href="/">Hive Whitepaper</Box>
            </li>
            <li>
              <Box href="/">Privacy Policy</Box>
            </li>
            <li>
              <Box href="/">Terms of Services</Box>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MainNavbar;
