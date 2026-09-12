import type { EvidenceItem } from "@/game/case/types";

/**
 * Authored evidence items for "The Ten-Minute Window".
 *
 * Requirements:
 * - Minimum 3 genuine evidence items (`bank-statement`, `call-log`, `otp-message`, `sim-swap-record`).
 * - Minimum 2 plausible, dismissible false leads (`repair-receipt`, `delivery-notice`).
 * - All IDs match docs/ART-REQUIREMENTS.md §4.
 * - All details, brands, and identifiers are strictly fictional.
 */

export const bankStatementEvidence: EvidenceItem = {
  id: "bank-statement",
  title: "Northstar Bank — Interim Account Statement",
  kind: "ledger",
  lines: [
    { text: "Account Holder", value: "Mara Okoye" },
    { text: "Account Number", value: "******8821" },
    { text: "Branch", value: "Northstar Central (Sort Code: 00-44-71)" },
    { text: "13:10 Coffee Works", value: "-£3.80" },
    { text: "13:42 PENDING: Apex Horizon Trading", value: "-£4,850.00", flag: true },
    { text: "Settlement Status", value: "Pending Clearing — 10-Minute Hold Window Active", flag: true },
    { text: "Authorized Protocol", value: "Online Banking FastPay / Dual-Factor Verified" },
  ],
};

export const callLogEvidence: EvidenceItem = {
  id: "call-log",
  title: "Handset Telephony Call Log",
  kind: "log",
  lines: [
    { text: "Subscriber Handset", value: "07700 900412 (Mara Okoye)" },
    { text: "12:45 Outgoing to Studio", value: "020 0190 0550 (4 min)" },
    { text: "13:35 Inbound: Spoofed Bank Security", value: "020 0190 0142 (7 min)", flag: true },
    { text: "Caller Persona", value: "Claimed 'Martin Hayes', Northstar Fraud Team (ID: NS-4471)", flag: true },
    { text: "Official Card Line", value: "0800 018 4471 (Printed on physical debit card)" },
    { text: "Urgency Tactic", value: "Caller asserted transfer would become irreversible in ten minutes" },
  ],
};

export const otpMessageEvidence: EvidenceItem = {
  id: "otp-message",
  title: "SMS Passcode Security Notification",
  kind: "chat",
  lines: [
    { text: "Sender", value: "NORTHSTAR-SEC" },
    { text: "Timestamp", value: "13:41:08" },
    { text: "Message Text", value: "719-204 is your Northstar one-time passcode to AUTHORISE transfer of £4,850.00 to Apex Horizon Trading.", flag: true },
    { text: "Warning Banner", value: "NEVER share this code with anyone, including Northstar staff. If this was not you, call 0800 018 4471 immediately.", flag: true },
    { text: "Compromise Point", value: "Victim read code aloud to caller during high-stress conversation" },
  ],
};

export const simSwapRecordEvidence: EvidenceItem = {
  id: "sim-swap-record",
  title: "Cellular Carrier Network Audit Log",
  kind: "log",
  lines: [
    { text: "Network MSISDN", value: "44-7700900412" },
    { text: "13:20:14 Port-Out / Re-provision Request", value: "Received via automated carrier portal", flag: true },
    { text: "13:22:05 SMS Routing Divert Active", value: "Rerouted to rogue IMSI/ICCID (temporary clone)", flag: true },
    { text: "Authentication Method", value: "Pre-harvested biographical data (DOB / billing address)" },
    { text: "Hardware Status", value: "Victim handset unaffected; breach occurred entirely at network layer", flag: true },
  ],
};

export const repairReceiptEvidence: EvidenceItem = {
  id: "repair-receipt",
  title: "Apex Fix & Tech — Work Order #4018",
  kind: "notice",
  falseLead: true,
  lines: [
    { text: "Service Workshop", value: "Apex Fix & Tech (Proprietor: Ravi Sunder)" },
    { text: "Customer Name", value: "Mara Okoye" },
    { text: "Service Date", value: "Earlier this week (Collected 16:30)" },
    { text: "Work Performed", value: "Front OLED display glass replacement" },
    { text: "Technician Annotation", value: "Physical glass adhesive only. SIM tray remained empty; customer retained SIM.", flag: true },
    { text: "Diagnostic Finding", value: "No firmware flash, no sideloaded apps, no board-level tampering detected", flag: true },
  ],
};

export const deliveryNoticeEvidence: EvidenceItem = {
  id: "delivery-notice",
  title: "SwiftParcel Missed Delivery Card",
  kind: "tracking",
  falseLead: true,
  lines: [
    { text: "Carrier", value: "SwiftParcel Logistics" },
    { text: "Tracking Reference", value: "SP-9920-X", flag: true },
    { text: "Dropped At", value: "Apartment mail slot (11:15 today)" },
    { text: "Sender", value: "Harrow & Finch Architectural Supplies" },
    { text: "Item Description", value: "Plotter paper and draughting film (1.8 kg)" },
    { text: "Verification Note", value: "Genuine commercial parcel delivery; no links to banking or credential harvesting", flag: true },
  ],
};

export const TEN_MINUTE_EVIDENCE: EvidenceItem[] = [
  bankStatementEvidence,
  callLogEvidence,
  otpMessageEvidence,
  simSwapRecordEvidence,
  repairReceiptEvidence,
  deliveryNoticeEvidence,
];
