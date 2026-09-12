import type { Deduction } from "@/game/case/types";

/**
 * Deductions for "The Ten-Minute Window".
 *
 * Each conclusion is unlocked when the player holds the required combination
 * of evidence on the case board, setting a deterministic FlagId that gates
 * subsequent dialogue options and lawful resolution pathways.
 */

export const otpTheftDeduction: Deduction = {
  id: "d-otp-theft",
  from: ["call-log", "otp-message"],
  conclusion:
    "The inbound caller impersonated Northstar Bank security to harvest the live authentication passcode under extreme deadline pressure.",
  unlocksFlag: "deduction.otp-theft-established",
};

export const simSwapInterceptDeduction: Deduction = {
  id: "d-sim-swap-intercept",
  from: ["otp-message", "sim-swap-record"],
  conclusion:
    "The fraud syndicate engineered an unauthorized carrier-level SIM port to capture security traffic upstream, proving the attack bypassed handset hardware.",
  unlocksFlag: "deduction.sim-swap-confirmed",
};

export const emergencyFreezeReadyDeduction: Deduction = {
  id: "d-emergency-freeze-ready",
  from: ["bank-statement", "call-log", "otp-message"],
  conclusion:
    "The ₹4,80,000 transfer to Apex Horizon Trading is still held in Northstar's fraud-review queue, minutes from the morning international settlement batch, and qualifies for an emergency branch freeze.",
  unlocksFlag: "deduction.freeze-authorization-ready",
};

export const clearRepairShopDeduction: Deduction = {
  id: "d-clear-repair-shop",
  from: ["repair-receipt", "sim-swap-record"],
  conclusion:
    "Ravi Sunder and Apex Fix & Tech are fully cleared: the screen repair was strictly physical, and the breach took place at the mobile network level.",
  unlocksFlag: "deduction.repair-shop-cleared",
};

export const clearDeliveryNoticeDeduction: Deduction = {
  id: "d-clear-delivery-notice",
  from: ["delivery-notice", "bank-statement"],
  conclusion:
    "The SwiftParcel missed-delivery card was a routine business shipment from Harrow & Finch with zero connection to the banking fraud.",
  unlocksFlag: "deduction.delivery-bait-cleared",
};

export const TEN_MINUTE_DEDUCTIONS: Deduction[] = [
  otpTheftDeduction,
  simSwapInterceptDeduction,
  emergencyFreezeReadyDeduction,
  clearRepairShopDeduction,
  clearDeliveryNoticeDeduction,
];
