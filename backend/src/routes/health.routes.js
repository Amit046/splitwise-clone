const express = require('express');
const { success } = require('../utils/apiResponse');

const router = express.Router();

router.get('/', (req, res) => {
  return success(res, 200, { status: 'ok', timestamp: new Date().toISOString() }, 'API is healthy');
});

module.exports = router;
