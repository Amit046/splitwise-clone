const express = require('express');
const balanceController = require('../controllers/balance.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/me', balanceController.getMyBalance);

module.exports = router;
