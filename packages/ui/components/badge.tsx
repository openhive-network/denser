import * as React from "react";
import { VariantProps, cva } from "class-variance-authority";

import { cn } from "@ui/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary hover:bg-primary/80 border-transparent text-primary-foreground",
        secondary:
          "bg-secondary hover:bg-secondary/80 border-transparent text-secondary-foreground",
        desctructive:
          "bg-destructive hover:bg-secondary/80 border-transparent text-destructive-foreground",
        outline: "text-foreground",
        red: "text-slate-100 cursor-default bg-destructive",
        lime: "text-slate-100 cursor-default bg-lime-700",
        orange: "text-slate-100 cursor-default bg-orange-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
