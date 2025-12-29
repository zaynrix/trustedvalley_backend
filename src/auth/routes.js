const express = require('express');
const router = express.Router();
const { translate } = require('../utils/i18n');

const authController = require('./controllers/authController');
const passwordController = require('./controllers/passwordController');
const authMiddleware = require('./middleware/authMiddleware');
const roleMiddleware = require('./middleware/roleMiddleware');

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected
router.get('/profile', authMiddleware, authController.profile);

// Password management
router.post('/password/reset', authMiddleware, roleMiddleware(0), passwordController.resetPassword); // Admin only - reset any user's password
router.post('/password/change', authMiddleware, passwordController.changePassword); // User changes own password
// Public: user forgot password -> receives temporary password via email (dev code = 123456)
router.post('/password/forgot', passwordController.forgotPassword);
router.post('/password/confirm', passwordController.confirmReset); // Public: confirm reset with code + new password

// Role protected: only admin (role 0)
router.get('/admin', authMiddleware, roleMiddleware(0), authController.adminOnly);

// Guest route (common user 2, trusted user 1, admin 0 allowed)
router.get('/guest', authMiddleware, roleMiddleware([0, 1, 2]), authController.guestPage);

// Admin: list users (role 0 = admin)
router.get('/admin/users', authMiddleware, roleMiddleware(0), async (req, res, next) => {
	try {
		const userService = require('./services/userService');
		const limit = parseInt(req.query.limit || '100', 10);
		const offset = parseInt(req.query.offset || '0', 10);
		const users = await userService.listUsers(limit, offset);
		res.json({ users });
	} catch (err) { next(err); }
});

// Admin: get a single user (role 0 = admin)
router.get('/admin/users/:id', authMiddleware, roleMiddleware(0), async (req, res, next) => {
	try {
		const userService = require('./services/userService');
		const id = req.params.id;
		const u = await userService.getUserById(id);
		if (!u) {
			return res.status(404).json({ 
				error: 'user-not-found', 
				message: translate(req, 'errors.user-not-found') 
			});
		}
		res.json({ user: u });
	} catch (err) { next(err); }
});

// Admin: create user (including other admins) (role 0 = admin)
router.post('/admin/users', authMiddleware, roleMiddleware(0), authController.createUser);

// Admin: update user (role/status/profile) (role 0 = admin)
router.put('/admin/users/:id', authMiddleware, roleMiddleware(0), async (req, res, next) => {
	try {
		const userService = require('./services/userService');
		const id = req.params.id;
		const fields = req.body || {};
		const updated = await userService.updateUser(id, fields);
		res.json({ user: updated });
	} catch (err) { next(err); }
});

// Admin: delete user (role 0 = admin)
router.delete('/admin/users/:id', authMiddleware, roleMiddleware(0), async (req, res, next) => {
	try {
		const userService = require('./services/userService');
		const id = req.params.id;
		const result = await userService.deleteUser(id);
		if (!result) {
			return res.status(404).json({ 
				error: 'user-not-found', 
				message: translate(req, 'errors.user-not-found') 
			});
		}
		res.json({ 
			message: translate(req, 'messages.user-deleted-success'), 
			deleted: result 
		});
	} catch (err) { next(err); }
});

module.exports = router;
