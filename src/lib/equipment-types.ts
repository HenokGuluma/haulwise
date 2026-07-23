// Shared between client and server: the curated icon/tone choices an admin
// can pick when creating or editing an equipment type (src/lib/validation.ts
// validates against these same lists), and the tone -> color lookup used to
// render badges (LoadCard, RosterView) without needing per-tone CSS classes.

export const EQUIPMENT_TYPE_ICONS = ["box", "snowflake", "layers", "zap", "truck", "package", "warehouse", "route"] as const;
export type EquipmentTypeIcon = (typeof EQUIPMENT_TYPE_ICONS)[number];

export const EQUIPMENT_TYPE_TONES = ["van", "reefer", "flatbed", "power", "success", "danger", "slate"] as const;
export type EquipmentTypeTone = (typeof EQUIPMENT_TYPE_TONES)[number];

export const EQUIPMENT_TONE_COLORS: Record<string, { bg: string; fg: string }> = {
  van: { bg: "var(--route-bg)", fg: "var(--route)" },
  reefer: { bg: "rgba(56, 189, 248, 0.16)", fg: "#0EA5E9" },
  flatbed: { bg: "var(--amber-bg)", fg: "var(--amber-ink)" },
  power: { bg: "var(--accent-bg)", fg: "var(--accent)" },
  success: { bg: "var(--success-bg)", fg: "var(--success)" },
  danger: { bg: "var(--danger-bg)", fg: "var(--danger)" },
  slate: { bg: "var(--slate-bg)", fg: "var(--slate)" },
};

export function equipmentToneColors(tone: string): { bg: string; fg: string } {
  return EQUIPMENT_TONE_COLORS[tone] ?? EQUIPMENT_TONE_COLORS.slate;
}
