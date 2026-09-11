"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS, type SectionId } from "@/content/sections";
import { cn } from "@/lib/cn";
import { scrollToTarget } from "@/lib/motion/lenis";
import { IndexMenu } from "./IndexMenu";

/** Quiet fixed navigation (MASTER §5). Links recede on scroll down. */
export function Nav() {
  const pathname = usePathname();
  const [condensed, setCondensed] = useState(false);
  const [backdrop, setBackdrop] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) > 4) setCondensed(y > last && y > 80);
      setBackdrop(y > window.innerHeight);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (target: SectionId) => (e: React.MouseEvent) => {
    if (pathname !== "/") return;
    e.preventDefault();
    scrollToTarget(`#${target}`);
  };

  return (
    <header
      className={cn(
        "gutter-x fixed inset-x-0 top-0 z-[80] transition-colors duration-[320ms] ease-out",
        backdrop ? "bg-ink/80 backdrop-blur-[2px]" : "bg-transparent",
      )}
    >
      <nav aria-label="Primary" className="flex h-[var(--nav-h)] items-center justify-between">
        <Link href="/" className="meta -mx-2 flex min-h-11 items-center px-2 text-bone" data-cursor="magnetic">
          Scam City
        </Link>

        <div className="flex items-center gap-2 md:gap-6">
          <ul
            className={cn(
              "hidden items-center gap-2 transition-[opacity,transform] duration-[320ms] ease-out md:flex",
              condensed && "pointer-events-none -translate-y-1 opacity-0",
            )}
            aria-hidden={condensed || undefined}
          >
            {NAV_LINKS.map((link) => (
              <li key={link.target}>
                <a
                  href={`/#${link.target}`}
                  onClick={go(link.target)}
                  tabIndex={condensed ? -1 : undefined}
                  className="meta flex min-h-11 items-center px-3 text-ash transition-colors duration-[180ms] hover:text-bone"
                  data-cursor="magnetic"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <IndexMenu />
        </div>
      </nav>
    </header>
  );
}
