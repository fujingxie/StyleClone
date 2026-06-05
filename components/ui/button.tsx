import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border border-transparent px-3.5 text-sm font-medium transition-[background,color,border-color,box-shadow] duration-[120ms] ease-out focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:bg-slate-100 disabled:text-slate-400",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-hover",
        secondary:
          "border-border bg-white text-text-1 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100",
        ghost: "bg-transparent text-text-2 hover:bg-slate-100 hover:text-text-1 active:bg-slate-200",
        danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        accent: "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover",
        icon: "border-border bg-white p-0 text-text-2 shadow-sm hover:border-slate-300 hover:bg-slate-50",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3",
        lg: "h-10 px-5",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
