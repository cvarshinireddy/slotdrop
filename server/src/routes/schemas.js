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
