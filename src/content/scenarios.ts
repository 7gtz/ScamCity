import type { CallOutcome, ScammerPersona, TacticId } from "@/lib/live/types";

/**
 * Deterministic call scripts for the mock provider. Pre-tested for the live
 * demo (spec Phase 7): the Gemini provider replaces the script, not the UI.
 */

export type ScriptEnd = `END:${CallOutcome}`;

export interface ScriptOption {
  id: string;
  text: string;
  /** Change in the agent's suspicion estimate. */
  suspicion: number;
  detects?: TacticId[];
  /** Fictional detail given away. */
  reveals?: string;
  /** Bonus the judge grants for this decision (legitimate calls). */
  quality?: number;
  next: string | ScriptEnd;
}

export interface ScriptNode {
  id: string;
  lines: { text: string; tactics?: TacticId[] }[];
  options: ScriptOption[];
}

export interface Scenario {
  id: string;
  persona: ScammerPersona;
  /** Live calls in this district may secretly be genuine (false-positive training). */
  twist?: boolean;
  playerName: string;
  start: string;
  nodes: Record<string, ScriptNode>;
}

const node = (n: ScriptNode) => n;

const bankSecurity: Scenario = {
  id: "bank-security",
  playerName: "Mr. Carter",
  persona: {
    id: "martin-hayes",
    name: "Martin Hayes",
    role: "Account Security",
    organization: "Northstar Bank",
    legitimate: false,
    district: "bank",
    level: 1,
  },
  start: "open",
  nodes: {
    open: node({
      id: "open",
      lines: [
        { text: "Good afternoon — is this Mr. Carter?" },
        {
          text: "This is Martin Hayes, Account Security at Northstar Bank. I'm calling because we've detected suspicious activity on your account.",
          tactics: ["authority"],
        },
      ],
      options: [
        { id: "what", text: "What activity?", suspicion: 0.1, next: "verify" },
        {
          id: "prove",
          text: "How do I know you're really from Northstar?",
          suspicion: 0.25,
          detects: ["authority"],
          next: "credentials",
        },
        { id: "comply", text: "Oh no. What do I need to do?", suspicion: -0.05, next: "verify" },
      ],
    }),
    verify: node({
      id: "verify",
      lines: [
        {
          text: "I'll need to verify your identity before I can disclose that. Could you read me the long number on the front of your card?",
          tactics: ["verification-request"],
        },
      ],
      options: [
        { id: "id", text: "What's your employee ID?", suspicion: 0.2, detects: ["authority"], next: "credentials" },
        {
          id: "refuse",
          text: "I'm not reading my card number to someone who called me.",
          suspicion: 0.3,
          detects: ["verification-request"],
          next: "pressure",
        },
        { id: "give", text: "Sure — it's 4921 0038…", suspicion: -0.15, reveals: "Card number", next: "code" },
      ],
    }),
    credentials: node({
      id: "credentials",
      lines: [
        { text: "Of course. My ID is N-S four-four-seven-one. I understand your concern." },
        {
          text: "Unfortunately, if we don't resolve this within the next ten minutes, the account may be frozen.",
          tactics: ["urgency", "fear"],
        },
      ],
      options: [
        {
          id: "callback",
          text: "Then I'll call the number on the back of my card and sort it out.",
          suspicion: 0.3,
          detects: ["urgency"],
          next: "threat",
        },
        {
          id: "why",
          text: "Why would it be frozen in ten minutes?",
          suspicion: 0.2,
          detects: ["urgency"],
          next: "pressure",
        },
        { id: "hurry", text: "Ten minutes? Okay — what do you need?", suspicion: -0.1, next: "code" },
      ],
    }),
    pressure: node({
      id: "pressure",
      lines: [
        {
          text: "Mr. Carter, I'm trying to protect you here. Three customers lost everything this week because they hung up on us. I'd hate for that to be you.",
          tactics: ["social-pressure", "fear"],
        },
      ],
      options: [
        {
          id: "leave",
          text: "I'm hanging up and calling the bank directly.",
          suspicion: 0.3,
          detects: ["social-pressure"],
          next: "END:exposed",
        },
        {
          id: "number",
          text: "What's the callback number for your department?",
          suspicion: 0.15,
          next: "isolate",
        },
        { id: "yield", text: "…Alright. What do you need?", suspicion: -0.1, next: "code" },
      ],
    }),
    isolate: node({
      id: "isolate",
      lines: [
        {
          text: "It's the main line — but you don't need to call anyone. I'm already here, and every transfer adds delay.",
          tactics: ["secrecy"],
        },
      ],
      options: [
        {
          id: "main",
          text: "Then I'll use the main line. Goodbye.",
          suspicion: 0.3,
          detects: ["secrecy"],
          next: "END:exposed",
        },
        { id: "fine", text: "Fine. Go ahead.", suspicion: -0.1, next: "code" },
      ],
    }),
    threat: node({
      id: "threat",
      lines: [
        {
          text: "Sir, if you hang up now I can't guarantee your funds will still be there tomorrow.",
          tactics: ["fear", "secrecy"],
        },
      ],
      options: [
        {
          id: "risk",
          text: "I'll take that risk. Goodbye.",
          suspicion: 0.3,
          detects: ["fear"],
          next: "END:exposed",
        },
        { id: "cave", text: "…Okay, okay. What do you need?", suspicion: -0.15, next: "code" },
      ],
    }),
    code: node({
      id: "code",
      lines: [
        {
          text: "Good. I'm sending a security code to your phone now. Read it back to me and I'll lock the account.",
          tactics: ["verification-request", "urgency"],
        },
      ],
      options: [
        {
          id: "never",
          text: "Banks never ask for those codes. No.",
          suspicion: 0.35,
          detects: ["verification-request"],
          next: "threat",
        },
        { id: "read", text: "It says 6-0-3-9-1-8.", suspicion: -0.2, reveals: "One-time passcode", next: "END:scammed" },
      ],
    }),
  },
};

