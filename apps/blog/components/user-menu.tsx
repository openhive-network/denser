import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import { ReactNode } from "react"
import { LangToggle } from "./lang-toggle"
import { ModeToggle } from "./mode-toggle"




export function UserMenu({children}:{children:ReactNode}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
            {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
          Theme
          <DropdownMenuShortcut><ModeToggle /></DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
          Language 
          <DropdownMenuShortcut><LangToggle /></DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
