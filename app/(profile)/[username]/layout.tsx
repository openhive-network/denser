import Image from "next/image"
import Link from "next/link"
import { Award, BellRing, Cast, MessageSquare, Newspaper } from "lucide-react"

import ProfileInfo from "@/components/profile-info"
import { Button } from "@/components/ui/button"

interface UserProfileLayoutProps {
  children: React.ReactNode
  params: {
    username: string
  }
}

export default function UserProfileLayout({
  children,
  params,
}: UserProfileLayoutProps) {
  return (
    <div>
      <div className="min-h-80 h-80 max-h-80 w-full">
        <Image
          src="/banner.png"
          alt="Banner image"
          className="h-auto min-h-full w-auto min-w-full"
          height="320"
          width="960"
          priority
        />
      </div>
      <div className="flex flex-col md:flex-row ">
        <ProfileInfo />
        <main className="w-full">
          <ul className="flex justify-center gap-8 py-8">
            <li>
              <Button
                variant="ghost"
                className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
              >
                <Newspaper className="mr-2" />
                Feed
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
              >
                <MessageSquare className="mr-2" />
                Comments
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
              >
                <Cast className="mr-2" />
                Replies
              </Button>
            </li>
            <li>
              <Link href={`/${params.username}/communities`}>
                <Button
                  variant="ghost"
                  className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                >
                  <Award className="mr-2" />
                  Social
                </Button>
              </Link>
            </li>
            <li>
              <Button
                variant="ghost"
                className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
              >
                <BellRing className="mr-2" />
                Notifications
              </Button>
            </li>
          </ul>
          {children}
        </main>
      </div>
    </div>
  )
}
