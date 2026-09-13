"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CityDialog } from "@/game/ui/CityDialog";

const LAST_SCENE = 6;

const SCENE_DURATION = [4800, 4600, 5000, 4200, 4000, 4600] as const;

interface CampaignTrailerProps {
  onExit: () => void;
}

/**
 * A deterministic, spoiler-light compression of the real detective campaign.
 * It deliberately uses the same people, evidence and consequence loop as the
 * full case; the only thing removed is travel and conversational waiting time.
 */
export function CampaignTrailer({ onExit }: CampaignTrailerProps) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [linked, setLinked] = useState(false);

  const goTo = useCallback((next: number) => {
    setScene(Math.max(0, Math.min(LAST_SCENE, next)));
  }, []);

  useEffect(() => {
    if (!playing || scene >= LAST_SCENE) return;
    const timer = window.setTimeout(() => {
      if (scene === 4) setLinked(true);
      goTo(scene + 1);
    }, SCENE_DURATION[scene] ?? 4000);
    return () => window.clearTimeout(timer);
  }, [goTo, playing, scene]);

  const linkEvidence = () => {
    setLinked(true);
    window.setTimeout(() => goTo(5), 380);
  };

  return (
    <CityDialog
      open
      onOpenChange={(open) => { if (!open) onExit(); }}
      title="The Ten-Minute Window campaign preview"
      showCloseButton={false}
      className="npc-demo-stage"
    >
      <section className="campaign-trailer" aria-label="Thirty-second detective campaign preview">
        <header className="campaign-trailer-header">
          <div>
            <span>Scam City · Detective campaign · 30-second preview</span>
            <h2>The Ten-Minute Window</h2>
          </div>
          <div className="campaign-trailer-header-actions">
            {scene < LAST_SCENE && (
              <button type="button" onClick={() => setPlaying((value) => !value)}>
                {playing ? "Pause" : "Resume"}
              </button>
            )}
            <button type="button" onClick={onExit}>Exit preview <span aria-hidden="true">×</span></button>
          </div>
        </header>

        <div className="campaign-trailer-stage">
          {scene === 0 && (
            <article className="trailer-scene trailer-call">
              <Image src="/art/frames/scammer_girl.png" alt="Mara calls the detective after receiving a spoofed bank call" fill sizes="(min-width: 768px) 68rem, 100vw" priority />
              <div className="trailer-vignette" />
              <div className="trailer-chapter">
                <span>01 · The call</span>
                <strong>A victim asks for help.</strong>
                <p className="trailer-scene-explainer"><em>What happens here</em>Mara calls the fraud desk. The player answers as Detective Miller, asks for the first details and starts the recovery clock.</p>
              </div>
              <div className="trailer-phone">
                <div className="trailer-phone-id"><i aria-hidden="true">MO</i><p><span>Incoming case</span><strong>Mara Okoye</strong><small>Victim · urgent</small></p></div>
                <blockquote>“Detective? Someone called from my bank. I read them the code—and ₹4,80,000 vanished.”</blockquote>
                <div className="trailer-phone-answer"><i aria-hidden="true" /><span>Detective Miller: “Stay with me. When was the call, and what did he ask for?”</span></div>
              </div>
              <div className="trailer-clock"><span>Clearing window</span><strong>09:59</strong><small>The case begins when the call ends</small></div>
            </article>
          )}

          {scene === 1 && (
            <article className="trailer-scene trailer-interview">
              <Image src="/art/panels/victim-flat/bg-v2.png" alt="Detective Miller interviews Mara in her flat" fill sizes="(min-width: 768px) 68rem, 100vw" priority />
              <div className="trailer-vignette" />
              <div className="trailer-chapter">
                <span>02 · Interview the victim</span>
                <strong>Listen for what matters.</strong>
                <p className="trailer-scene-explainer"><em>What happens here</em>The player asks focused follow-up questions. Mara’s answers reveal clues that can be inspected and preserved in the case file.</p>
              </div>
              <div className="trailer-conversation">
                <div data-speaker="detective"><span>You · Detective Miller</span><p>“What exactly did the caller ask you to read?”</p></div>
                <div data-speaker="npc"><span>Mara Okoye · victim</span><p>“A six-digit ‘cancellation code.’ The message actually said AUTHORISE.”</p></div>
              </div>
              <div className="trailer-evidence-toast"><span>Clue preserved</span><strong>OTP message · 22:01</strong><small>Added to case file</small></div>
            </article>
          )}

          {scene === 2 && (
            <article className="trailer-scene trailer-people">
              <div className="trailer-chapter trailer-chapter-static"><span>03 · Follow the leads</span><strong>Different people hold different pieces.</strong><p className="trailer-scene-explainer"><em>What happens here</em>The detective visits different personalities, questions their stories and compares what they say before accusing anyone.</p></div>
              <div className="trailer-person-grid">
                <section>
                  <Image src="/art/panels/repair-shop/bg.png" alt="Ravi at his phone repair shop" fill sizes="32rem" />
                  <div><span>Ravi Sunder · repair technician</span><blockquote>“Screen replacement. Forty minutes. The SIM never left her sight.”</blockquote><small>Lead status · contested</small></div>
                </section>
                <section>
                  <Image src="/art/panels/police-station/bg.png" alt="Sergeant Brennan at the police station" fill sizes="32rem" />
                  <div><span>Sgt Brennan · police liaison</span><blockquote>“Bring me the call, the code and the bank trail. Then I can act.”</blockquote><small>New objective · substantiate the chain</small></div>
                </section>
              </div>
              <div className="trailer-route-strip"><i data-done="true">Victim</i><b>→</b><i data-done="true">Repair shop</i><b>→</b><i data-done="true">Police</i><b>→</b><i>Bank</i></div>
            </article>
          )}

          {scene === 3 && (
            <article className="trailer-scene trailer-bank">
              <Image src="/art/generated/bank-intervention.png" alt="Detective Miller requests an emergency hold from bank officer Vance" fill sizes="(min-width: 768px) 68rem, 100vw" priority />
              <div className="trailer-vignette" />
              <div className="trailer-chapter">
                <span>04 · Test your case</span>
                <strong>Characters do not obey without proof.</strong>
                <p className="trailer-scene-explainer"><em>What happens here</em>The player asks Vance to stop the transfer. He refuses because the detective has not yet presented a defensible evidence chain.</p>
              </div>
              <div className="trailer-conversation trailer-bank-dialogue">
                <div data-speaker="detective"><span>You · Detective Miller</span><p>“Freeze the transfer on the Okoye account.”</p></div>
                <div data-speaker="npc"><span>Teller Vance · bank compliance</span><p>“On what specific grounds? I cannot stop a lawful transfer on instinct.”</p></div>
              </div>
              <div className="trailer-stakes"><span>Settlement pending</span><strong>₹4,80,000</strong><small>Evidence changes what Vance will do</small></div>
            </article>
          )}

          {scene === 4 && (
            <article className="trailer-scene trailer-board">
              <div className="trailer-chapter trailer-chapter-static"><span>05 · Make the deduction</span><strong>Turn interviews into an argument.</strong><p className="trailer-scene-explainer"><em>What happens here</em>The player uses the Case Board to connect the call, OTP and transfer timestamps. Try the deduction—or let autoplay demonstrate it.</p></div>
              <div className="trailer-clue-chain" aria-label="Evidence timeline">
                <div><span>Call log</span><strong>21:47</strong><p>Official bank number spoofed</p></div>
                <b aria-hidden="true">+</b>
                <div><span>OTP message</span><strong>22:01</strong><p>Code issued to Mara</p></div>
                <b aria-hidden="true">+</b>
                <div><span>Statement</span><strong>22:03</strong><p>Transfer authorised</p></div>
              </div>
              <button type="button" className="trailer-deduce" onClick={linkEvidence} disabled={linked}>
                <span><strong>{linked ? "Evidence linked" : "Link the timeline"}</strong><small>{linked ? "Presenting grounds to Vance…" : "Spoofed call → stolen OTP → transfer"}</small></span>
                <i>{linked ? "✓" : "Your move"}</i>
              </button>
              <div className="trailer-autoplay-note"><i aria-hidden="true" /><span>Autoplay continues in a moment</span></div>
            </article>
          )}

          {scene === 5 && (
            <article className="trailer-scene trailer-resolution">
              <Image src="/art/panels/bank-branch/bg.png" alt="The bank applies an emergency hold after the detective presents the evidence chain" fill sizes="(min-width: 768px) 68rem, 100vw" priority />
              <div className="trailer-vignette" />
              <div className="trailer-chapter">
                <span>06 · Consequence</span>
                <strong>Your evidence changes the outcome.</strong>
                <p className="trailer-scene-explainer"><em>What happens here</em>The linked facts change Vance’s response: the bank freezes the transfer and the police can advance the formal report.</p>
              </div>
              <div className="trailer-result">
                <span>Emergency intervention accepted</span>
                <strong>Transfer frozen</strong>
                <p>Vance accepted the linked timestamps. Brennan can now lodge the formal report.</p>
                <div><i>✓ Funds protected</i><i>✓ Police report unlocked</i><i>?</i><i>The wider case remains open</i></div>
              </div>
              <div className="trailer-npc-line"><span>Teller Vance</span><blockquote>“That chain is sufficient. I’m placing the hold now.”</blockquote></div>
            </article>
          )}

          {scene === 6 && (
            <article className="trailer-scene trailer-end">
              <span>Scam City presents</span>
              <h3>The Ten-Minute Window</h3>
              <p>Take the call. Interview the city. Build the case. Live with the result.</p>
              <div className="trailer-loop"><i>Victim call</i><b>→</b><i>Conversations</i><b>→</b><i>Clues</i><b>→</b><i>Deduction</i><b>→</b><i>Consequence</i></div>
              <strong>The preview is over. The investigation is not.</strong>
              <div className="trailer-end-actions">
                <button type="button" onClick={onExit}>Open full investigation</button>
                <button type="button" onClick={() => { setLinked(false); setScene(0); setPlaying(true); }}>Replay preview</button>
              </div>
            </article>
          )}
        </div>

        <footer className="campaign-trailer-controls">
          <button type="button" onClick={() => goTo(scene - 1)} disabled={scene === 0} aria-label="Previous preview scene">←</button>
          <div aria-label={`Preview scene ${scene + 1} of ${LAST_SCENE + 1}`}>
            {Array.from({ length: LAST_SCENE + 1 }, (_, index) => (
              <button key={index} type="button" data-active={index === scene} data-seen={index < scene} onClick={() => goTo(index)} aria-label={`Go to preview scene ${index + 1}`} />
            ))}
          </div>
          <p>{scene === LAST_SCENE ? "Preview complete" : playing ? "Autoplaying" : "Preview paused"}</p>
          <button type="button" onClick={() => goTo(scene + 1)} disabled={scene === LAST_SCENE} aria-label="Next preview scene">→</button>
        </footer>
      </section>
    </CityDialog>
  );
}
