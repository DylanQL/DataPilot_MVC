const express = require('express');
const viewController = require('../controllers/viewController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, viewController.renderDashboard);

module.exports = router;
