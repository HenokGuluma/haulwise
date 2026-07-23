import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const equipmentTypeCode = z.enum(["V", "R", "F", "PO"]);

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
  status: z.enum(["AVAILABLE", "ON_DUTY", "OFF_DUTY"]).default("AVAILABLE"),
});

export const driverUpdateSchema = driverCreateSchema.partial();

export const equipmentCreateSchema = z.object({
  unitNumber: z.string().trim().min(1),
  typeCode: equipmentTypeCode,
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE"]).default("AVAILABLE"),
  nextMaintenance: z.coerce.date(),
});

export const equipmentUpdateSchema = equipmentCreateSchema.partial();

export const documentUploadSchema = z.object({
  type: z.enum(["BOL", "POD", "RATE_CONFIRMATION"]),
  fileName: z.string().trim().min(1),
});
