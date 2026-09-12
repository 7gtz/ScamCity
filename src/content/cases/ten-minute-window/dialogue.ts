import type { DialogueNode } from "@/game/dialogue/types";

/**
 * Dialogue graph for "The Ten-Minute Window".
 *
 * Spans all five locations:
 * - `office` (Hub, intake, case board review)
 * - `victim-flat` (Meera Okoye interview, examining handset & documents)
 * - `bank-branch` (Teller Varun Vance, statement retrieval, emergency transfer freeze)
 * - `repair-shop` (Ravi Sunder, false lead exploration and clearance)
 * - `police-station` (Sgt. Balan Brennan, carrier audit log, statutory crime report)
 *
 * Graph properties:
 * - Every node is reachable.
 * - Every choice terminates at another valid node id or "END".
 * - Includes multiple fact-gated choices requiring held evidence or deductions.
 * - Strict adherence to fictionalization and dignity guidelines.
 */

export const TEN_MINUTE_DIALOGUE: Record<string, DialogueNode> = {
  // =========================================================================
  // LOCATION 1: OFFICE (Hub & Travel)
  // =========================================================================
  "office-start": {
    id: "office-start",
    speaker: "Detective Dev Malhotra",
    lines: [
      "The emergency fraud intake file rests on my desk: Meera Okoye, senior architect at Harrow & Finch, reported an unauthorized £4,850 transfer from her Northstar Bank account fifteen minutes ago.",
      "The caller claimed to be Northstar Security and warned that the transfer would finalize in ten minutes unless cancelled with a one-time code.",
      "In digital banking fraud, that first window is everything. I need to review the initial notes and proceed immediately.",
    ],
    choices: [
      {
        id: "c-off-read-notes",
        text: "Examine the intake notes in detail.",
        next: "office-notes",
      },
      {
        id: "c-off-travel-now",
        text: "Select a destination and head out into the city.",
        next: "office-travel",
      },
    ],
  },

  "office-notes": {
    id: "office-notes",
    speaker: "Detective Dev Malhotra",
    lines: [
      "Intake Summary: Victim received an inbound call from 020 0190 0142. The caller quoted employee badge 'NS-4471' and warned of a fraudulent charge to 'Apex Horizon Trading'.",
      "During the call, an SMS authentication passcode was transmitted to her phone, which she read aloud under pressure.",
      "The victim's flat is close by. Northstar Bank's central branch and the local police station are also within reach.",
    ],
    choices: [
      {
        id: "c-off-notes-to-travel",
        text: "Pack case files and move to the field.",
        next: "office-travel",
      },
    ],
  },

  "office-travel": {
    id: "office-travel",
    speaker: "Detective Dev Malhotra",
    lines: [
      "Where should I direct the investigation next?",
    ],
    choices: [
      {
        id: "c-trav-victim",
        text: "Travel to Meera Okoye's flat to interview the victim.",
        next: "victim-entry",
      },
      {
        id: "c-trav-bank",
        text: "Travel to Northstar Bank Central Branch to inspect the transaction.",
        next: "bank-entry",
      },
      {
        id: "c-trav-repair",
        text: "Travel to Apex Fix & Tech repair shop to investigate the false lead.",
        next: "repair-entry",
      },
      {
        id: "c-trav-police",
        text: "Travel to the Police Station to pull carrier network logs.",
        next: "police-entry",
      },
      {
        id: "c-trav-conclude",
        text: "Pause investigation to organize the case board.",
        next: "END",
      },
    ],
  },

  // =========================================================================
  // LOCATION 2: VICTIM'S FLAT (Meera Okoye)
  // =========================================================================
  "victim-entry": {
    id: "victim-entry",
    speaker: "Meera Okoye",
    lines: [
      "Detective Malhotra? Please, come inside. I was just making some ginger chai to calm my nerves. I apologize for the scattered drafting sheets—I was finalizing structural elevations when this nightmare began.",
      "I still cannot comprehend how I fell for this. I manage complex multimillion-pound civic architectural contracts every day, and yet someone managed to talk me into surrendering my security code in seven minutes.",
    ],
    choices: [
      {
        id: "c-vic-reassure-start",
        text: "Take a breath, Ms. Okoye. These operations are engineered by professional syndicates to trigger acute panic. Can you walk me through the call?",
        effects: [{ trust: "mara-okoye", by: 15 }],
        next: "victim-interview-start",
      },
      {
        id: "c-vic-check-bank-early",
        text: "Have you contacted Northstar Bank directly to freeze the account?",
        next: "victim-bank-status",
      },
    ],
  },

  "victim-interview-start": {
    id: "victim-interview-start",
    speaker: "Meera Okoye",
    lines: [
      "It started at 13:35. My phone rang, and the caller display showed Northstar Security. The man on the line spoke with calm, clipped authority.",
      "He claimed their fraud detection algorithm had flagged a suspicious pending payment of £4,850.00 to an outfit called Apex Horizon Trading.",
    ],
    choices: [
      {
        id: "c-vic-ask-caller-id",
        text: "Did the caller give a name or credentials?",
        next: "victim-caller-details",
      },
      {
        id: "c-vic-ask-phone-evidence",
        text: "May I examine your phone to inspect the call log and message history?",
        next: "victim-check-phone",
      },
    ],
  },

  "victim-caller-details": {
    id: "victim-caller-details",
    speaker: "Meera Okoye",
    lines: [
      "Yes—he introduced himself as Martin Hayes, Senior Fraud Officer, badge NS-4471.",
      "When I asked if I could call him back, he insisted that the branch transfer queue was running fourteen minutes behind, and that the batch clearing window would close before I reached anyone.",
    ],
    choices: [
      {
        id: "c-vic-ask-tactic",
        text: "He manufactured a false deadline to prevent you from using independent verification channels.",
        next: "victim-check-phone",
      },
      {
        id: "c-vic-gated-call-log",
        text: "Looking at your handset call log, the number that phoned you was 020 0190 0142, not the bank's card number.",
        requires: { hasEvidence: "call-log" },
        next: "victim-discuss-call-log",
      },
    ],
  },

  "victim-check-phone": {
    id: "victim-check-phone",
    speaker: "Meera Okoye",
    lines: [
      "Here is my handset, Detective. The call lasted about seven minutes. The messages from that time are still in my notification feed.",
    ],
    choices: [
      {
        id: "c-vic-take-call-log",
        text: "Examine and preserve the telephony call log.",
        effects: [
          { giveEvidence: "call-log" },
          { setFlag: "victim.inspected-phone", to: true },
        ],
        next: "victim-check-sms",
      },
    ],
  },

  "victim-check-sms": {
    id: "victim-check-sms",
    speaker: "Detective Dev Malhotra",
    lines: [
      "Opening the SMS inbox... here is the message from NORTHSTAR-SEC, timestamped 13:41:08.",
      "'719-204 is your Northstar one-time passcode to AUTHORISE transfer of £4,850.00 to Apex Horizon Trading. WARNING: Northstar Bank will NEVER ask for this code.'",
    ],
    choices: [
      {
        id: "c-vic-take-otp",
        text: "Preserve the OTP security notification as core evidence.",
        effects: [
          { giveEvidence: "otp-message" },
          { setFlag: "victim.inspected-sms", to: true },
        ],
        next: "victim-explain-otp",
      },
    ],
  },

  "victim-explain-otp": {
    id: "victim-explain-otp",
    speaker: "Meera Okoye",
    lines: [
      "When the text arrived, he said: 'Read me the cancellation code on your screen so our server can block the payment'.",
      "I was terrified of losing nearly five thousand pounds, so I read the six digits to him. As soon as I finished, he said the transaction was being halted and disconnected.",
      "Only then did I see the word 'AUTHORISE' in the message text. I feel so utterly foolish.",
    ],
    choices: [
      {
        id: "c-vic-reassure-dignity",
        text: "You are not foolish, Ms. Okoye. The caller exploited high-intensity urgency to suppress verification. That is a sophisticated psychological trap, not a lapse in intelligence.",
        effects: [
          { trust: "mara-okoye", by: 25 },
          { stress: -10 },
        ],
        next: "victim-dignity-reassurance",
      },
    ],
  },

  "victim-dignity-reassurance": {
    id: "victim-dignity-reassurance",
    speaker: "Meera Okoye",
    lines: [
      "Thank you, Detective. That means a great deal. Is there anything else in the apartment that might help explain how they targeted me?",
    ],
    choices: [
      {
        id: "c-vic-inspect-mail",
        text: "Check the entrance table for recent postal correspondence or delivery cards.",
        next: "victim-check-mail",
      },
      {
        id: "c-vic-inspect-repairs",
        text: "Ask about recent device repairs or service tickets.",
        next: "victim-check-repair",
      },
      {
        id: "c-vic-to-next-steps",
        text: "We have the phone evidence. Let's decide our next move.",
        next: "victim-next-steps",
      },
    ],
  },

  "victim-check-mail": {
    id: "victim-check-mail",
    speaker: "Meera Okoye",
    lines: [
      "There was a redelivery slip dropped through the mail slot around eleven this morning. I haven't opened the package yet.",
    ],
    choices: [
      {
        id: "c-vic-take-delivery",
        text: "Inspect the SwiftParcel calling card.",
        effects: [{ giveEvidence: "delivery-notice" }],
        next: "victim-mail-cleared",
      },
    ],
  },

  "victim-mail-cleared": {
    id: "victim-mail-cleared",
    speaker: "Detective Dev Malhotra",
    lines: [
      "Tracking SP-9920-X: sender is Harrow & Finch Architectural Supplies, containing draughting film. This is a legitimate business delivery, not a smishing parcel trap.",
    ],
    choices: [
      {
        id: "c-vic-mail-done",
        text: "Dismiss the delivery slip as an innocent lead.",
        effects: [{ setFlag: "lead.delivery-checked", to: true }],
        next: "victim-dignity-reassurance",
      },
    ],
  },

  "victim-check-repair": {
    id: "victim-check-repair",
    speaker: "Meera Okoye",
    lines: [
      "Earlier this week, I dropped my phone on the pavement outside our architectural firm. The screen cracked, so I left it with Ravi Sunder at Apex Fix & Tech.",
      "Here is the receipt he gave me when I picked it up.",
    ],
    choices: [
      {
        id: "c-vic-take-receipt",
        text: "Take Work Order #4018 into evidence.",
        effects: [{ giveEvidence: "repair-receipt" }],
        next: "victim-repair-suspicion",
      },
    ],
  },

  "victim-repair-suspicion": {
    id: "victim-repair-suspicion",
    speaker: "Detective Dev Malhotra",
    lines: [
      "Apex Fix & Tech... and the fraudulent recipient was named Apex Horizon Trading. A suspicious name resemblance.",
      "However, the receipt states the SIM remained in your possession and the service was purely glass screen replacement.",
    ],
    choices: [
      {
        id: "c-vic-repair-open-mind",
        text: "We will interview Ravi Sunder, but verify the cellular network logs before making accusations.",
        effects: [{ setFlag: "lead.repair-noted", to: true }],
        next: "victim-next-steps",
      },
    ],
  },

  "victim-bank-status": {
    id: "victim-bank-status",
    speaker: "Meera Okoye",
    lines: [
      "I tried calling the number Martin Hayes quoted, but it played a recorded message and disconnected.",
      "I haven't been able to get through to the branch yet because my phone was tied up with police dispatch.",
    ],
    choices: [
      {
        id: "c-vic-bank-priority",
        text: "We need to visit Northstar Bank Central Branch immediately to intercept the transfer.",
        next: "bank-entry",
      },
    ],
  },

  "victim-discuss-call-log": {
    id: "victim-discuss-call-log",
    speaker: "Meera Okoye",
    lines: [
      "You're right... the number on the back of my Northstar debit card is 0800 018 4471. I should have checked that instead of trusting the display.",
    ],
    choices: [
      {
        id: "c-vic-log-next",
        text: "Number spoofing is standard for these syndicates. Let's secure the remaining facts.",
        next: "victim-explain-otp",
      },
    ],
  },

  "victim-next-steps": {
    id: "victim-next-steps",
    speaker: "Meera Okoye",
    lines: [
      "What should our priority be right now, Detective?",
    ],
    choices: [
      {
        id: "c-vic-step-bank",
        text: "Proceed to Northstar Bank Central Branch to check the transfer status.",
        next: "bank-entry",
      },
      {
        id: "c-vic-step-repair",
        text: "Visit Apex Fix & Tech to verify the repair shop's records.",
        next: "repair-entry",
      },
      {
        id: "c-vic-step-police",
        text: "Report to the police station to pull carrier network logs.",
        next: "police-entry",
      },
      {
        id: "c-vic-step-hub",
        text: "Return to the office to cross-reference evidence on the case board.",
        next: "office-travel",
      },
    ],
  },

  // =========================================================================
  // LOCATION 3: BANK BRANCH (Teller Varun Vance)
  // =========================================================================
  "bank-entry": {
    id: "bank-entry",
    speaker: "Teller Varun Vance",
    lines: [
      "Namaste, welcome to Northstar Bank Central Branch. How may I assist you today?",
    ],
    choices: [
      {
        id: "c-bnk-inquire-pro",
        text: "Good afternoon. I am Detective Dev Malhotra, investigating an urgent unauthorized payment from Meera Okoye's current account.",
        effects: [{ trust: "teller-vance", by: 10 }],
        next: "bank-inquiry",
      },
      {
        id: "c-bnk-alienate",
        text: "Step away from that terminal! This entire branch is under criminal investigation for money laundering!",
        next: "bank-alienate-open",
      },
    ],
  },

  "bank-alienate-open": {
    id: "bank-alienate-open",
    speaker: "Teller Varun Vance",
    lines: [
      "Excuse me?! Sir, you have no authority to disrupt lawful branch operations or harass counter personnel without a judicial warrant.",
      "If you continue this aggressive behavior, I will immediately summon security and lodge an obstruction report.",
    ],
    choices: [
      {
        id: "c-bnk-commit-alienate",
        text: "I don't care about your procedure! Everyone behind this counter is a fraud accomplice!",
        effects: [
          { setFlag: "case.alienated-bank-staff", to: true },
          { trust: "teller-vance", by: -50 },
        ],
        next: "bank-alienated",
      },
      {
        id: "c-bnk-deescalate",
        text: "My apologies, I misspoke under pressure. Let's follow standard procedure.",
        effects: [{ trust: "teller-vance", by: -10 }],
        next: "bank-inquiry",
      },
    ],
  },

  "bank-alienated": {
    id: "bank-alienated",
    speaker: "Teller Varun Vance",
    lines: [
      "Branch security has been notified and counter service is suspended at this wicket. Official communication will proceed through Northstar Legal only.",
    ],
    choices: [
      {
        id: "c-bnk-alien-end",
        text: "[Leave the branch after alienating the staff]",
        next: "END",
      },
    ],
  },

  "bank-inquiry": {
    id: "bank-inquiry",
    speaker: "Teller Varun Vance",
    lines: [
      "Ms. Meera Okoye's account is on file with us. Under bank confidentiality regulations, I can print an interim account statement for authorized review.",
      "What specific transaction are you tracing?",
    ],
    choices: [
      {
        id: "c-bnk-get-statement",
        text: "Request an immediate interim statement of today's account activity.",
        effects: [
          { giveEvidence: "bank-statement" },
          { setFlag: "branch.has-statement", to: true },
        ],
        next: "bank-discuss-pending",
      },
      {
        id: "c-bnk-demand-freeze",
        text: "We need an emergency stop placed on a £4,850 transfer to Apex Horizon Trading.",
        next: "bank-freeze-request",
      },
    ],
  },

  "bank-discuss-pending": {
    id: "bank-discuss-pending",
    speaker: "Teller Varun Vance",
    lines: [
      "Printing the interim statement... here it is.",
      "At 13:42, an outward FastPay transfer of £4,850.00 to Apex Horizon Trading was initiated. Because of the amount and new recipient, it entered our automated ten-minute fraud clearing window.",
      "The status is currently 'PENDING CLEARING'.",
    ],
    choices: [
      {
        id: "c-bnk-freeze-from-statement",
        text: "It is still pending! Can we apply an administrative stop right now?",
        next: "bank-freeze-request",
      },
    ],
  },

  "bank-freeze-request": {
    id: "bank-freeze-request",
    speaker: "Teller Varun Vance",
    lines: [
      "Under Northstar security protocol, an online payment verified with a dual-factor one-time passcode cannot be cancelled on verbal request alone.",
      "To halt the clearing batch, we require documented evidence proving that the authorization was compromised under fraudulent duress before the ten-minute window expires.",
    ],
    choices: [
      {
        id: "c-bnk-present-deduction",
        text: "Present the verified deduction: call log showing the spoofed number, the OTP text with duress indicators, and the pending statement.",
        requires: { flag: "deduction.freeze-authorization-ready" },
        effects: [{ trust: "teller-vance", by: 30 }],
        next: "bank-freeze-success",
      },
      {
        id: "c-bnk-unverified-plea",
        text: "I do not have the complete evidence file ready, but you must take my word for it!",
        next: "bank-freeze-unsubstantiated",
      },
    ],
  },

  "bank-freeze-unsubstantiated": {
    id: "bank-freeze-unsubstantiated",
    speaker: "Teller Varun Vance",
    lines: [
      "I understand the urgency, Detective, but without documentation linking the OTP transmission to a spoofed caller, internal audit prohibits overriding a customer-authorized transfer.",
      "If you do not file the required documentation before the timer elapses, the clearing house will release the funds automatically.",
    ],
    choices: [
      {
        id: "c-bnk-time-runs-out",
        text: "Check how much time remains on the clearing clock.",
        effects: [{ setFlag: "branch.window-expired", to: true }],
        next: "bank-window-timing",
      },
      {
        id: "c-bnk-retreat-gather",
        text: "Step away to assemble the necessary evidence from the phone and carrier records.",
        next: "office-travel",
      },
    ],
  },

  "bank-window-timing": {
    id: "bank-window-timing",
    speaker: "Teller Varun Vance",
    lines: [
      "The clock has reached 13:52. The ten-minute clearing window has lapsed, and the batch has been transmitted to Apex Horizon Trading's receiving bank.",
      "We can no longer perform an instant branch stop. Recovery will now require a formal police crime reference number and inter-bank indemnity filings.",
    ],
    choices: [
      {
        id: "c-bnk-to-police-recovery",
        text: "Go to the police station to lodge the statutory fraud report.",
        next: "police-entry",
      },
      {
        id: "c-bnk-to-hub-expired",
        text: "Return to the office to assess recovery avenues.",
        next: "office-travel",
      },
    ],
  },

  "bank-freeze-success": {
    id: "bank-freeze-success",
    speaker: "Teller Varun Vance",
    lines: [
      "Examining the file... caller ID 020 0190 0142, staff identifier NS-4471... wait, NS-4471 was an old operational code retired two years ago!",
      "And the SMS timestamp matches the spoofed call duration precisely. This clearly establishes dual-factor harvesting under fraudulent impersonation.",
      "Applying the Northstar Emergency Stop Override right now.",
    ],
    choices: [
      {
        id: "c-bnk-confirm-freeze",
        text: "Verify that the £4,850 transfer has been halted.",
        effects: [
          { setFlag: "branch.emergency-freeze-applied", to: true },
          { trust: "teller-vance", by: 20 },
        ],
        next: "bank-freeze-confirmed",
      },
    ],
  },

  "bank-freeze-confirmed": {
    id: "bank-freeze-confirmed",
    speaker: "Teller Varun Vance",
    lines: [
      "Confirmed. The £4,850.00 payment to Apex Horizon Trading has been locked in escrow at our gateway. The funds are safe and will be credited back to Meera Okoye's current account.",
      "I have flagged the receiving beneficiary details for our national cyber intelligence unit.",
    ],
    choices: [
      {
        id: "c-bnk-wrap-police",
        text: "Proceed to the police station to lodge the formal case closure report.",
        next: "police-entry",
      },
      {
        id: "c-bnk-wrap-end",
        text: "Conclude branch actions.",
        next: "END",
      },
    ],
  },

  // =========================================================================
  // LOCATION 4: REPAIR SHOP (Ravi Sunder)
  // =========================================================================
  "repair-entry": {
    id: "repair-entry",
    speaker: "Ravi Sunder",
    lines: [
      "Namaste, bhai. Welcome to Apex Fix & Tech. Just give me one minute to finish soldering this charging ribbon... Haan, tell me, what can I do for you?",
    ],
    choices: [
      {
        id: "c-rep-inquire-polite",
        text: "Good day, Mr. Sunder. I am Detective Dev Malhotra. I'd like to ask a few routine questions regarding a screen repair you completed for Meera Okoye.",
        effects: [{ trust: "ravi-sunder", by: 10 }],
        next: "repair-inquiry",
      },
      {
        id: "c-rep-accuse-rashly",
        text: "Step away from the workbench! Your shop is running a SIM-cloning syndicate, and we have the work order proving it!",
        next: "repair-accuse-open",
      },
    ],
  },

  "repair-accuse-open": {
    id: "repair-accuse-open",
    speaker: "Ravi Sunder",
    lines: [
      "What?! SIM cloning?! Arre, are you out of your mind?! I have been running this electronics shop on this high street for eleven years with an unblemished record! Every single part I buy has a valid GST and VAT invoice!",
      "Do not step into my shop throwing baseless criminal accusations around without a shred of proof!",
    ],
    choices: [
      {
        id: "c-rep-double-down",
        text: "Don't play innocent, Sunder! Apex Fix & Tech, Apex Horizon Trading—you cloned her device and stole £4,850!",
        effects: [
          { setFlag: "case.accused-repair-shop", to: true },
          { trust: "ravi-sunder", by: -60 },
        ],
        next: "repair-accused-wrong",
      },
      {
        id: "c-rep-walk-back",
        text: "Let me step back. Let's examine the work order calmly together.",
        effects: [{ trust: "ravi-sunder", by: -15 }],
        next: "repair-inquiry",
      },
    ],
  },

  "repair-accused-wrong": {
    id: "repair-accused-wrong",
    speaker: "Ravi Sunder",
    lines: [
      "Get out of my shop right this instant! I am calling my trade association legal counsel! If you step foot in here again without a warrant, I am filing an official harassment complaint!",
    ],
    choices: [
      {
        id: "c-rep-wrong-end",
        text: "[Storm out of the shop as Ravi slams the metal shutters shut]",
        next: "END",
      },
    ],
  },

  "repair-inquiry": {
    id: "repair-inquiry",
    speaker: "Ravi Sunder",
    lines: [
      "Meera Okoye? Yes, of course I remember her—very polite lady, architect. She brought in a smartphone with shattered front glass earlier this week.",
      "What happened, sir? Is there any issue with the display assembly?",
    ],
    choices: [
      {
        id: "c-rep-ask-details",
        text: "Did your repair involve touching the SIM card or accessing the phone's operating system?",
        next: "repair-discuss-service",
      },
      {
        id: "c-rep-show-receipt",
        text: "Show Work Order #4018 and ask to review his diagnostic intake log.",
        requires: { hasEvidence: "repair-receipt" },
        next: "repair-show-receipt",
      },
    ],
  },

  "repair-show-receipt": {
    id: "repair-show-receipt",
    speaker: "Ravi Sunder",
    lines: [
      "Work Order #4018, that's my signature and handwriting. Look at the intake slip: 'Customer retained SIM tray and card in her personal purse during service'.",
      "We replace front glass using a heating separator and suction jigs. We never ask for customer device PINs, and we test digitizer response using the hardware emergency dialer code. I never had access to her accounts or her SIM card.",
    ],
    choices: [
      {
        id: "c-rep-ask-apex-name",
        text: "What about the name 'Apex Horizon Trading'? Does that entity have any affiliation with your business?",
        next: "repair-apex-name",
      },
      {
        id: "c-rep-ask-hardware-check",
        text: "Could someone have compromised the phone without physical access?",
        next: "repair-telecom-help",
      },
    ],
  },

  "repair-discuss-service": {
    id: "repair-discuss-service",
    speaker: "Ravi Sunder",
    lines: [
      "Never, sir. I have a strict privacy protocol here. Customers always remove their SIM and memory cards before handover. If any job requires motherboard work, that is done strictly under my shop's CCTV.",
    ],
    choices: [
      {
        id: "c-rep-ask-apex-name-2",
        text: "Why does the recipient entity share the name 'Apex'?",
        next: "repair-apex-name",
      },
    ],
  },

  "repair-apex-name": {
    id: "repair-apex-name",
    speaker: "Ravi Sunder",
    lines: [
      "Apex? Detective saab, this entire commercial block is Apex Commercial Row! There is Apex Dry Cleaners opposite, Apex Sweets, and Apex Gym two doors down.",
      "Cyber criminals register disposable shell entities using local commercial plaza names so victims don't immediately question transaction notices. I have absolutely nothing to do with any 'Horizon Trading'.",
    ],
    choices: [
      {
        id: "c-rep-telecom-logic",
        text: "If your hardware repair was purely physical, how did the scammer intercept her SMS passcode?",
        next: "repair-telecom-help",
      },
    ],
  },

  "repair-telecom-help": {
    id: "repair-telecom-help",
    speaker: "Ravi Sunder",
    lines: [
      "Look, I follow telecom security bulletins. Scammers don't need physical phone custody to steal OTPs anymore.",
      "They take leaked KYC data from old web database breaches, call up the cellular network helpdesk, impersonate the subscriber, and execute an unauthorized SIM swap or port-out. The telecom carrier reroutes incoming SMS to the fraudster's burner SIM.",
      "If you want to trace how her OTP was intercepted, don't look at my workbench—check the telecom carrier gateway audit log.",
    ],
    choices: [
      {
        id: "c-rep-clear-shop",
        text: "Thank you, Mr. Sunder. That technical explanation is spotless and clears your shop completely.",
        effects: [
          { setFlag: "lead.repair-cleared-in-dialogue", to: true },
          { trust: "ravi-sunder", by: 25 },
        ],
        next: "repair-cleared",
      },
    ],
  },

  "repair-cleared": {
    id: "repair-cleared",
    speaker: "Ravi Sunder",
    lines: [
      "Shukriya, Detective. I appreciate your fairness. Go straight to the precinct—Sgt. Brennan has access to the National Carrier Liaison Portal and can pull the network port-out audit in minutes.",
    ],
    choices: [
      {
        id: "c-rep-to-police",
        text: "Proceed to the police station to pull the carrier audit.",
        next: "police-entry",
      },
      {
        id: "c-rep-to-bank",
        text: "Head to Northstar Bank Central Branch.",
        next: "bank-entry",
      },
      {
        id: "c-rep-to-office",
        text: "Return to the office.",
        next: "office-travel",
      },
    ],
  },

  // =========================================================================
  // LOCATION 5: POLICE STATION (Sgt. Balan Brennan)
  // =========================================================================
  "police-entry": {
    id: "police-entry",
    speaker: "Sgt. Balan Brennan",
    lines: [
      "Vanakkam, Dev. Just cataloguing the shift desk ledger. What brings you into the precinct this afternoon?",
    ],
    choices: [
      {
        id: "c-pol-request-carrier-trace",
        text: "I need to run a carrier port-out audit for subscriber 07700 900412 in an active banking fraud case.",
        effects: [{ trust: "sgt-brennan", by: 15 }],
        next: "police-inquiry",
      },
      {
        id: "c-pol-file-report-direct",
        text: "We need to lodge a formal crime report for victim Meera Okoye.",
        next: "police-lodge-report",
      },
    ],
  },

  "police-inquiry": {
    id: "police-inquiry",
    speaker: "Sgt. Balan Brennan",
    lines: [
      "Submitting subscriber query MSISDN-44-7700900412 through the National Telecom Carrier Gateway terminal...",
      "Here is the network telemetry report. Look at the timestamp from 13:20:14 today.",
    ],
    choices: [
      {
        id: "c-pol-take-sim-log",
        text: "Preserve the carrier network audit log as primary evidence.",
        effects: [
          { giveEvidence: "sim-swap-record" },
          { setFlag: "police.has-carrier-log", to: true },
        ],
        next: "police-discuss-sim-swap",
      },
    ],
  },

  "police-discuss-sim-swap": {
    id: "police-discuss-sim-swap",
    speaker: "Sgt. Balan Brennan",
    lines: [
      "An automated port-out request was submitted through the carrier's self-service web gateway at 13:20, authenticated using leaked biographical data.",
      "At 13:22, an SMS divert was activated to a disposable burner SIM. That was fifteen minutes before Martin Hayes phoned Meera.",
      "This proves the compromise was purely network-layer: they intercepted the SMS traffic upstream.",
    ],
    choices: [
      {
        id: "c-pol-lodge-formal-crime",
        text: "Lodge the formal crime reference report to trigger statutory indemnity protections.",
        next: "police-lodge-report",
      },
      {
        id: "c-pol-rush-bank",
        text: "With this carrier proof in hand, let's rush to the bank to freeze the funds.",
        next: "bank-entry",
      },
    ],
  },

  "police-lodge-report": {
    id: "police-lodge-report",
    speaker: "Sgt. Balan Brennan",
    lines: [
      "I am entering Crime Reference CR-88201 into the National Financial Crime Register.",
      "This formal filing documents identity spoofing, unauthorized carrier divert, and dual-factor extraction under psychological duress.",
    ],
    choices: [
      {
        id: "c-pol-confirm-report",
        text: "Complete the statutory filing and confirm lawful recovery coverage.",
        effects: [
          { setFlag: "police.formal-report-lodged", to: true },
          { trust: "sgt-brennan", by: 20 },
        ],
        next: "police-recovery-explain",
      },
    ],
  },

  "police-recovery-explain": {
    id: "police-recovery-explain",
    speaker: "Sgt. Balan Brennan",
    lines: [
      "Under the Contingent Reimbursement Code, filing CR-88201 establishes that the victim acted with reasonable care and was targeted by sophisticated social engineering.",
      "Even if the immediate ten-minute clearing window at the branch elapsed, this statutory filing forces Northstar and the receiving bank to freeze the beneficiary account and begin restitution proceedings.",
    ],
    choices: [
      {
        id: "c-pol-wrap-investigation",
        text: "Conclude formal police proceedings and review outcome.",
        next: "police-conclude",
      },
      {
        id: "c-pol-visit-bank-again",
        text: "Deliver the crime reference document to Northstar Bank Central Branch.",
        next: "bank-entry",
      },
    ],
  },

  "police-conclude": {
    id: "police-conclude",
    speaker: "Sgt. Balan Brennan",
    lines: [
      "All evidentiary items are bagged, logged, and submitted into the lawful register.",
      "Solid investigative work, Dev. No vigilantism, no wild goose chases—just verified facts and proper procedure.",
    ],
    choices: [
      {
        id: "c-pol-final-end",
        text: "Close the investigation file.",
        next: "END",
      },
    ],
  },
};
