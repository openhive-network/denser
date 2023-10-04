import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@hive/ui/components/dialog";
import { ReactNode } from "react";
import LoginForm from "@/auth/components/login-form";

export function DialogLogin({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog">
        <LoginForm />
      </DialogContent>
    </Dialog>
  );
}
