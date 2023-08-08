import { Button } from "@hive/ui";
import { Icons } from "@hive/ui/components/icons";
import DialogLogin from "@/wallet/components/dialog-login";

export default function HomePage() {
  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2 sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <div className="font-bold text-lg sm:text-3xl">Hive wallet login</div>
        <p className="text-sm leading-relaxed sm:max-w-xs">
          Welcome to Hive&apos;s official Hive blockchain wallet. Use it to
          transfer Hive tokens, Power up, vote for Hive Witnesses and change
          your Hive profile details.
        </p>
        <DialogLogin>
          <Button className="rounded-none w-28">Login</Button>
        </DialogLogin>
      </div>
      <div className="mr-6 sm:mt-6 sm:w-full sm:max-w-lg">
        <div className="bg-white border-solid border-[1px] border-slate-200 h-[260px] w-full drop-shadow">
          <div className="bg-white border-solid border-[1px] border-slate-200 h-[260px] right-[-10px] top-[-12px] w-full relative drop-shadow">
            <div className="bg-white justify-center border-solid border-[1px] border-slate-200 flex flex-col pl-4 sm:pr-4 w-full right-[-10px] top-[-12px] relative gap-4 h-[260px]  drop-shadow">
              <div className="font-bold text-lg sm:text-2xl">Hive tokens</div>
              <div className="flex gap-3">
                <Icons.hivetoken />
                <span className="flex flex-col justify-center">
                  <span className="font-semibold">Hive</span>
                  <p className="text-xs font-light text-slate-500">
                    Liquid platform token
                  </p>
                </span>
              </div>{" "}
              <div className="flex gap-3">
                <Icons.hivetokenpower />
                <span className="flex flex-col justify-center">
                  <span className="font-semibold">Hive power</span>
                  <p className="text-xs font-light text-slate-500">
                    Vesting influence token
                  </p>
                </span>
              </div>{" "}
              <div className="flex gap-3">
                <Icons.hbdtoken />
                <span className="flex flex-col justify-center">
                  <span className="font-semibold">HBD</span>
                  <p className="text-xs font-light text-slate-500">
                    Seeks price stability with USD
                  </p>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
