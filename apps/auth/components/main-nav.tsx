import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@hive/ui/lib/utils";
import { Icons } from "@hive/ui/components/icons";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden h-full items-center md:flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <Icons.hivetoken />
      </Link>
    </div>
  );
}
