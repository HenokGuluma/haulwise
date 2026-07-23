// Equipment type codes follow DAT's standard conventions so loads created here
// map directly onto DAT's Load Board / Freight Posting API in a future
// integration, without a data-mapping cleanup pass. See prisma/schema.prisma
// (EquipmentTypeCode) and src/lib/conflicts.ts.

export const EQUIPMENT_TYPES = [
  { code: "V", label: "Dry Van" },
  { code: "R", label: "Reefer" },
  { code: "F", label: "Flatbed" },
  { code: "PO", label: "Power Only" },
] as const;

export type EquipmentTypeCode = (typeof EQUIPMENT_TYPES)[number]["code"];

export function equipmentTypeLabel(code: string): string {
  return EQUIPMENT_TYPES.find((t) => t.code === code)?.label ?? code;
}
