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
// Admin-managed (see EquipmentType below) rather than a fixed union — any
// non-empty string that exists in the equipment_types table is valid.
export type EquipmentTypeCode = string;
export type DocumentType = "BOL" | "POD" | "RATE_CONFIRMATION";
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "PROSPECT";

export type CustomerContact = {
  id: string;
  customerId: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type CustomerDocument = {
  id: string;
  customerId: string;
  label: string;
  fileName: string;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedById: string | null;
  uploadedBy: { id: string; name: string } | null;
};

export type Customer = {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  paymentTerms: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerWithDetail = Customer & {
  contacts: CustomerContact[];
  documents: CustomerDocument[];
};

export type CustomerListRow = Customer & {
  totalLoadCount: number;
  activeLoadCount: number;
};

export type Driver = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNo: string;
  licenseExpiration: string;
  medicalCertExpiration: string | null;
  endorsements: string[];
  status: DriverStatus;
};

export type EquipmentType = {
  id: string;
  code: string;
  label: string;
  icon: string;
  tone: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EquipmentTypeListRow = EquipmentType & {
  equipmentCount: number;
  loadCount: number;
};

export type Equipment = {
  id: string;
  unitNumber: string;
  typeCode: EquipmentTypeCode;
  status: EquipmentStatus;
  nextMaintenance: string;
};

export type DriverDocumentType = "CDL" | "MEDICAL_CERT" | "MVR";

export type DriverDocument = {
  id: string;
  driverId: string;
  type: DriverDocumentType;
  fileName: string;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedById: string | null;
  uploadedBy: { id: string; name: string } | null;
};

export type EquipmentMaintenanceRecord = {
  id: string;
  equipmentId: string;
  date: string;
  description: string;
  cost: number | null;
  performedBy: string | null;
  createdAt: string;
};

export type LoadActivityRow = {
  id: string;
  loadId: string;
  type: string;
  message: string;
  actorUserId: string | null;
  actorUser: { id: string; name: string } | null;
  createdAt: string;
};

export type LoadCommentRow = {
  id: string;
  loadId: string;
  authorUserId: string;
  authorUser: { id: string; name: string };
  body: string;
  createdAt: string;
};

export type PaymentRow = {
  id: string;
  loadId: string;
  amount: number;
  paidAt: string;
  method: string | null;
  note: string | null;
  createdAt: string;
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
  customerId: string | null;
  customer: Customer | null;
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
