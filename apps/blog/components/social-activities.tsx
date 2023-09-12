import BadgeList from "@/blog/components/badge-list";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@hive/ui/components/tabs";
import { Badge } from "@/blog/lib/bridge";

export default function SocialActivities({
  data,
  peakd,
  username,
}: {
  data: Badge[];
  peakd: Badge[];
  username: string;
}) {
  const filterBadges = (type: string) => {
    return data?.filter((badge: Badge) => badge.type === type);
  };
  const activity = filterBadges("activity");
  const perso = filterBadges("perso");
  const meetup = filterBadges("meetup");
  const challenge = filterBadges("challenge");
  const first_array = [peakd, activity, perso, meetup, challenge].find(
    (array) => array.length !== 0
  );
  const defaultValue =
    first_array === peakd
      ? "badges"
      : first_array === activity
      ? "activity"
      : first_array === perso
      ? "personal"
      : first_array === meetup
      ? "meetups"
      : first_array === challenge
      ? "challenges"
      : "";
  return (
    <Tabs defaultValue={defaultValue} className="mt-8 w-full">
      <TabsList
        className="flex justify-start"
        data-testid="badges-activity-menu"
      >
        {peakd.length !== 0 ? (
          <TabsTrigger value="badges">Badges</TabsTrigger>
        ) : null}
        {activity.length !== 0 ? (
          <TabsTrigger value="activity">Activity</TabsTrigger>
        ) : null}
        {perso.length !== 0 ? (
          <TabsTrigger value="personal">Personal</TabsTrigger>
        ) : null}
        {meetup.length !== 0 ? (
          <TabsTrigger value="meetups">Meetups</TabsTrigger>
        ) : null}
        {challenge.length !== 0 ? (
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        ) : null}
      </TabsList>
      <TabsContent value="badges">
        <BadgeList data={peakd} />
      </TabsContent>
      <TabsContent value="activity">
        <BadgeList data={activity} username={username} />
      </TabsContent>
      <TabsContent value="personal">
        <BadgeList data={perso} username={username} />
      </TabsContent>
      <TabsContent value="meetups">
        <BadgeList data={meetup} username={username} />
      </TabsContent>
      <TabsContent value="challenges">
        <BadgeList data={challenge} username={username} />
      </TabsContent>
    </Tabs>
  );
}
