const express = require('express');
const settlementController = require('../controllers/settlement.controller');
const validate = require('../middleware/validate');
const { requireGroupMembership } = require('../middleware/groupAuth');
const { createSettlementSchema } = require('../middleware/validators/settlement.validator');

const router = express.Router({ mergeParams: true });

router.use(requireGroupMembership);

router.post('/', validate(createSettlementSchema), settlementController.createSettlement);
router.get('/', settlementController.listSettlements);

module.exports = router;
