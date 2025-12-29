const { translate } = require('../../utils/i18n');

// roleMiddleware(requiredRoles)
// Role mapping:
// 0 = admin
// 1 = trusted user
// 2 = common user
// 3 = betrug user
// requiredRoles can be a number, string (legacy), or array of numbers/strings
module.exports = function roleMiddleware(requiredRoles) {
  // Convert role names to numbers for backward compatibility
  const roleMap = {
    'admin': 0,
    'superadmin': 0,
    'trusted': 1,
    'trusted_user': 1,
    'trusteduser': 1,
    'user': 2,
    'common': 2,
    'common_user': 2,
    'commonuser': 2,
    'guest': 2,
    'betrug': 3,
    'betrug_user': 3,
    'betruguser': 3,
    'fraud': 3,
    'fraud_user': 3
  };

  const normalizeRole = (role) => {
    if (typeof role === 'number') return role;
    if (typeof role === 'string') {
      const lower = role.toLowerCase();
      return roleMap[lower] !== undefined ? roleMap[lower] : 2; // Default to common user
    }
    return 2;
  };

  const allowed = Array.isArray(requiredRoles) 
    ? requiredRoles.map(normalizeRole)
    : [normalizeRole(requiredRoles)];

  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        error: 'not-authenticated', 
        message: translate(req, 'errors.not-authenticated') 
      });
    }
    
    // Normalize user role to number
    const userRole = normalizeRole(user.role);
    
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ 
        error: 'insufficient-role', 
        message: translate(req, 'errors.insufficient-role') 
      });
    }
    next();
  };
};
