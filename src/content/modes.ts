/** Every way to play (the 3D menu and Freestyle draw from this list). */
export interface Mode {
  id: "calls" | "inbox" | "messages" | "web" | "riddles" | "freestyle";
  number: string;
  title: string;
  kicker: string;
  line: string;
  href: string;
  /** How it reaches the player in real life. */
  channel: string;
}

export const MODES: Mode[] = [
  {
    id: "freestyle",
    number: "00",
    title: "Freestyle",
    kicker: "Everything, unannounced",
    line: "Wake up and carry on with your day. Calls, emails, texts and websites arrive when you least expect them.",
    href: "/freestyle",
    channel: "All channels",
  },
  {
    id: "calls",
    number: "01",
    title: "Calls",
    kicker: "Live voice",
    line: "Talk out loud to an AI caller that adapts, pivots and knows where you are.",
    href: "/play",
    channel: "Phone",
  },
  {
    id: "inbox",
    number: "02",
    title: "Inbox",
    kicker: "Email & phishing",
    line: "Fresh emails in a real inbox. Hover the links, read the headers, report or trust.",
    href: "/inbox",
    channel: "Email",
  },
  {
    id: "messages",
    number: "03",
    title: "Messages",
    kicker: "Social engineering",
    line: "A stranger, a recruiter, 'Mum on a new number'. Text back — the AI texts back.",
    href: "/messages",
    channel: "SMS & chat",
  },
  {
    id: "web",
    number: "04",
    title: "Web",
    kicker: "Scam websites",
    line: "Lookalike logins, too-good shops, investment dashboards. Read the address bar before you type.",
    href: "/web",
    channel: "Browser",
  },
  {
    id: "riddles",
    number: "05",
    title: "Riddles",
    kicker: "Quick training",
    line: "One message, one decision. Scam or genuine, and what kind.",
    href: "/riddle",
    channel: "Any",
  },
];
