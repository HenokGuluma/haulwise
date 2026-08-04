// What a load's `rate` (the total ETB value) means, and how it's derived.
// FLAT is the original behavior — a dispatcher enters the total directly.
// Every other type is computed from a per-unit value (rateBasisValue)
// times a quantity that already exists on the load (weight, or a
// distance/transit-time the load carries), so a load tagged e.g.
// PER_QUINTAL always has a rate that's mathematically consistent with its
// own label — see computeRate below, which is authoritative both for the
// form's live preview and server-side on create/update.
export const RATE_TYPES = ["FLAT", "PER_QUINTAL", "PER_KM", "PER_HOUR"] as const;
export type RateType = (typeof RATE_TYPES)[number];

export const RATE_TYPE_META: Record<RateType, { label: string; unit: string }> = {
  FLAT: { label: "Flat rate", unit: "" },
  PER_QUINTAL: { label: "Per Quintal", unit: "ETB / Quintal" },
  PER_KM: { label: "Per Kilometer", unit: "ETB / km" },
  PER_HOUR: { label: "Per Transit Hour", unit: "ETB / hour" },
};

/** The quantity a non-flat rate type multiplies against. `null` for FLAT,
 * which has none. */
export function rateBasisQuantity(params: {
  rateType: RateType;
  weight: number;
  distanceKm: number | null | undefined;
  pickupTime: Date;
  deliveryTime: Date;
}): number | null {
  switch (params.rateType) {
    case "FLAT":
      return null;
    case "PER_QUINTAL":
      return params.weight;
    case "PER_KM":
      return params.distanceKm ?? 0;
    case "PER_HOUR":
      return Math.max(0, (params.deliveryTime.getTime() - params.pickupTime.getTime()) / 3_600_000);
  }
}

/** The authoritative total rate. FLAT trusts the given flat value (manual
 * entry, unchanged from the original behavior); every other type derives
 * the total from rateBasisValue × its quantity, ignoring whatever flat
 * value was passed in — so a non-FLAT load's rate can't be hand-edited
 * out of sync with its own stated basis. */
export function computeRate(params: {
  rateType: RateType;
  rateBasisValue: number | null | undefined;
  flatRate: number;
  weight: number;
  distanceKm: number | null | undefined;
  pickupTime: Date;
  deliveryTime: Date;
}): number {
  if (params.rateType === "FLAT") return Math.round(params.flatRate);
  const qty = rateBasisQuantity(params);
  return Math.round((params.rateBasisValue ?? 0) * (qty ?? 0));
}
