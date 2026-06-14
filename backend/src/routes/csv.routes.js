const express = require('express');
const csvController = require('../controllers/csv.controller');
const upload = require('../config/multer');
const { requireGroupMembership } = require('../middleware/groupAuth');

const router = express.Router({ mergeParams: true });

router.use(requireGroupMembership);

router.post('/import', upload.single('file'), csvController.importCsv);

module.exports = router;
