const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const groupRoutes = require('./group.routes');   // includes /groups/:id/expenses, /settlements, /csv, /balances
const balanceRoutes = require('./balance.routes'); // top-level /balances/me

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/balances', balanceRoutes);

module.exports = router;
