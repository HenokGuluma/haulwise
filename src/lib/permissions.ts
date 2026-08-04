// Fixed, code-owned catalog of what a role can be granted — analogous to
// EQUIPMENT_TYPE_ICONS/TONES in equipment-types.ts (plain consts rendered as
// pickable options in an admin form, not DB rows with their own lifecycle).
// Role.permissions (a string[] column) is validated against PERMISSION_KEYS
// at write time in the Roles admin API route.

export const PERMISSION_KEYS = [
  "loads:view", "loads:create", "loads:edit", "loads:assign", "loads:delete", "loads:comment",
  "loads:configure-rate",
  "payments:view", "payments:manage",
  "customers:view", "customers:create", "customers:edit", "customers:delete",
  "documents:view", "documents:upload", "documents:delete",
  "roster:view", "roster:manage", "roster:delete",
  "equipment-types:manage",
  "dashboard:view", "search:use",
  "users:view", "users:manage", "roles:manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_CATALOG: { category: string; items: { key: PermissionKey; label: string }[] }[] = [
  { category: "Loads", items: [
    { key: "loads:view", label: "View load activity & ledger" },
    { key: "loads:create", label: "Create loads" },
    { key: "loads:edit", label: "Edit load details" },
    { key: "loads:assign", label: "Assign driver & equipment" },
    { key: "loads:delete", label: "Delete loads" },
    { key: "loads:comment", label: "Comment on loads" },
    { key: "loads:configure-rate", label: "Choose how a load's rate is calculated (per Quintal, per km, etc.)" },
  ]},
  { category: "Payments", items: [
    { key: "payments:view", label: "View payment ledger" },
    { key: "payments:manage", label: "Log payments, edit rate & payout status" },
  ]},
  { category: "Customers", items: [
    { key: "customers:view", label: "View customers" },
    { key: "customers:create", label: "Create customers" },
    { key: "customers:edit", label: "Edit customers & contacts" },
    { key: "customers:delete", label: "Delete customers" },
  ]},
  { category: "Documents", items: [
    { key: "documents:view", label: "View & download documents" },
    { key: "documents:upload", label: "Upload documents" },
    { key: "documents:delete", label: "Delete documents" },
  ]},
  { category: "Roster (Drivers & Equipment)", items: [
    { key: "roster:view", label: "View drivers & equipment" },
    { key: "roster:manage", label: "Add/edit drivers & equipment" },
    { key: "roster:delete", label: "Delete drivers & equipment" },
  ]},
  { category: "Equipment Types", items: [
    { key: "equipment-types:manage", label: "Add/edit/delete equipment types" },
  ]},
  { category: "General", items: [
    { key: "dashboard:view", label: "View analytics dashboard" },
    { key: "search:use", label: "Use global search" },
  ]},
  { category: "Administration", items: [
    { key: "users:view", label: "View users" },
    { key: "users:manage", label: "Add/edit/delete users" },
    { key: "roles:manage", label: "Manage roles & permissions" },
  ]},
];
