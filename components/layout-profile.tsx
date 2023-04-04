import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import {
  Award,
  BellRing,
  Cast,
  MessageSquare,
  Newspaper,
  Settings,
  Wallet,
} from "lucide-react"

import ProfileInfo from "@/components/profile-info"
import { Button } from "@/components/ui/button"

export default function LayoutProfile({ children }) {
  const [coverImage, setCoverImage] = useState("")
  const router = useRouter()
  const username =
    typeof router.query?.param === "object"
      ? router.query.param[0]
      : typeof router.query?.param === "string"
      ? router.query?.param
      : ""
  return (
    <div>
      <div className="min-h-80 h-80 max-h-80 w-full">
        {coverImage !== "" ? (
          <div
            style={{
              background: `url('${coverImage}') center center no-repeat`,
              backgroundSize: "cover",
            }}
            className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full`}
          />
        ) : (
          <div
            className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full bg-gray-600 bg-cover`}
          />
        )}
      </div>
      <div className="flex flex-col pb-8 md:flex-row md:pb-4 ">
        <ProfileInfo handleCoverImage={setCoverImage} />
        <main style={{ width: "calc(100% - 20rem)" }}>
          <div className="flex justify-between py-8">
            <ul className="grid grid-cols-2 gap-4 lg:flex lg:gap-8">
              <li>
                <Link href={`/${username}`}>
                  <Button
                    variant="ghost"
                    className={`hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white ${
                      router.asPath === `/${username}`
                        ? "bg-red-100 text-red-600 dark:bg-red-100 dark:text-red-600"
                        : ""
                    }`}
                  >
                    <Newspaper className="mr-2" />
                    Feed
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/${username}/posts`}>
                  <Button
                    variant="ghost"
                    className={`hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white ${
                      router.asPath === `/${username}/posts`
                        ? "bg-red-100 text-red-600 dark:bg-red-100 dark:text-red-600"
                        : ""
                    }`}
                  >
                    <MessageSquare className="mr-2" />
                    Posts
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/${username}/replies`}>
                  <Button
                    variant="ghost"
                    className={`hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white ${
                      router.asPath === `/${username}/replies`
                        ? "bg-red-100 text-red-600 dark:bg-red-100 dark:text-red-600"
                        : ""
                    }`}
                  >
                    <Cast className="mr-2" />
                    Replies
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/${username}/communities`}>
                  <Button
                    variant="ghost"
                    className={`hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white ${
                      router.asPath === `/${username}/communities`
                        ? "bg-red-100 text-red-600 dark:bg-red-100 dark:text-red-600"
                        : ""
                    }`}
                  >
                    <Award className="mr-2" />
                    Social
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/${username}/notifications`}>
                  <Button
                    variant="ghost"
                    className={`hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white ${
                      router.asPath === `/${username}/notifications`
                        ? "bg-red-100 text-red-600 dark:bg-red-100 dark:text-red-600"
                        : ""
                    }`}
                  >
                    <BellRing className="mr-2" />
                    Notifications
                  </Button>
                </Link>
              </li>
            </ul>
            <ul className="grid grid-cols-2 gap-2 lg:flex lg:gap-4">
              <li>
                <Link href={`https://wallet.hive.blog/${username}/transfers`}>
                  <Button
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                  >
                    <Wallet className="mr-2" />
                    Wallet
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/${username}/settings`}>
                  <Button
                    variant="ghost"
                    className={`hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white ${
                      router.asPath === `/${username}/settings`
                        ? "bg-red-100 text-red-600 dark:bg-red-100 dark:text-red-600"
                        : ""
                    }`}
                  >
                    <Settings className="mr-2" />
                    Settings
                  </Button>
                </Link>
              </li>
            </ul>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
