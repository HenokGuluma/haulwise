// How a load's driverPay is derived from its rate.
//
// - PERCENTAGE (default, 70%) — driverPayValue is a 0-100 number,
//   driverPay = rate × value / 100.
// - PER_UNIT gives the driver their own per-unit rate on the *same*
//   quantity the load's own rate basis uses (Quintals/km/transit-hours —
//   see rate-calc.ts's rateBasisQuantity) — e.g. the customer might be
//   billed 342 ETB/Quintal while the driver is paid 200 ETB/Quintal on
//   the same weight. Only meaningful when the load's rateType isn't
//   FLAT, since FLAT has no quantity to correlate against.
// - FIXED lets a Manager set an exact ETB amount instead.
//
// Whichever type, the computed result is clamped so it can never exceed
// the load's own rate — a driver-pay override larger than the rate is
// capped down to the rate itself (100% payout, zero commission) rather
// than allowed to exceed it. This clamp is authoritative both for the
// form's live preview and server-side on create/update.
export const DRIVER_PAY_TYPES = ["PERCENTAGE", "PER_UNIT", "FIXED"] as const;
export type DriverPayType = (typeof DRIVER_PAY_TYPES)[number];

export const DEFAULT_DRIVER_PAY_TYPE: DriverPayType = "PERCENTAGE";
export const DEFAULT_DRIVER_PAY_VALUE = 70;

export const DRIVER_PAY_TYPE_LABELS: Record<DriverPayType, string> = {
  PERCENTAGE: "% of rate",
  PER_UNIT: "Own rate (per unit)",
  FIXED: "Fixed amount (ETB)",
};

export function computeDriverPay(params: {
  driverPayType: DriverPayType;
  driverPayValue: number;
  rate: number;
  /** The load's own rate-basis quantity (see rateBasisQuantity in
   * rate-calc.ts) — only consulted for PER_UNIT. Pass null when the
   * load's rateType is FLAT (no natural quantity to correlate against);
   * PER_UNIT then computes to 0. */
  basisQuantity: number | null;
}): number {
  if (params.driverPayType === "PERCENTAGE") {
    const pct = Math.min(100, Math.max(0, params.driverPayValue));
    return Math.max(0, Math.min(Math.round((params.rate * pct) / 100), params.rate));
  }
  if (params.driverPayType === "PER_UNIT") {
    const computed = Math.round(params.driverPayValue * (params.basisQuantity ?? 0));
    return Math.max(0, Math.min(computed, params.rate));
  }
  // FIXED
  return Math.max(0, Math.min(Math.round(params.driverPayValue), params.rate));
}
