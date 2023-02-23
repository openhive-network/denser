'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SocialActivities() {
  return (
    <Tabs defaultValue="badges" className="w-full mt-8">
      <TabsList>
        <TabsTrigger value="badges">Badges</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="meetups">Meetups</TabsTrigger>
        <TabsTrigger value="challenges">Challenges</TabsTrigger>
      </TabsList>
      <TabsContent value="badges">
        Badges Tab
      </TabsContent>
      <TabsContent value="activity">
        Activity Tab
      </TabsContent>
      <TabsContent value="personal">
        Personal Tab
      </TabsContent>
      <TabsContent value="meetups">
        Meetups Tab
      </TabsContent>
      <TabsContent value="challenges">
        Challenges Tab
      </TabsContent>
    </Tabs>
  )
}
