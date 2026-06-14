const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/authMiddleware');
const { registerSchema, loginSchema } = require('../middleware/validators/auth.validator');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
