const express = require('express');
const tableController = require('../controllers/tableController');
const { requireAuthApi } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuthApi);

router.get('/tables', tableController.getTables);
router.post('/tables', tableController.createTable);
router.put('/tables/:tableName/edit', tableController.editTable);
router.delete('/tables/:tableName', tableController.deleteTable);
router.get('/tables/:tableName/columns', tableController.getTableColumns);
router.get('/tables/:tableName/records', tableController.getRecords);
router.post('/tables/:tableName/records', tableController.addRecord);

module.exports = router;
