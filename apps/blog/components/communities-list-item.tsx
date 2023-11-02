import { Button } from "@hive/ui/components/button";
import { cn } from "@/blog/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@hive/ui/components/card";
import Link from "next/link";
import { Community } from "@/blog/lib/bridge";
import DialogLogin from "./dialog-login";
import { useTranslation } from 'next-i18next';

const CommunitiesListItem = ({ community }: { community: Community }) => {
const { t } = useTranslation('common_blog')
return (
    <Card
      className={cn(
        "my-4 flex hover:bg-accent hover:text-accent-foreground  dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground"
      )}
    >
      <div className="w-4/6">
        <CardHeader>
          <Link href={`trending/${community.name}`} className="text-red-600">
            <CardTitle>{community.title}</CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="px-6">
          <p>{community.about}</p>
        </CardContent>
        <CardFooter className="flex flex-col items-start px-6 text-sm">
          <p className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
            {community.subscribers} {t('communities.subscribers')} <span className="mx-1">•</span>{" "}
            {community.num_authors} {t('communities.authors')} <span className="mx-1">•</span>
            {community.num_pending} {t('communities.posts')}
          </p>
          {community.admins && community.admins?.length > 0 ? (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>{community.admins?.length > 1 ? t('communities.admins') : t('communities.admin')}: </span>
              {community.admins.map((admin: string, index: number) => (
                <span key={index} className="text-red-600">
                  <Link href={`@${admin}`}>{admin}</Link>{" "}
                  {community.admins && index !== community.admins.length - 1 ? (
                    <span className="mx-1">•</span>
                  ) : null}
                </span>
              ))}
            </p>
          ) : null}
        </CardFooter>
      </div>
      <div className="flex w-2/6 items-center justify-center">
        <DialogLogin>
          <Button className="bg-blue-800 text-center hover:bg-blue-900">
          {t('communities.buttons.subscribe')}
          </Button>
        </DialogLogin>
      </div>
    </Card>
  );
};

export default CommunitiesListItem;
