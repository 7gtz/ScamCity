"use client";

import { usePathname } from "next/navigation";
import { FreestyleEngine } from "@/features/freestyle/FreestyleEngine";
import { FreestylePill } from "@/features/freestyle/FreestylePill";
import { Cursor } from "./Cursor";
import { Grain } from "./Grain";
import { Nav } from "./Nav";
import { ScrollProgress } from "./ScrollProgress";
import { SmoothScroll } from "./SmoothScroll";
import { StoreHydrator } from "./StoreHydrator";

/**
 * Global chrome. The call room (/play/*) is immersive: no smooth scroll,
 * no nav, no scroll hairline (pages/call-room.md).
 */
export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = pathname.startsWith("/play");

  return (
    <>
      {!immersive && <SmoothScroll />}
      {!immersive && <Nav />}
      {/* Counts landing sections — meaningless (and wrong) anywhere else. */}
      {pathname === "/" && <ScrollProgress />}
      <main id="main">{children}</main>
      <StoreHydrator />
      <FreestyleEngine />
      <FreestylePill />
      <Cursor />
      <Grain />
    </>
  );
}
