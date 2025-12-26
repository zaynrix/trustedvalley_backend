const express = require('express');
const router = express.Router();
const authMiddleware = require('../auth/middleware/authMiddleware');
const roleMiddleware = require('../auth/middleware/roleMiddleware');
const userController = require('../users/userController');

// All endpoints here require authentication (users access only their own data)
router.get('/me/profile', authMiddleware, userController.meProfile);
router.get('/me/contact', authMiddleware, userController.meContact);
router.get('/me/verification', authMiddleware, userController.meVerification);
router.get('/me/services', authMiddleware, userController.meServices);
// full raw profile + metadata (stored JSONB)
router.get('/me/data', authMiddleware, userController.meData);

module.exports = router;
