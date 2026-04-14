const express = require('express');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', requireAuth, profileController.renderProfile);
router.post('/profile', requireAuth, profileController.updateProfile);

module.exports = router;
