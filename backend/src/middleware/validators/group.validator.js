const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters').max(150),
  description: z.string().trim().max(500).optional(),
});

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const memberParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

module.exports = {
  createGroupSchema,
  addMemberSchema,
  groupIdParamSchema,
  memberParamSchema,
};
