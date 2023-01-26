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
      title: "Home",
      href: "/",
    },
  ],
  links: {
    twitter: "https://twitter.com/hiveblocks",
    gitlab: "https://gitlab.hive.io/",
    youtube: "https://www.youtube.com/@Hivenetwork",
    docs: "https://ui.shadcn.com",
  },
}
