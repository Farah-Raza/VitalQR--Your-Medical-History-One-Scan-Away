import { z } from 'zod';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
export const SEVERITIES = ['mild', 'moderate', 'severe', 'life-threatening'];

const phone = z
  .string()
  .trim()
  .min(7, 'Phone number looks too short')
  .max(20)
  .regex(/^[+]?[\d\s()-]+$/, 'Phone number contains invalid characters');

const allergySchema = z.object({
  substance: z.string().trim().min(1, 'Allergen is required').max(80),
  reaction: z.string().trim().max(160).optional().default(''),
  severity: z.enum(SEVERITIES).default('moderate'),
});

const conditionSchema = z.object({
  name: z.string().trim().min(1, 'Condition name is required').max(80),
  notes: z.string().trim().max(300).optional().default(''),
  diagnosedYear: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (v >= 1900 && v <= new Date().getFullYear()), 'Invalid year'),
});

const medicationSchema = z.object({
  name: z.string().trim().min(1, 'Medication name is required').max(80),
  dose: z.string().trim().max(60).optional().default(''),
  frequency: z.string().trim().max(60).optional().default(''),
});

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required').max(80),
  relation: z.string().trim().max(40).optional().default(''),
  phone,
});

/**
 * The emergency tier. Everything here is visible on a public, unauthenticated
 * scan — that is the entire point of the product, so keep it minimal and
 * clinically useful.
 */
export const emergencyProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  bloodGroup: z.enum(BLOOD_GROUPS).default('Unknown'),
  dateOfBirth: z.string().trim().optional().default(''),
  organDonor: z.boolean().default(false),
  allergies: z.array(allergySchema).max(25).default([]),
  conditions: z.array(conditionSchema).max(25).default([]),
  medications: z.array(medicationSchema).max(30).default([]),
  emergencyContacts: z.array(contactSchema).min(1, 'Add at least one emergency contact').max(5),
  notes: z.string().trim().max(500).optional().default(''),
});

/**
 * The protected tier. Never returned by the public scan endpoint — only
 * after an OTP approved by the profile owner or their emergency contact.
 */
export const privateProfileSchema = z.object({
  medicalHistory: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        year: z.union([z.string(), z.number()]).optional().default(''),
        details: z.string().trim().max(600).optional().default(''),
      })
    )
    .max(40)
    .default([]),
  pastSurgeries: z
    .array(
      z.object({
        procedure: z.string().trim().min(1).max(120),
        year: z.union([z.string(), z.number()]).optional().default(''),
      })
    )
    .max(30)
    .default([]),
  insurance: z
    .object({
      provider: z.string().trim().max(100).optional().default(''),
      policyNumber: z.string().trim().max(60).optional().default(''),
      validTill: z.string().trim().max(40).optional().default(''),
    })
    .default({}),
  primaryPhysician: z
    .object({
      name: z.string().trim().max(100).optional().default(''),
      hospital: z.string().trim().max(120).optional().default(''),
      phone: z.string().trim().max(20).optional().default(''),
    })
    .default({}),
  address: z.string().trim().max(300).optional().default(''),
});

export const fullProfileSchema = emergencyProfileSchema.merge(privateProfileSchema);

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  displayName: z.string().trim().min(1).max(80).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/** Turns a ZodError into a flat { field: message } map the React forms render inline. */
export function fieldErrors(zodError) {
  const out = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
