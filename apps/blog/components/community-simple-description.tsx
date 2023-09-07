import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hive/ui/components/card";
import Link from "next/link";
import { Button } from "@hive/ui/components/button";
import {
  AccountNotification,
  Community,
  Subscription,
} from "@/blog/lib/bridge";
import { SubsListDialog } from "./subscription-list-dialog";
import { ActivityLogDialog } from "./activity-log-dialog";
import DialogLogin from "./dialog-login";

const CommunitySimpleDescription = ({
  data,
  subs,
  notificationData,
  username,
}: {
  data: Community;
  subs: Subscription[];
  notificationData: AccountNotification[] | null | undefined;
  username: string;
}) => {
  return (
    <Card
      className="my-4 grid h-fit w-auto grid-cols-3 gap-4 p-2 dark:bg-background/95 dark:text-white"
      data-testid="community-simple-description-sidebar"
    >
      <CardHeader className="col-span-2 p-0">
        <CardTitle>{data.title}</CardTitle>
        <div className="flex">
          <div className="flex w-full text-sm text-gray-500">
            <SubsListDialog title={data.title} subs={subs}>
              <div
                className="flex flex-col items-center"
                data-testid="community-simple-subscribers"
              >
                {data.subscribers} subscribers
              </div>
            </SubsListDialog>
            <span className="mx-1">•</span>
            <div
              className="flex flex-col items-center"
              data-testid="community-simple-active-posters"
            >
              {data.num_authors} active
            </div>
          </div>
          <div className="justify-self-end whitespace-nowrap text-sm">
            <ActivityLogDialog username={username} data={notificationData}>
              Activity Log
            </ActivityLogDialog>
          </div>
        </div>
        <span className="text-sm">{data.about}</span>
      </CardHeader>
      <CardContent className="col-span-1 flex items-center justify-center p-0">
        <div className="my-4 flex flex-col gap-4">
          <DialogLogin>
            <Button
              size="sm"
              className="w-full bg-blue-800 text-center hover:bg-blue-900"
              data-testid="community-simple-subscribe-button"
            >
              Subscribe
            </Button>
          </DialogLogin>
          <Button
            size="sm"
            className="w-full bg-blue-800 text-center hover:bg-blue-900"
          >
            <Link href={`/submit.html?category=${data.name}`}>New Post</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunitySimpleDescription;
