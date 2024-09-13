import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black border-slate-200 border-2 border-b-4 active:border-b-2 hover:bg-slate-100 text-slate-500",

        locked:
          "bg-neutral-200 text-primary-foreground hover:bg-neutral-200/90 border-neutral-400 border-b-4 active:border-b-0",

        primary:
          "bg-sky-400 text-primary-foreground hover:bg-sky-400/90 border-sky-500 border-b-4 active:border-b-0",
        primaryOutline: "bg-white text-sky-500 hover:bg-slate-100",

        secondary:
          "bg-green-500 text-primary-foreground hover:bg-green-500/90 border-green-600 border-b-4 active:border-b-0",
        secondaryOutline: "bg-white text-green-500 hover:bg-slate-100",

        danger:
          "bg-rose-500 text-primary-foreground hover:bg-rose-500/90 border-rose-600 border-b-4 active:border-b-0",
        dangerOutline: "bg-white text-rose-500 hover:bg-slate-100",

        super:
          "bg-indigo-500 text-primary-foreground hover:bg-indigo-500/90 border-indigo-600 border-b-4 active:border-b-0",
        superOutline: "bg-white text-indigo-500 hover:bg-slate-100",

        ghost:
          "hover:bg-transparent text-slate-500 border-transparent border-0 hover:bg-slate-100",

        ghostTeal:
          "hover:bg-transparent text-slate-500 border-transparent border-0 hover:bg-teal-100",

        sidebar:
          "bg-transparent text-slate-500 border-2 border-transparent hover:bg-slate-100 transition-none",
        sidebarOutline:
          "bg-sky-500/15 text-sky-500 border-sky-300 border-2 hover:bg-sky-500/20 transition-none",

        cemta:
          "bg-teal-500 text-white hover:bg-teal-500/90 border-teal-600 border-b-4 active:border-b-0",
        cemtaOutline:
          "bg-teal-500/15 text-teal-500 border-teal-300 border-2 hover:bg-teal-500/20 transition-none",

        nextButton:
          "relative overflow-visible rounded-full hover:-translate-y-1 px-12 shadow-xl bg-background/20 after:content-[''] after:absolute after:rounded-full after:inset-0 after:bg-background/40 after:z-[-1] after:transition after:!duration-500 hover:after:scale-150 hover:after:opacity-",

        nextButton2:
          "relative overflow-visible rounded-full hover:-translate-y-1 px-12 shadow-xl bg-customTeal text-white after:content-[''] after:absolute after:rounded-full after:inset-0 after:bg-customTeal/60 after:z-[-1] after:transition after:!duration-500 hover:after:scale-150 hover:after:opacity-0",

        default2: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive2:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline2:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary2:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost2: "hover:bg-accent hover:text-accent-foreground",
        link2: "underline-offset-4 hover:underline text-primary",
        cemta2:
          "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90",
        nextButton3:
          "relative overflow-visible rounded-full hover:-translate-y-1 px-12 shadow-xl bg-customTeal2 text-white after:content-[''] after:absolute after:rounded-full after:inset-0 after:bg-customTeal2/60 after:z-[-1] after:transition after:!duration-500 hover:after:scale-150 hover:after:opacity-0",
      },

      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12  px-8",
        icon: "h-10 w-10",
        rounded: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
