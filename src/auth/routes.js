const express = require('express');
const router = express.Router();

const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/authMiddleware');
const roleMiddleware = require('./middleware/roleMiddleware');

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected
router.get('/profile', authMiddleware, authController.profile);

// Role protected: only admin
router.get('/admin', authMiddleware, roleMiddleware('admin'), authController.adminOnly);

// Guest route (guest, user, admin allowed)
router.get('/guest', authMiddleware, roleMiddleware(['guest', 'user', 'admin']), authController.guestPage);

// Admin: list users
router.get('/admin/users', authMiddleware, roleMiddleware(['admin','superadmin']), async (req, res, next) => {
	try {
		const userService = require('./services/userService');
		const limit = parseInt(req.query.limit || '100', 10);
		const offset = parseInt(req.query.offset || '0', 10);
		const users = await userService.listUsers(limit, offset);
		res.json({ users });
	} catch (err) { next(err); }
});

// Admin: get a single user
router.get('/admin/users/:id', authMiddleware, roleMiddleware(['admin','superadmin']), async (req, res, next) => {
	try {
		const userService = require('./services/userService');
		const id = req.params.id;
		const u = await userService.getUserById(id);
		if (!u) return res.status(404).json({ error: 'user-not-found' });
		res.json({ user: u });
	} catch (err) { next(err); }
});

// Admin: update user (role/status/profile)
router.put('/admin/users/:id', authMiddleware, roleMiddleware(['admin','superadmin']), async (req, res, next) => {
	try {
		const userService = require('./services/userService');
		const id = req.params.id;
		const fields = req.body || {};
		const updated = await userService.updateUser(id, fields);
		res.json({ user: updated });
	} catch (err) { next(err); }
});

module.exports = router;