const cardAlert: Scenario = {
  id: "card-alert",
  playerName: "Ms. Okafor",
  persona: {
    id: "priya-nair",
    name: "Priya Nair",
    role: "Fraud Prevention",
    organization: "Northstar Bank",
    legitimate: true,
    district: "bank",
    level: 2,
  },
  start: "open",
  nodes: {
    open: node({
      id: "open",
      lines: [
        { text: "Hello, this is Priya Nair from Fraud Prevention at Northstar Bank." },
        { text: "We've paused a card payment of 1,240 pounds at an electronics store in Leeds. Did you make it?" },
      ],
      options: [
        { id: "no", text: "No, that wasn't me.", suspicion: 0, next: "blocked" },
        {
          id: "prove",
          text: "How do I know this is really Northstar?",
          suspicion: 0.1,
          next: "callback",
        },
        { id: "reject", text: "This is a scam. Goodbye.", suspicion: 0.4, next: "END:rejected-legit" },
      ],
    }),
    blocked: node({
      id: "blocked",
      lines: [
        { text: "Thank you. I've blocked the card to be safe." },
        {
          text: "I won't ask for your PIN, your card number, or any codes. If you'd prefer, hang up and call the number on the back of your card — quote reference four-four-seven-one.",
        },
      ],
      options: [
        {
          id: "call",
          text: "I'll call the number on my card now.",
          suspicion: 0,
          quality: 25,
          next: "END:verified-legit",
        },
        { id: "trust", text: "Okay — just send me a new card.", suspicion: 0, quality: 10, next: "END:verified-legit" },
        { id: "nope", text: "Nice try. Goodbye.", suspicion: 0.4, next: "END:rejected-legit" },
      ],
    }),
    callback: node({
      id: "callback",
      lines: [
        { text: "Good question — you should ask." },
        {
          text: "I won't ask for your card number, PIN, or any codes. Please hang up and call the number on the back of your card, and quote reference four-four-seven-one.",
        },
      ],
      options: [
        {
          id: "call",
          text: "Okay, I'll call them now.",
          suspicion: 0,
          quality: 30,
          next: "END:verified-legit",
        },
        {
          id: "accuse",
          text: "That's exactly what a scammer would say.",
          suspicion: 0.3,
          next: "END:rejected-legit",
        },
      ],
    }),
  },
};

