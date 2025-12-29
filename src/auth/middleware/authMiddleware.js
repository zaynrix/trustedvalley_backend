const userService = require('../services/userService');
const { translate } = require('../../utils/i18n');

// Simple auth middleware that reads Authorization: Bearer <token>
module.exports = async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1] : null;
    if (!token) {
      return res.status(401).json({ 
        error: 'missing-auth-token', 
        message: translate(req, 'errors.missing-auth-token') 
      });
    }

    const user = await userService.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ 
        error: 'invalid-token', 
        message: translate(req, 'errors.invalid-token') 
      });
    }

    // attach a minimal public user object (flattened fields available)
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || user.name || null,
      name: user.name || user.fullName || null,
      role: user.role,
      status: user.status || null,
      profile: user.profile || {}
    };
    next();
  } catch (err) {
    next(err);
  }
};
