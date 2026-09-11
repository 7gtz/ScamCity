import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const button = cva(
  [
    "ui-label inline-flex min-h-11 items-center justify-center gap-3 whitespace-nowrap",
    "transition-[color,background-color,border-color] duration-[320ms] ease-out",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        /** Primary action (ANSWER THE CALL). ink on bone 16.5:1 */
        solid: "bg-bone text-ink hover:bg-raised hover:text-bone",
        /** Ending a call only. ink on signal 5.57:1 */
        signal: "bg-signal text-ink hover:bg-bone",
        ghost: "border border-line text-bone hover:border-bone",
      },
      size: {
        md: "h-12 px-6",
        lg: "h-14 px-8",
      },
    },
    defaultVariants: { variant: "solid", size: "lg" },
  },
);

type Props = React.ComponentProps<"button"> &
  VariantProps<typeof button> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}
