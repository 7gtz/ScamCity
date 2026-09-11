import type { Metadata } from "next";
import { InboxPlayer } from "@/features/inbox/InboxPlayer";

export const metadata: Metadata = { title: "Inbox — SCAM CITY" };

export default function InboxPage() {
  return (
    <div data-tone="ember" className="tone-ember min-h-dvh bg-ink">
      <div className="gutter-x mx-auto flex max-w-[1600px] flex-col gap-10 pt-[calc(var(--nav-h)+3rem)] pb-24">
        <header className="flex flex-col gap-4">
          <p className="meta text-smoke">02 · Inbox · Email &amp; phishing</p>
          <h1 className="display-m">
            You have <em className="font-light text-amber">one new email.</em>
          </h1>
          <p className="max-w-[60ch] text-ash">
            Read it like you normally would. Hover links to see where they really go, open the sender details, then
            report it or mark it safe.
          </p>
        </header>
        <InboxPlayer />
      </div>
    </div>
  );
}
