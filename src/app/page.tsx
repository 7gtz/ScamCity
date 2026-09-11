import { City } from "@/components/sections/City";
import { FinalCta } from "@/components/sections/FinalCta";
import { Impact } from "@/components/sections/Impact";
import { IncomingCall } from "@/components/sections/IncomingCall";
import { Judge } from "@/components/sections/Judge";
import { Opening } from "@/components/sections/Opening";
import { Opponent } from "@/components/sections/Opponent";
import { Progression } from "@/components/sections/Progression";
import { RiddleSection } from "@/components/sections/RiddleSection";
import { Threat } from "@/components/sections/Threat";

/**
 * One continuous narrative (MASTER §7), ordered to get the player onto a call
 * fast: hook → a call to answer → why it matters → the districts → how it works.
 * Server-rendered; motion lives in client leaves.
 */
export default function Home() {
  return (
    <>
      <Opening />
      <IncomingCall />
      <Threat />
      <City />
      <Opponent />
      <Judge />
      <RiddleSection />
      <Progression />
      <Impact />
      <FinalCta />
    </>
  );
}
