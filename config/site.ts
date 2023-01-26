import { NavItem } from "@/types/nav"

interface SiteConfig {
  name: string
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
  name: "HIVE blog",
  description:
    "Description",
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
