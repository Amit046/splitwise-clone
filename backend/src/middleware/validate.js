const ApiError = require('../utils/ApiError');

/**
 * Generic request validator. Pass a Zod schema; validates req.body
 * (or req.query/req.params if specified) and throws a 400 ApiError
 * with field-level details on failure.
 *
 * Usage: router.post('/login', validate(loginSchema), controller)
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new ApiError(400, 'Validation failed', errors);
  }

  req[source] = result.data;
  next();
};

module.exports = validate;
