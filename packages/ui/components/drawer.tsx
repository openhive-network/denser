// From https://codesandbox.io/p/sandbox/drawer-with-tailwind-css-48z1k3?file=%2Fsrc%2FmyDrawer.js%3A1%2C1-79%2C1

import { ReactNode } from 'react';
import { clsx } from "clsx";

const openClassNames = {
  right: "translate-x-0",
  left: "translate-x-0",
  top: "translate-y-0",
  bottom: "translate-y-0"
};

const closeClassNames = {
  right: "translate-x-full",
  left: "-translate-x-full",
  top: "-translate-y-full",
  bottom: "translate-y-full"
};

const classNames = {
  right: "inset-y-0 right-0",
  left: "inset-y-0 left-0",
  top: "inset-x-0 top-0",
  bottom: "inset-x-0 bottom-0"
};

interface DrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  side?: "right" | "left" | "top" | "bottom";
  closeOnClickOutside?: boolean;
  children: ReactNode;
}


export const Drawer = ({
  open,
  setOpen,
  closeOnClickOutside = false,
  side = "right",
  children
}: DrawerProps) => {
  return (
    <div
      className="relative z-50"
      aria-labelledby="slide-over"
      role="dialog"
      aria-modal="true"
      onClick={() => closeOnClickOutside ? setOpen(!open) : null}
    >
      <div
        className={clsx(
          "fixed inset-0 bg-gray-500 bg-opacity-50 transition-all",
          { "opacity-100 duration-500 ease-in-out visible": open },
          { "opacity-0 duration-500 ease-in-out invisible": !open }
        )}
      ></div>
      <div className={clsx({ "fixed inset-0 overflow-hidden": open })}>
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={clsx(
              "pointer-events-none fixed max-w-full",
              classNames[side],
              { "h-full md:h-1/2 lg:h-2/5": side === "top" || side === "bottom" },
              { "w-full md:w-1/2 lg:w-2/5": side === "left" || side === "right" },
            )}
          >
            <div
              className={clsx(
                "pointer-events-auto relative w-full h-full transform transition ease-in-out duration-500",
                { [closeClassNames[side]]: !open },
                { [openClassNames[side]]: open }
              )}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <div
                className={clsx(
                  "flex flex-col h-full overflow-y-scroll bg-white p-1 shadow-xl rounded-lg"
                )}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
