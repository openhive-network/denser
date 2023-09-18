import Link from 'next/link'
import { Button } from "@hive/ui";
import DialogLogin from "@/auth/components/dialog-login";

export default function HomePage() {
  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2 sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <div className="font-bold text-lg sm:text-3xl">Hive Auth</div>
        <p className="text-sm leading-relaxed sm:max-w-xs">
          <Link href="/login">
            Login
          </Link>
        </p>
        <DialogLogin>
          <Button className="rounded-none w-28" data-testid="wallet-login-button">Login</Button>
        </DialogLogin>
      </div>
    </div>
  );
}