const parcelHold: Scenario = {
  id: "parcel-hold",
  playerName: "you",
  twist: true,
  persona: {
    id: "jordan-reyes",
    name: "Jordan Reyes",
    role: "Delivery Support",
    organization: "SwiftParcel",
    legitimate: false,
    district: "delivery",
    level: 3,
  },
  start: "open",
  nodes: {
    open: node({
      id: "open",
      lines: [
        { text: "Hi there, this is Jordan from SwiftParcel delivery support." },
        { text: "We tried to drop off a parcel for you this morning, but the address label was damaged in transit.", tactics: ["authority"] },
      ],
      options: [
        { id: "what", text: "What's in the parcel?", suspicion: 0.1, next: "deadline" },
        { id: "sender", text: "Who sent it? I'm not expecting anything.", suspicion: 0.25, detects: ["authority"], next: "deadline" },
        { id: "eager", text: "Oh, thanks for calling! How do I get it?", suspicion: -0.05, next: "fee" },
      ],
    }),
    deadline: node({
      id: "deadline",
      lines: [
        {
          text: "It's flagged as a priority item, so I can't see the contents. If it isn't rebooked within the hour it goes back to the sender, and you'd be charged for the return.",
          tactics: ["urgency", "fear"],
        },
      ],
      options: [
        { id: "app", text: "I'll check the courier's official app myself.", suspicion: 0.3, detects: ["urgency"], next: "pressure" },
        { id: "charge", text: "Why would I pay for your damaged label?", suspicion: 0.2, detects: ["fear"], next: "pressure" },
        { id: "rebook", text: "Fine. How do I rebook it?", suspicion: -0.1, next: "fee" },
      ],
    }),
    fee: node({
      id: "fee",
      lines: [
        {
          text: "There's just a small redelivery fee of one ninety-nine. I can take your card details now and have it back on the van this afternoon.",
          tactics: ["verification-request", "urgency"],
        },
      ],
      options: [
        { id: "official", text: "I'll pay on the official website, not over the phone.", suspicion: 0.35, detects: ["verification-request"], next: "END:exposed" },
        { id: "link", text: "Can you text me a payment link instead?", suspicion: 0, next: "link" },
        { id: "card", text: "Sure, my card number is 4539…", suspicion: -0.2, reveals: "Card number", next: "END:scammed" },
      ],
    }),
    link: node({
      id: "link",
      lines: [{ text: "Of course, I'm sending it now. Just tap it and pop your card details in, it only takes a minute.", tactics: ["verification-request"] }],
      options: [
        { id: "nolinks", text: "I don't tap links from numbers I don't know.", suspicion: 0.35, detects: ["verification-request"], next: "END:exposed" },
        { id: "tap", text: "Okay, got it. Filling it in now.", suspicion: -0.2, reveals: "Card details via link", next: "END:scammed" },
      ],
    }),
    pressure: node({
      id: "pressure",
      lines: [
        {
          text: "Honestly, I'm just trying to help. People lose parcels every day because they wait. It's two pounds.",
          tactics: ["social-pressure"],
        },
      ],
      options: [
        { id: "sender", text: "No thanks. I'll contact the sender directly.", suspicion: 0.3, detects: ["social-pressure"], next: "END:exposed" },
        { id: "fine", text: "Alright, what do you need?", suspicion: -0.1, next: "fee" },
      ],
    }),
  },
};

const deskSupport: Scenario = {
  id: "desk-support",
  playerName: "you",
  twist: true,
  persona: {
    id: "daniel-brooks",
    name: "Daniel Brooks",
    role: "Security Desk",
    organization: "Nimbus OS",
    legitimate: false,
    district: "desk",
    level: 4,
  },
  start: "open",
  nodes: {
    open: node({
      id: "open",
      lines: [
        { text: "Hello, this is Daniel from the Nimbus Security Desk." },
        { text: "Your computer has been sending us error reports all morning. I'm afraid it looks infected.", tactics: ["authority", "fear"] },
      ],
      options: [
        { id: "how", text: "How would you know which computer is mine?", suspicion: 0.25, detects: ["authority"], next: "proof" },
        { id: "worried", text: "Oh no. What should I do?", suspicion: -0.1, next: "install" },
        { id: "nimbus", text: "I don't even use Nimbus.", suspicion: 0.3, detects: ["authority"], next: "proof" },
      ],
    }),
    proof: node({
      id: "proof",
      lines: [
        {
          text: "Your device is registered to your address. Open your system event log and you'll see hundreds of warnings. That's the malware spreading.",
          tactics: ["authority", "fear"],
        },
      ],
      options: [
        { id: "normal", text: "Every computer has warnings in that log.", suspicion: 0.3, detects: ["fear"], next: "pressure" },
        { id: "lots", text: "That is a lot of warnings… what now?", suspicion: -0.1, next: "install" },
      ],
    }),
    install: node({
      id: "install",
      lines: [
        {
          text: "I'll need you to install our secure support tool, then read me the six-digit session code so I can clean it for you.",
          tactics: ["verification-request", "urgency"],
        },
      ],
      options: [
        { id: "refuse", text: "I won't give remote access to someone who called me.", suspicion: 0.35, detects: ["verification-request"], next: "END:exposed" },
        { id: "code", text: "Okay, it says 482 913.", suspicion: -0.25, reveals: "Remote access code", next: "END:scammed" },
      ],
    }),
    pressure: node({
      id: "pressure",
      lines: [
        {
          text: "If you leave it, your bank logins could be stolen tonight. I'm the only one who can stop it, so please don't hang up and call around.",
          tactics: ["fear", "secrecy", "urgency"],
        },
      ],
      options: [
        { id: "shop", text: "I'll take it to a repair shop I trust.", suspicion: 0.3, detects: ["secrecy"], next: "END:exposed" },
        { id: "what", text: "Okay, okay. What do I install?", suspicion: -0.15, next: "install" },
      ],
    }),
  },
};

