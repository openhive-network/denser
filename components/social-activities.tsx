import BadgeList from "@/components/badge-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SocialActivities({ data }) {
  return (
    <Tabs defaultValue="badges" className="mt-8 w-full">
      <TabsList className="flex">
        <TabsTrigger value="badges">Badges</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="meetups">Meetups</TabsTrigger>
        <TabsTrigger value="challenges">Challenges</TabsTrigger>
      </TabsList>
      <TabsContent value="badges">
        <BadgeList data={data} />
      </TabsContent>
      <TabsContent value="activity">
        <BadgeList data={data.filter((badge) => badge.type === "activity")} />
      </TabsContent>
      <TabsContent value="personal">
        <BadgeList data={data.filter((badge) => badge.type === "perso")} />
      </TabsContent>
      <TabsContent value="meetups">
        <BadgeList data={data.filter((badge) => badge.type === "meetup")} />
      </TabsContent>
      <TabsContent value="challenges">
        <BadgeList data={data.filter((badge) => badge.type === "challenge")} />
      </TabsContent>
    </Tabs>
  )
}
