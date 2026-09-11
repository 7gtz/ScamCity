import type { Metadata } from "next";
import { WebPlayer } from "@/features/web/WebPlayer";

export const metadata: Metadata = { title: "Web — SCAM CITY" };

export default function WebPage() {
  return (
    <div data-tone="ember" className="tone-ember min-h-dvh bg-ink">
      <div className="gutter-x mx-auto flex max-w-[1600px] flex-col gap-10 pt-[calc(var(--nav-h)+3rem)] pb-24">
        <header className="flex flex-col gap-4">
          <p className="meta text-smoke">Channel · Web</p>
          <h1 className="display-m">
            A link brought you <em className="font-light text-amber">here.</em>
          </h1>
          <p className="max-w-[60ch] text-ash">
            Check the address bar and the padlock before you trust the page. Use it, leave and report it, or decide
            it&rsquo;s fine.
          </p>
        </header>
        <WebPlayer />
      </div>
    </div>
  );
}