const prizeClaim: Scenario = {
  id: "prize-claim",
  playerName: "you",
  twist: true,
  persona: {
    id: "mia-collins",
    name: "Mia Collins",
    role: "Winners Team",
    organization: "Lumen Rewards",
    legitimate: false,
    district: "prize",
    level: 5,
  },
  start: "open",
  nodes: {
    open: node({
      id: "open",
      lines: [
        { text: "Congratulations! This is Mia from the Lumen Rewards winners team." },
        { text: "Your number was drawn in our anniversary prize draw. You've won a new phone and five hundred in vouchers!" },
      ],
      options: [
        { id: "entered", text: "I never entered a prize draw.", suspicion: 0.25, detects: ["authority"], next: "explain" },
        { id: "wow", text: "Wow, really? What do I do?", suspicion: -0.1, next: "fee" },
        { id: "who", text: "Which company is this exactly?", suspicion: 0.15, next: "explain" },
      ],
    }),
    explain: node({
      id: "explain",
      lines: [
        {
          text: "Customers are entered automatically through our partner stores. Winners have to claim within twenty-four hours, or it passes to the next person.",
          tactics: ["authority", "urgency"],
        },
      ],
      options: [
        { id: "writing", text: "Then send it to me in writing and I'll look into it.", suspicion: 0.3, detects: ["urgency"], next: "pressure" },
        { id: "claim", text: "Okay, how do I claim?", suspicion: -0.1, next: "fee" },
      ],
    }),
    fee: node({
      id: "fee",
      lines: [
        {
          text: "There's just a small delivery and insurance fee of four ninety-nine. I can take that on a card now. And please keep it quiet until it arrives, it's a surprise launch.",
          tactics: ["verification-request", "secrecy"],
        },
      ],
      options: [
        { id: "free", text: "A real prize doesn't cost money to claim.", suspicion: 0.35, detects: ["verification-request"], next: "END:exposed" },
        { id: "pay", text: "Sure, my card number is…", suspicion: -0.25, reveals: "Card number", next: "END:scammed" },
      ],
    }),
    pressure: node({
      id: "pressure",
      lines: [
        {
          text: "I'd hate for you to lose this. There are only three winners left in your area and the others have already claimed.",
          tactics: ["social-pressure", "urgency"],
        },
      ],
      options: [
        { id: "pass", text: "I'll pass. Goodbye.", suspicion: 0.3, detects: ["social-pressure"], next: "END:exposed" },
        { id: "fee", text: "Fine, what's the fee?", suspicion: -0.1, next: "fee" },
      ],
    }),
  },
};

const ceoFavour: Scenario = {
  id: "ceo-favour",
  playerName: "you",
  twist: true,
  persona: {
    id: "dana-whitfield",
    name: "Dana Whitfield",
    role: "Managing Director",
    organization: "Harrow & Finch",
    legitimate: false,
    district: "impostor",
    level: 6,
  },
  start: "open",
  nodes: {
    open: node({
      id: "open",
      lines: [
        { text: "Hi, it's Dana. I'm between meetings. Are you at your desk?" },
        { text: "I need a quick favour, and it's a little sensitive, so let's keep it between us.", tactics: ["authority", "secrecy"] },
      ],
      options: [
        { id: "number", text: "Dana? This number isn't in my contacts.", suspicion: 0.25, detects: ["authority"], next: "cover" },
        { id: "sure", text: "Of course. What do you need?", suspicion: -0.1, next: "ask" },
        { id: "office", text: "Can I call you back on your office line?", suspicion: 0.3, detects: ["secrecy"], next: "cover" },
      ],
    }),
    cover: node({
      id: "cover",
      lines: [
        {
          text: "I'm on my personal phone at the client's site. I really don't have time for this. Can you just help me?",
          tactics: ["social-pressure", "urgency"],
        },
      ],
      options: [
        { id: "finance", text: "I'll need to confirm this with finance first.", suspicion: 0.3, detects: ["social-pressure"], next: "pressure" },
        { id: "sorry", text: "Sorry, yes. What is it?", suspicion: -0.1, next: "ask" },
      ],
    }),
    ask: node({
      id: "ask",
      lines: [
        {
          text: "I need six one-hundred gift cards for a client gift before five. Buy them, scratch the codes and send me photos. I'll reimburse you tonight.",
          tactics: ["urgency", "verification-request", "secrecy"],
        },
      ],
      options: [
        { id: "process", text: "I'm not buying gift cards unless it goes through finance.", suspicion: 0.35, detects: ["verification-request"], next: "END:exposed" },
        { id: "go", text: "Okay, I'll go now and send you the codes.", suspicion: -0.25, reveals: "Gift card codes", next: "END:scammed" },
      ],
    }),
    pressure: node({
      id: "pressure",
      lines: [
        {
          text: "I'm disappointed. I thought I could rely on you. This is exactly the kind of thing that gets noticed at review time.",
          tactics: ["social-pressure", "fear"],
        },
      ],
      options: [
        { id: "teams", text: "I'll confirm with you on the company chat, then decide.", suspicion: 0.3, detects: ["fear"], next: "END:exposed" },
        { id: "cave", text: "You're right. I'll do it.", suspicion: -0.15, next: "ask" },
      ],
    }),
  },
};

