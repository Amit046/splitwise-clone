const { z } = require('zod');

const SPLIT_TYPES = ['equal', 'unequal', 'percentage', 'share'];

/**
 * split_details shape varies by split_type:
 * - equal:      not required (participants come from `participants` array)
 * - unequal:    { [userId]: amount }
 * - percentage: { [userId]: percentage }
 * - share:      { [userId]: shares }
 *
 * We validate the basic shape here (record of string->number) and leave
 * sum/percentage validation to split.service.js, which has the totalAmount
 * context needed for tolerance checks.
 */
const splitDetailsSchema = z.record(z.string(), z.number()).optional();

const createExpenseSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(255),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().trim().toUpperCase().length(3, 'Currency must be a 3-letter code').default('INR'),
  split_type: z.enum(SPLIT_TYPES, { errorMap: () => ({ message: `split_type must be one of ${SPLIT_TYPES.join(', ')}` }) }),
  expense_date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid expense_date'),
  notes: z.string().trim().max(1000).optional(),
  participants: z.array(z.coerce.number().int().positive()).optional(), // required for 'equal'
  split_details: splitDetailsSchema, // required for unequal/percentage/share
}).refine((data) => {
  if (data.split_type === 'equal') {
    return Array.isArray(data.participants) && data.participants.length > 0;
  }
  return data.split_details && Object.keys(data.split_details).length > 0;
}, {
  message: 'equal split requires "participants" array; other split types require "split_details"',
});

const updateExpenseSchema = createExpenseSchema;

const expenseIdParamSchema = z.object({
  expenseId: z.coerce.number().int().positive(),
});

const expenseGroupParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdParamSchema,
  expenseGroupParamSchema,
  SPLIT_TYPES,
};
