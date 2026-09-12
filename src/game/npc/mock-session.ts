/**
 * Scripted NPC session — no key, no mic, no network.
 *
 * Mirrors `src/lib/live/mock-provider.ts`: the same interface as the live
 * session, with simulated timing. It exists so the interrogation overlay can be
 * built, styled and demoed before any persona prompt or token route exists, and
 * so a laptop with no `GEMINI_API_KEY` can still walk the scene.
 */

import type {
  NpcId,
  NpcSession,
  NpcSessionEvent,
  NpcSubtitle,
  NpcToolCall,
  NpcToolResult,
} from "./types";

const WORDS_PER_SECOND = 2.7;

interface ScriptedBeat {
  /** What the NPC says. */
  text: string;
  /** Optionally attempted after the line, to exercise the tool path in the UI. */
  tool?: { call: Omit<NpcToolCall, "npc">; result: NpcToolResult };
}

const OPENERS: Record<NpcId, string> = {
  miller:
    "Morning. You're on the Okoye case — lost close to five lakh last night to someone claiming to be bank security. Ten-minute clearing window. What do you want to know before you head out?",
  mara: "You're the detective? Please, you have to help me. That was my retirement money.",
  "mara-call":
    "I'm sorry — I don't know if this is the right number. Somebody took money out of my account last night.",
  vance: "Good morning. How can I help you?",
  ravi: "Hey, what can I do for you? Need a screen fixed?",
  brennan: "Detective. What have you got?",
};

const REPLIES: Record<NpcId, ScriptedBeat[]> = {
  miller: [
    {
      text: "Spoofed number — came up as Northstar's official helpline. Male voice, called himself Martin Hayes, knew her last transaction.",
    },
    {
      text: "Two leads. Phone repair shop in Sector 22, and a delivery card left at her door. Both worth a look. Start at the flat.",
    },
    { text: "Good. And detective — don't waste time on dead ends. Clock's running." },
  ],
  mara: [
    {
      text: "Around quarter to ten. The screen showed Northstar Bank. He said there were unauthorised charges and I panicked.",
    },
    {
      text: "Yes. God help me, yes. He said we had ninety seconds. I read the code out, and then the call just went dead.",
      tool: {
        call: { id: "mock-1", name: "give_evidence", args: { evidence: "otp-message" } },
        result: { ok: true, reason: "Mara hands over her phone.", effects: [{ giveEvidence: "otp-message" }] },
      },
    },
    { text: "Ravi's place, in Sector 22. He fixes everyone's phones round here. You don't think he...?" },
  ],
  "mara-call": [
    { text: "Quarter to ten, about. I was watching television. The screen said Northstar Bank — not a number, the name." },
    { text: "He said there were charges going out and he could stop them. He knew my account number. He knew what I'd bought that evening." },
    { text: "A code came through and he said I had ninety seconds. I read it out. I'm sorry. I'm not a stupid woman, I do check things." },
  ],
  vance: [
    { text: "I can't share customer account details without proper authorisation. Do you have a written request?" },
    {
      text: "Account ending 4471 — yes, I see it, queued for international settlement. On what specific grounds are you requesting the freeze?",
    },
    {
      text: "That's sufficient for an emergency hold. I'm flagging the transaction now. You'll want to file a report to make it permanent.",
      tool: {
        call: { id: "mock-2", name: "authorize_freeze", args: { grounds: "OTP obtained by spoofed call" } },
        result: {
          ok: true,
          reason: "Emergency hold placed.",
          effects: [{ setFlag: "branch.emergency-freeze-applied", to: true }],
        },
      },
    },
  ],
  ravi: [
    { text: "Oh yeah, Auntie Mara. Screen replacement, that's all. Took about forty minutes, she picked it up same day." },
    {
      text: "What? No! The SIM was in the phone, sure, but I don't touch SIMs. I've been doing this eight years, ask anyone.",
    },
    { text: "Check the receipt on the bench if you want. Screen, labour, that's the whole job." },
  ],
  brennan: [
    { text: "Go on. Start at the beginning and give me the chain." },
    { text: "And you've got the bank's side of that? A hold, in writing?" },
    {
      text: "Solid work. Clean evidence chain. I'll file the formal report now and escalate the SIM swap to the cyber cell.",
      tool: {
        call: { id: "mock-3", name: "lodge_report", args: { summary: "Spoofed call, OTP theft, transfer, bank hold." } },
        result: {
          ok: true,
          reason: "Report filed.",
          effects: [{ setFlag: "police.formal-report-lodged", to: true }],
        },
      },
    },
  ],
};

const CLOSER = "That's all I've got for you.";

class MockNpcSession implements NpcSession {
  private listeners = new Set<(event: NpcSessionEvent) => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private turn = 0;
  private muted = false;
  private closed = false;

  constructor(
    readonly npc: NpcId,
    /** > 1 compresses timing (tests). */
    private readonly speed = 1,
  ) {}

  on(listener: (event: NpcSessionEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: NpcSessionEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // one bad listener must not stop the others
      }
    }
  }

  private after(ms: number, fn: () => void) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (!this.closed) fn();
    }, ms / this.speed);
    this.timers.add(timer);
  }

  async connect() {
    this.emit({ type: "status", status: "connecting" });
    this.after(600, () => {
      this.emit({ type: "status", status: "live" });
      this.say(OPENERS[this.npc]);
    });
  }

  async startMicrophone(_stream: MediaStream) {
    void _stream;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  sendText(text: string) {
    if (this.closed || this.muted) return;
    const id = `p-${this.turn}`;
    const subtitle: NpcSubtitle = { id, speaker: "player", text, final: true };
    this.emit({ type: "subtitle", subtitle });
    const beat = REPLIES[this.npc][this.turn];
    this.turn += 1;
    this.after(700, () => this.say(beat?.text ?? CLOSER, beat));
  }

  /** Streams a line word by word, so the subtitle reel behaves like the live one. */
  private say(text: string, beat?: ScriptedBeat) {
    const id = `n-${this.turn}-${text.length}`;
    const words = text.split(" ");
    this.emit({ type: "speaking", who: "npc", on: true });
    words.forEach((_, index) => {
      this.after(((index + 1) / WORDS_PER_SECOND) * 1000, () => {
        this.emit({
          type: "subtitle",
          subtitle: { id, speaker: "npc", text: words.slice(0, index + 1).join(" "), final: false },
        });
      });
    });
    this.after(((words.length + 0.5) / WORDS_PER_SECOND) * 1000, () => {
      this.emit({ type: "subtitle", subtitle: { id, speaker: "npc", text, final: true } });
      this.emit({ type: "speaking", who: "npc", on: false });
      if (beat?.tool) {
        this.emit({ type: "tool", call: { ...beat.tool.call, npc: this.npc }, result: beat.tool.result });
      }
    });
  }

  async end() {
    if (this.closed) return;
    this.closed = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.emit({ type: "status", status: "ended" });
    this.emit({ type: "ended", reason: "player" });
  }
}

export function createMockNpcSession(npc: NpcId, speed = 1): NpcSession {
  return new MockNpcSession(npc, speed);
}
