import { z } from "zod";
import { EQUIPMENT_TYPE_ICONS, EQUIPMENT_TYPE_TONES } from "@/lib/equipment-types";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Equipment types are admin-managed (see /api/equipment-types) rather than a
// fixed set, so this just needs to be a non-empty code — existence against
// the database is checked in the route handler, same as customerId.
const equipmentTypeCode = z.string().trim().min(1, "Select an equipment type.");

export const loadCreateSchema = z
  .object({
    customerId: z.string().min(1),
    origin: z.string().trim().min(1, "Origin is required."),
    destination: z.string().trim().min(1, "Destination is required."),
    pickupTime: z.coerce.date(),
    deliveryTime: z.coerce.date(),
    weight: z.coerce.number().positive("Weight must be greater than 0."),
    rate: z.coerce.number().positive("Rate must be greater than 0."),
    commodity: z.string().trim().min(1, "Commodity is required."),
    equipmentTypeCode,
  })
  .refine((d) => d.deliveryTime > d.pickupTime, {
    message: "Delivery must be after pickup.",
    path: ["deliveryTime"],
  })
  .refine((d) => d.origin.toLowerCase() !== d.destination.toLowerCase(), {
    message: "Destination must differ from origin.",
    path: ["destination"],
  });

export const loadUpdateSchema = z
  .object({
    customerId: z.string().min(1).optional(),
    origin: z.string().trim().min(1).optional(),
    destination: z.string().trim().min(1).optional(),
    pickupTime: z.coerce.date().optional(),
    deliveryTime: z.coerce.date().optional(),
    weight: z.coerce.number().positive().optional(),
    rate: z.coerce.number().positive().optional(),
    commodity: z.string().trim().min(1).optional(),
    equipmentTypeCode: equipmentTypeCode.optional(),
    status: z.enum(["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"]).optional(),
    payoutStatus: z.enum(["NOT_BILLED", "PENDING", "PAID"]).optional(),
  })
  .partial();

export const assignSchema = z.object({
  driverId: z.string().min(1, "Select a driver."),
  equipmentId: z.string().min(1, "Select equipment."),
});

export const driverCreateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  licenseNo: z.string().trim().min(1),
  licenseExpiration: z.coerce.date(),
  medicalCertExpiration: z.coerce.date().optional().nullable(),
  endorsements: z.array(z.string().trim().min(1)).optional(),
  status: z.enum(["AVAILABLE", "ON_DUTY", "OFF_DUTY"]).default("AVAILABLE"),
});

export const driverUpdateSchema = driverCreateSchema.partial();

export const maintenanceRecordSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(1, "Description is required."),
  cost: z.coerce.number().nonnegative().optional().nullable(),
  performedBy: z.string().trim().max(100).optional().nullable(),
});

export const equipmentCreateSchema = z.object({
  unitNumber: z.string().trim().min(1),
  typeCode: equipmentTypeCode,
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE"]).default("AVAILABLE"),
  nextMaintenance: z.coerce.date(),
});

export const equipmentUpdateSchema = equipmentCreateSchema.partial();

export const equipmentTypeCreateSchema = z.object({
  code: z.string().trim().min(1, "Code is required.").max(10, "Keep the code short (10 characters max).").regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only."),
  label: z.string().trim().min(1, "Label is required.").max(60),
  icon: z.enum(EQUIPMENT_TYPE_ICONS).default("box"),
  tone: z.enum(EQUIPMENT_TYPE_TONES).default("slate"),
});

export const equipmentTypeUpdateSchema = equipmentTypeCreateSchema.partial();

export const documentUploadSchema = z.object({
  type: z.enum(["BOL", "POD", "RATE_CONFIRMATION"]),
  fileName: z.string().trim().min(1),
});

const customerStatus = z.enum(["ACTIVE", "INACTIVE", "PROSPECT"]);

export const customerCreateSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  contactName: z.string().trim().min(1, "Contact name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.string().trim().email("Enter a valid email."),
  status: customerStatus.default("ACTIVE"),
  paymentTerms: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  title: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  isPrimary: z.boolean().optional(),
});

export const customerContactUpdateSchema = customerContactSchema.partial();