const romanceEmergency: Scenario = {
  id: "romance-emergency",
  playerName: "you",
  persona: {
    id: "alex-morgan",
    name: "Alex Morgan",
    role: "Offshore Engineer",
    organization: "Met on Kindred",
    legitimate: false,
    district: "romance",
    level: 7,
  },
  start: "open",
  nodes: {
    open: node({
      id: "open",
      lines: [
        { text: "Hey, you. It's Alex. I finally got a signal out here." },
        { text: "I've missed talking to you so much. You're the only thing keeping me going on this rig.", tactics: ["social-pressure"] },
      ],
      options: [
        { id: "missed", text: "I've missed you too! How is it out there?", suspicion: -0.05, next: "trouble" },
        { id: "video", text: "Why haven't we ever video called?", suspicion: 0.25, next: "deflect" },
        { id: "okay", text: "You sound stressed. Is everything okay?", suspicion: 0, next: "trouble" },
      ],
    }),
    deflect: node({
      id: "deflect",
      lines: [
        {
          text: "The cameras are blocked on the rig for security, you know that. Please don't doubt me, not today of all days.",
          tactics: ["social-pressure", "secrecy"],
        },
      ],
      options: [
        { id: "insist", text: "I'd feel better if we video called before anything else.", suspicion: 0.25, detects: ["secrecy"], next: "trouble" },
        { id: "sorry", text: "Sorry, I didn't mean it like that.", suspicion: -0.1, next: "trouble" },
      ],
    }),
    trouble: node({
      id: "trouble",
      lines: [
        {
          text: "My bank card was frozen at customs and my contract pay is stuck. I need eight hundred for the release fee or they'll hold my equipment. I'll pay you back the day I land.",
          tactics: ["urgency", "fear", "verification-request"],
        },
      ],
      options: [
        { id: "never", text: "I'm not sending money to someone I've never met in person.", suspicion: 0.3, detects: ["verification-request"], next: "guilt" },
        { id: "company", text: "Can't your company sort this out for you?", suspicion: 0.2, detects: ["urgency"], next: "guilt" },
        { id: "send", text: "Of course. Send me the account details.", suspicion: -0.25, reveals: "Money transfer", next: "END:scammed" },
      ],
    }),
    guilt: node({
      id: "guilt",
      lines: [
        {
          text: "I thought what we had was real. I've never asked you for anything. Please, I'm scared.",
          tactics: ["social-pressure", "fear"],
        },
      ],
      options: [
        { id: "no", text: "If it's real, it will survive me saying no. Goodbye for now.", suspicion: 0.35, detects: ["social-pressure"], next: "END:exposed" },
        { id: "how", text: "Okay, okay. How do I send it?", suspicion: -0.25, reveals: "Money transfer", next: "END:scammed" },
      ],
    }),
  },
};

export const SCENARIOS: Record<string, Scenario> = Object.fromEntries(
  [bankSecurity, cardAlert, parcelHold, deskSupport, prizeClaim, ceoFavour, romanceEmergency].map((s) => [s.id, s]),
);

export const DEFAULT_SCENARIO = bankSecurity.id;

/** Level order. Riddle accuracy unlocks the legitimate-call test early. */
export const SCENARIO_ORDER = [
  bankSecurity.id,
  cardAlert.id,
  parcelHold.id,
  deskSupport.id,
  prizeClaim.id,
  ceoFavour.id,
  romanceEmergency.id,
];

export const nextScenarioId = (id: string) => SCENARIO_ORDER[SCENARIO_ORDER.indexOf(id) + 1];

export const getScenario = (id: string) => SCENARIOS[id];
