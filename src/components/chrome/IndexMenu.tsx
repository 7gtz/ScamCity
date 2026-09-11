"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SECTIONS, sectionNumber, type SectionId } from "@/content/sections";
import { getLenis, scrollToTarget } from "@/lib/motion/lenis";
import { duration, ease, exit } from "@/lib/motion/tokens";

/** Full-screen section index; also the mobile navigation (MASTER §5). */
export function IndexMenu() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const lenis = getLenis();
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open]);

  const go = (id: SectionId) => {
    setOpen(false);
    if (pathname !== "/") {
      router.push(`/#${id}`);
      return;
    }
    getLenis()?.start();
    requestAnimationFrame(() => scrollToTarget(`#${id}`));
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="meta group flex min-h-11 items-center gap-3 px-2 text-bone"
        data-cursor="magnetic"
      >
        Index
        <span aria-hidden className="flex w-4 flex-col gap-[3px]">
          <span className="h-px w-full bg-bone transition-transform duration-[320ms] ease-out group-hover:scale-x-75" />
          <span className="h-px w-full origin-right bg-bone transition-transform duration-[320ms] ease-out group-hover:scale-x-50" />
        </span>
      </Dialog.Trigger>

      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Content forceMount asChild aria-describedby={undefined}>
              <motion.div
                className="gutter-x fixed inset-0 z-[85] flex flex-col bg-raised"
                initial={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
                animate={reduced ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
                exit={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)", transition: exit }}
                transition={{ duration: 0.8, ease }}
              >
                <div className="flex h-[var(--nav-h)] items-center justify-between border-b border-line">
                  <Dialog.Title className="meta text-smoke">Index</Dialog.Title>
                  <Dialog.Close className="meta flex min-h-11 items-center px-2 text-bone" data-cursor="magnetic">
                    Close
                  </Dialog.Close>
                </div>

                <nav aria-label="Sections" className="flex-1 overflow-y-auto py-8">
                  <ol>
                    {SECTIONS.map((section, i) => (
                      <motion.li
                        key={section.id}
                        className="border-b border-line"
                        initial={reduced ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: duration.reveal, ease, delay: 0.25 + i * 0.04 }}
                      >
                        <button
                          type="button"
                          onClick={() => go(section.id)}
                          className="group flex w-full items-baseline gap-6 py-3 text-left md:py-4"
                          data-cursor="magnetic"
                        >
                          <span className="meta w-8 shrink-0 text-smoke">{sectionNumber(section.id)}</span>
                          <span className="font-display text-[clamp(1.75rem,4vw,3.25rem)] leading-none tracking-[-0.02em] text-ash uppercase transition-colors duration-[180ms] group-hover:text-bone group-focus-visible:text-bone">
                            {section.label}
                          </span>
                        </button>
                      </motion.li>
                    ))}
                  </ol>
                </nav>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
