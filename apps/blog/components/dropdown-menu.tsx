import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { ReactNode } from "react"

export function DropdownMainMenu({children}:{children:ReactNode}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-0">
        <DropdownMenuLabel className="font-bold flex gap-2 p-1 sm:p-2 bg-slate-950 text-white justify-center md:justify-start m-0">Blog</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>Home</DropdownMenuItem>
          <DropdownMenuItem>All Communities</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
        <DropdownMenuLabel className="font-bold flex gap-2 p-1 sm:p-2 bg-slate-950 text-white justify-center md:justify-start">Wallet</DropdownMenuLabel>
          <DropdownMenuItem>Witnesses</DropdownMenuItem>
          <DropdownMenuItem>Proposals</DropdownMenuItem>
          <DropdownMenuItem>Currency Market</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
        <DropdownMenuLabel className="font-bold flex gap-2 p-1 sm:p-2 bg-slate-950 text-white justify-center md:justify-start">External Apps</DropdownMenuLabel>
          <DropdownMenuItem>Hive Chat</DropdownMenuItem>
          <DropdownMenuItem>Our dApps</DropdownMenuItem>
          <DropdownMenuItem>Hive API Docs</DropdownMenuItem>
          <DropdownMenuItem>Blocktrades</DropdownMenuItem>
          <DropdownMenuItem>Ionamy</DropdownMenuItem>
          <DropdownMenuItem>Apps Built on Hive</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuLabel className="font-bold flex gap-2 p-1 sm:p-2 bg-slate-950 text-white justify-center md:justify-start">Explore Hive</DropdownMenuLabel>
          <DropdownMenuItem>Welcome</DropdownMenuItem>
          <DropdownMenuItem>What is Hive</DropdownMenuItem>
          <DropdownMenuItem>FAQ</DropdownMenuItem>
          <DropdownMenuItem>Hive Whitepaper</DropdownMenuItem>
          <DropdownMenuItem>Privacy Policy</DropdownMenuItem>
          <DropdownMenuItem>Terms of Services</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
