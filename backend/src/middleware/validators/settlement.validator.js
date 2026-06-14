const { z } = require('zod');

const createSettlementSchema = z.object({
  paid_to: z.coerce.number().int().positive(),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().trim().toUpperCase().length(3).default('INR'),
  note: z.string().trim().max(500).optional(),
});

module.exports = { createSettlementSchema };
