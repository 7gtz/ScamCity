"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { scrollToTarget } from "@/lib/motion/lenis";

type Props = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  cursor?: "enter" | "magnetic" | "talk";
};

/** `ENTER THE CITY →`: text, hairline and arrow. No fill, no box (MASTER §6). */
export function CtaLink({ href, onClick, children, className, cursor = "enter" }: Props) {
  const inner = (
    <>
      <span className="relative py-1">
        {children}
        <span aria-hidden className="absolute -bottom-0.5 left-0 h-px w-full bg-line" />
        <span
          aria-hidden
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-bone transition-transform duration-[320ms] ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
        />
      </span>
      <ArrowRight
        aria-hidden
        strokeWidth={1.25}
        className="size-4 transition-transform duration-[320ms] ease-out group-hover:translate-x-1"
      />
    </>
  );

  const classes = cn("group ui-label inline-flex min-h-11 items-center gap-3 text-bone", className);

  if (href?.startsWith("#")) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          scrollToTarget(href);
        }}
        className={classes}
        data-cursor={cursor}
      >
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={classes} data-cursor={cursor}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes} data-cursor={cursor}>
      {inner}
    </button>
  );
}
