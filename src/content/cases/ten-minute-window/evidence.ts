import type { EvidenceItem } from "@/game/case/types";

/**
 * Authored evidence items for "The Ten-Minute Window".
 *
 * Requirements:
 * - Minimum 3 genuine evidence items (`bank-statement`, `call-log`, `otp-message`, `sim-swap-record`).
 * - Minimum 2 plausible, dismissible false leads (`repair-receipt`, `delivery-notice`).
 * - All IDs match docs/ART-REQUIREMENTS.md §4.
 * - All details, brands, and identifiers are strictly fictional.
 *
 * Timeline (fixed across every file in this case, and every NPC persona — an
 * NPC that quotes a different number than the card the player is holding breaks
 * the case):
 *   21:20  SIM re-provisioned at the carrier, SMS routing diverted
 *   21:47  Inbound spoofed call, "Martin Hayes, Northstar Fraud"
 *   22:01  OTP 847291 delivered, read aloud under pressure
 *   22:03  ₹4,80,000 authorised to Apex Horizon Trading
 *   overnight: held in Northstar's fraud-review queue (new payee, high value)
 *   now:   ten minutes until the morning international settlement batch releases it
 */

export const bankStatementEvidence: EvidenceItem = {
  id: "bank-statement",
  title: "Northstar Bank — Interim Account Statement",
  kind: "ledger",
  lines: [
    { text: "Account Holder", value: "Mara Okoye" },
    { text: "Account Number", value: "******8821" },
    { text: "Branch", value: "Northstar Central (IFSC: NRTH0004471)" },
    { text: "21:12 Sector 22 Provision Store", value: "-₹180.00" },
    { text: "22:03 HELD: Apex Horizon Trading", value: "-₹4,80,000.00", flag: true },
    { text: "Settlement Status", value: "Held overnight for fraud review — releases in the next international settlement batch", flag: true },
    { text: "Authorized Protocol", value: "Net Banking IMPS / OTP Verified" },
  ],
};

export const callLogEvidence: EvidenceItem = {
  id: "call-log",
  title: "Handset Telephony Call Log",
  kind: "log",
  lines: [
    { text: "Subscriber Handset", value: "+91 98190 04412 (Mara Okoye)" },
    { text: "20:45 Outgoing to Studio", value: "+91 22 4019 0550 (4 min)" },
    { text: "21:47 Inbound: Spoofed Bank Security", value: "+91 22 4019 0142 (7 min)", flag: true },
    { text: "Caller Persona", value: "Claimed 'Martin Hayes', Northstar Fraud Team (ID: NS-4471)", flag: true },
    { text: "Official Card Line", value: "1800 419 4471 (Printed on physical debit card)" },
    { text: "Urgency Tactic", value: "Caller gave the victim ninety seconds to read the code back" },
  ],
};

export const otpMessageEvidence: EvidenceItem = {
  id: "otp-message",
  title: "SMS Passcode Security Notification",
  kind: "chat",
  lines: [
    { text: "Sender", value: "NORTHSTAR-SEC" },
    { text: "Timestamp", value: "22:01:08, 14 Oct" },
    { text: "Message Text", value: "847291 is your Northstar one-time passcode to AUTHORISE transfer of ₹4,80,000.00 to Apex Horizon Trading.", flag: true },
    { text: "Warning Banner", value: "NEVER share this code with anyone, including Northstar staff. If this was not you, call 1800 419 4471 immediately.", flag: true },
    { text: "Compromise Point", value: "Victim read code aloud to caller during high-stress conversation" },
  ],
};

export const simSwapRecordEvidence: EvidenceItem = {
  id: "sim-swap-record",
  title: "Cellular Carrier Network Audit Log",
  kind: "log",
  lines: [
    { text: "Network MSISDN", value: "91-9819004412" },
    { text: "21:20:14 Port-Out / Re-provision Request", value: "Received via automated carrier portal", flag: true },
    { text: "21:22:05 SMS Routing Divert Active", value: "Rerouted to rogue IMSI/ICCID (temporary clone)", flag: true },
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
    { text: "Service Workshop", value: "Apex Fix & Tech, Sector 22 (Proprietor: Ravi Sunder)" },
    { text: "Customer Name", value: "Mara Okoye" },
    { text: "Service Date", value: "Earlier this week (Collected 16:30, same day)" },
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
    { text: "Dropped At", value: "Apartment door mat (11:15, 13 Oct)" },
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
