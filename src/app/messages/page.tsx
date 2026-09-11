import type { Metadata } from "next";
import { ChatPlayer } from "@/features/messages/ChatPlayer";

export const metadata: Metadata = { title: "Messages — SCAM CITY" };

export default function MessagesPage() {
  return (
    <div data-tone="ember" className="tone-ember min-h-dvh bg-ink">
      <div className="gutter-x mx-auto flex max-w-[1600px] flex-col gap-10 pt-[calc(var(--nav-h)+3rem)] pb-24">
        <header className="flex flex-col gap-4">
          <p className="meta text-smoke">Channel · Messages</p>
          <h1 className="display-m">
            Someone is <em className="font-light text-amber">texting you.</em>
          </h1>
        </header>
        <ChatPlayer />
      </div>
    </div>
  );
}
