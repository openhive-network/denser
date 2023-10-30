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
import { FC } from "react";
import { useTranslation } from "next-i18next";

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
        "my-4 py-2 hidden h-fit w-full flex-col px-8 dark:bg-background/95 dark:text-white md:flex"
      )}
      data-testid="card-trending-comunities"
    >
      <CardContent className="flex flex-col gap-4">
        <div>
          <span className="font-bold">Blog</span>
        </div>
        <div>
          <span className="font-bold">Wallet</span>
          <ul className="text-sm pl-3">
            <li>Witnesses</li>
            <li>Proposals</li>
            <li>Currency Market</li>
          </ul>
        </div>
        <div>
          <span className="font-bold">External Apps</span>
          <ul className="text-sm pl-3">
            <li>Block Explorer</li>
            <li>Hive Chat</li>
            <li>Our dApps</li>
            <li>Hive API Docs</li>
            <li>Blocktrades</li>
            <li>Ionamy</li>
            <li>Apps Built on Hive</li>
            <li></li>
            <li></li>
          </ul>
        </div>
        <div>
          <span className="font-bold">Explore Hive</span>
          <ul className="text-sm pl-3">
            <li>Welcome</li>
            <li>What is Hive</li>
            <li>FAQ</li>
            <li>Hive Whitepaper</li>
            <li>Privacy Policy</li>
            <li>Terms of Services</li>
            <li></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MainNavbar;
