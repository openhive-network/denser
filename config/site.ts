import { NavItem } from "@/types/nav"

interface SiteConfig {
  title: string
  description: string
  mainNav: NavItem[]
  links: {
    twitter: string
    gitlab: string
    youtube: string
    docs: string
  }
}

export const siteConfig: SiteConfig = {
  title: "Hive Blog",
  description:
    "Communities without borders. A social network owned and operated by its users, powered by Hive.",
  mainNav: [
    {
      title: "Posts",
      href: "/posts",
    },
    {
      title: "Proposals",
      href: "/proposals",
    },
    {
      title: "Witnesses",
      href: "/witnesses",
    },
    {
      title: "Explore HIVE",
      href: "/explore-hive",
    },
    {
      title: "dApps",
      href: "/dapps",
    },
  ],
  links: {
    twitter: "https://twitter.com/hiveblocks",
    gitlab: "https://gitlab.hive.io/",
    youtube: "https://www.youtube.com/@Hivenetwork",
    docs: "https://ui.shadcn.com",
  },
}
