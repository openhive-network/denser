import BadgeList from '@/blog/components/badge-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hive/ui/components/tabs';
import { Badge } from '@/blog/lib/bridge';

export default function SocialActivities({ data, peakd, username }: { data: Badge[]; peakd: Badge[]; username:string }) {
  const filterBadges = (type: string) => {
    return data?.filter((badge: Badge) => badge.type === type);
  };

  return (
    <Tabs defaultValue="badges" className="mt-8 w-full">
      <TabsList className="flex" data-testid="badges-activity-menu">
        <TabsTrigger value="badges">Badges</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="meetups">Meetups</TabsTrigger>
        <TabsTrigger value="challenges">Challenges</TabsTrigger>
      </TabsList>
      <TabsContent value="badges">
        <BadgeList data={peakd}/>
      </TabsContent>
      <TabsContent value="activity">
        <BadgeList data={filterBadges('activity')} username={username}/>
      </TabsContent>
      <TabsContent value="personal">
        <BadgeList data={filterBadges('perso')} username={username}/>
      </TabsContent>
      <TabsContent value="meetups">
        <BadgeList data={filterBadges('meetup')} username={username}/>
      </TabsContent>
      <TabsContent value="challenges">
        <BadgeList data={filterBadges('challenge')} username={username} />
      </TabsContent>
    </Tabs>
  );
}
