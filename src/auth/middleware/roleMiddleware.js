// roleMiddleware(requiredRoles)
// requiredRoles can be a string or an array of strings
module.exports = function roleMiddleware(requiredRoles) {
  const allowed = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowed.includes(user.role)) return res.status(403).json({ error: 'Forbidden: insufficient role' });
    next();
  };
};
