import { Button, Separator } from "@hive/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@hive/ui/components/alert-dialog";
import { ReactNode } from "react";
import DialogLogin from "./dialog-login";

export function AlertDialogProxy({
  children,
  proxy,
}: {
  children: ReactNode;
  proxy: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="reblog-dialog-header">
              Confirm Account Witness Proxy{" "}
            </AlertDialogTitle>
            <AlertDialogCancel
              className="border-none hover:text-red-800"
              data-testid="reblog-dialog-close"
            >
              X
            </AlertDialogCancel>
          </div>
          <Separator />
          <AlertDialogDescription data-testid="reblog-dialog-description">
            {proxy === ""
              ? "You are about to remove your proxy."
              : `Set proxy to: ${proxy}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel
            className="hover:text-red-800"
            data-testid="reblog-dialog-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <DialogLogin>
            <Button
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              data-testid="reblog-dialog-ok"
            >
              OK
            </Button>
          </DialogLogin>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
