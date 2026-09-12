import { useEffect, useRef, useState } from "react";
import type { NpcSubtitle } from "./types";

export function SubtitleReel({ subtitles }: { subtitles: readonly NpcSubtitle[] }) {
  const reel = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!paused) reel.current?.scrollTo({ top: reel.current.scrollHeight, behavior: "auto" });
  }, [subtitles, paused]);

  return (
    <section aria-label="Conversation transcript">
    <button type="button" className="city-ui-button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Resume transcript following" : "Pause transcript following"}</button>
    <div ref={reel} className="npc-subtitle-reel" aria-live={paused ? "off" : "polite"} tabIndex={0}>
      {subtitles.length === 0 ? (
        <p className="npc-subtitle-empty">Connecting to the interview. You can type a question when connected, or leave and try again.</p>
      ) : (
        subtitles.map((line) => (
          <p key={line.id} className="npc-subtitle" data-speaker={line.speaker}>
            <span>{line.speaker === "npc" ? "Witness" : "You"}</span>
            {line.text}
            {!line.final && <i aria-label="speaking">▌</i>}
          </p>
        ))
      )}
    </div>
    </section>
  );
}
