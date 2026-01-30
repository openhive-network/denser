"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@ui/lib/utils";
import { buttonVariants } from "@ui/components/button";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = ({
  children,
  ...props
}: AlertDialogPrimitive.AlertDialogPortalProps) => (
  <AlertDialogPrimitive.Portal {...props}>
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">{children}</div>
  </AlertDialogPrimitive.Portal>
);
AlertDialogPortal.displayName = AlertDialogPrimitive.Portal.displayName;

const AlertDialogOverlay = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Overlay>>;
}) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in",
      className
    )}
    {...props}
    ref={ref}
  />
);

const AlertDialogContent = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Content>>;
}) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 grid w-full max-w-lg scale-100 gap-4 border bg-background p-6 opacity-100 shadow-lg animate-in fade-in-90 slide-in-from-bottom-10 sm:rounded-lg sm:zoom-in-90 sm:slide-in-from-bottom-0 md:w-full",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
);

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Title>>;
}) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
);

const AlertDialogDescription = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Description>>;
}) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);

const AlertDialogAction = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Action>>;
}) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
);

const AlertDialogCancel = ({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> & {
  ref?: React.Ref<React.ElementRef<typeof AlertDialogPrimitive.Cancel>>;
}) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
);

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
