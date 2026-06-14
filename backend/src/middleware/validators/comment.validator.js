const { z } = require('zod');

const createCommentSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(1000),
});

module.exports = { createCommentSchema };
