// How a load's driverPay is derived from its rate. PERCENTAGE (default,
// 68%) matches the original hardcoded behavior exactly — driverPayValue
// is a 0-100 number. FLAT lets a Manager set an exact ETB amount instead.
// Either way, computeDriverPay clamps the result so it can never exceed
// the load's own rate — a flat override larger than the rate is capped
// down to the rate itself (100% payout, zero commission) rather than
// allowed to exceed it, and this clamp is authoritative both for the
// form's live preview and server-side on create/update.
export const DRIVER_PAY_TYPES = ["PERCENTAGE", "FLAT"] as const;
export type DriverPayType = (typeof DRIVER_PAY_TYPES)[number];

export const DEFAULT_DRIVER_PAY_TYPE: DriverPayType = "PERCENTAGE";
export const DEFAULT_DRIVER_PAY_VALUE = 68;

export function computeDriverPay(params: { driverPayType: DriverPayType; driverPayValue: number; rate: number }): number {
  if (params.driverPayType === "PERCENTAGE") {
    const pct = Math.min(100, Math.max(0, params.driverPayValue));
    return Math.round((params.rate * pct) / 100);
  }
  return Math.max(0, Math.min(Math.round(params.driverPayValue), params.rate));
}
