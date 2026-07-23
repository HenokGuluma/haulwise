// These mirror the Prisma models but with Date fields as ISO strings, since
// that's what actually crosses the wire from Server Components (and from our
// own API routes, which return JSON) to Client Components. Construct real
// Date objects at the point of use (see src/lib/format.ts helpers, which all
// accept `Date | string`).

export type Role = "ADMIN" | "DISPATCHER";

export type LoadStatus = "DRAFT" | "ASSIGNED" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "BILLED";
export type DriverStatus = "AVAILABLE" | "ON_DUTY" | "OFF_DUTY";
export type EquipmentStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE";
export type PayoutStatus = "NOT_BILLED" | "PENDING" | "PAID";
export type EquipmentTypeCode = "V" | "R" | "F" | "PO";
export type DocumentType = "BOL" | "POD" | "RATE_CONFIRMATION";

export type Customer = {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNo: string;
  licenseExpiration: string;
  status: DriverStatus;
};

export type Equipment = {
  id: string;
  unitNumber: string;
  typeCode: EquipmentTypeCode;
  status: EquipmentStatus;
  nextMaintenance: string;
};

export type LoadDocument = {
  id: string;
  loadId: string;
  type: DocumentType;
  fileName: string;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedById: string | null;
  uploadedBy: { id: string; name: string } | null;
};

export type Load = {
  id: string;
  loadNumber: string;
  customerId: string;
  customer: Customer;
  origin: string;
  destination: string;
  pickupTime: string;
  deliveryTime: string;
  status: LoadStatus;
  rate: number;
  weight: number;
  commodity: string;
  equipmentTypeCode: EquipmentTypeCode;
  driverId: string | null;
  driver: Driver | null;
  equipmentId: string | null;
  equipment: Equipment | null;
  driverPay: number;
  payoutStatus: PayoutStatus;
  documents: LoadDocument[];
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type ApiError = { error: string; conflicts?: unknown[] };
