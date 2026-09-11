"use client";

import { usePathname } from "next/navigation";
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
      {!immersive && <ScrollProgress />}
      <main id="main">{children}</main>
      <StoreHydrator />
      <Cursor />
      <Grain />
    </>
  );
}
