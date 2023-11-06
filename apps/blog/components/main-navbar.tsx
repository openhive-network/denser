import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCommunities } from "@/blog/lib/bridge";
import { cn } from "@/blog/lib/utils";
import { Card, CardContent } from "@hive/ui/components/card";
import { FC, ReactNode } from "react";
import { useTranslation } from "next-i18next";
import { ExternalLink, Home, Info, Wallet } from "lucide-react";
import { useRouter } from "next/router";
import clsx from "clsx";

const Box = ({
  children,
  href,
  externalLink,
  current_card,
}: {
  children: ReactNode;
  href: string;
  externalLink?: string;
  current_card?: boolean;
}) => {
  return (
    <Link
      target={externalLink}
      href={href}
      className={clsx(
        "font-semibold flex gap-2 hover:bg-slate-900 hover:text-red-500 px-4 py-1",
        { "text-red-500 font-extrabold": current_card }
      )}
    >
      {children}
    </Link>
  );
};

const MainNavbar: FC = () => {
  const router = useRouter();
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
              <Box
                href="/"
                current_card={
                  "/trending" === router.asPath ||
                  "/hot" === router.asPath ||
                  "/created" === router.asPath ||
                  "/payout" === router.asPath ||
                  "/muted" === router.asPath
                }
              >
                Home
              </Box>
            </li>
            <li>
              <Box
                href="/communities"
                current_card={"/communities" === router.asPath}
              >
                All Communities
              </Box>
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
              <Box
                href="http://localhost:4000/~witnesses"
                externalLink="_blank"
              >
                Witnesses
              </Box>
            </li>
            <li>
              <Box href="http://localhost:4000/proposals" externalLink="_blank">
                Proposals
              </Box>
            </li>
            <li>
              <Box href="http://localhost:4000/market" externalLink="_blank">
                Currency Market
              </Box>
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
              <Box href="https://hiveblocks.com/" externalLink="_blank">
                Block Explorer
              </Box>
            </li>
            <li>
              <Box href="https://openhive.chat/home" externalLink="_blank">
                Hive Chat
              </Box>
            </li>
            <li>
              <Box href="https://hive.io/eco" externalLink="_blank">
                Our dApps
              </Box>
            </li>
            <li>
              <Box href="https://developers.hive.io/" externalLink="_blank">
                Hive API Docs
              </Box>
            </li>
            <li>
              <Box href="https://blocktrades.us" externalLink="_blank">
                Blocktrades
              </Box>
            </li>
            <li>
              <Box href="https://ionomy.com" externalLink="_blank">
                Ionamy
              </Box>
            </li>
            <li>
              <Box href="https://hiveprojects.io" externalLink="_blank">
                Apps Built on Hive
              </Box>
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
              <Box href="/welcome" current_card={"/welcome" === router.asPath}>
                Welcome
              </Box>
            </li>
            <li>
              <Box href="https://hive.io/">What is Hive</Box>
            </li>
            <li>
              <Box
                href="/faq.html"
                current_card={"/faq.html" === router.asPath}
              >
                FAQ
              </Box>
            </li>
            <li>
              <Box href="https://hive.io/whitepaper.pdf">Hive Whitepaper</Box>
            </li>
            <li>
              <Box
                href="/privacy.html"
                current_card={"/privacy.html" === router.asPath}
              >
                Privacy Policy
              </Box>
            </li>
            <li>
              <Box
                href="/tos.html"
                current_card={"/tos.html" === router.asPath}
              >
                Terms of Services
              </Box>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MainNavbar;
