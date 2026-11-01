const { z } = require('zod');
const { ROLES } = require('../utils/constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number');

const loginBody = z.object({
  identifier: z.string().trim().min(3).max(120),
  password: z.string().min(1).max(100),
});

const registerBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email(),
    phone,
    password: z.string().min(8, 'Use at least 8 characters').max(100),
    role: z.enum(Object.values(ROLES)),
    flatId: objectId.optional(),
  })
  .refine((v) => v.role !== ROLES.RESIDENT || v.flatId, { message: 'Residents need a flat', path: ['flatId'] });

const flatBody = z.object({
  tower: z.string().trim().min(1).max(5),
  number: z.string().trim().regex(/^[A-Za-z]-\d{3,4}$/, 'Use a format like A-1204'),
  floor: z.number().int().min(0).max(80).optional(),
});

const idParams = z.object({ id: objectId });

module.exports = { objectId, loginBody, registerBody, flatBody, idParams };

const { COURIERS, PARCEL_STATUS } = require('../utils/constants');

const parcelBody = z.object({
  flatId: objectId,
  courier: z.enum(COURIERS),
  shelfId: z.string().trim().max(10).optional(),
});
const parcelListQuery = z.object({
  status: z.enum(Object.values(PARCEL_STATUS)).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
const slotsQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
const slotPatchBody = z
  .object({ capacity: z.number().int().min(0).max(100).optional(), isClosed: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');
const templatesBody = z.object({
  templates: z
    .array(z.object({ startTime: hhmm, endTime: hhmm, capacity: z.number().int().min(1).max(100) })
      .refine((t) => t.startTime < t.endTime, { message: 'End must be after start' }))
    .min(1).max(24),
});
const bookingBody = z.object({ parcelId: objectId, slotId: objectId });

Object.assign(module.exports, { parcelBody, parcelListQuery, slotsQuery, slotPatchBody, templatesBody, bookingBody });
