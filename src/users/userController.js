const userService = require('../auth/services/userService');

// GET /api/users/me/profile
async function meProfile(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const profile = await userService.getFullProfile(userId);
    return res.json({ profile });
  } catch (err) { next(err); }
}

// GET /api/users/me/contact
async function meContact(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const contact = await userService.getContact(userId);
    return res.json({ contact });
  } catch (err) { next(err); }
}

// GET /api/users/me/verification
async function meVerification(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const verification = await userService.getVerification(userId);
    return res.json({ verification });
  } catch (err) { next(err); }
}

// GET /api/users/me/services
async function meServices(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const services = await userService.getServices(userId);
    return res.json({ services });
  } catch (err) { next(err); }
}

// GET /api/users/me/data - return the raw stored profile + top-level metadata
async function meData(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const data = await userService.getRawProfile(userId);
    if (!data) return res.status(404).json({ error: 'user-not-found' });
    return res.json({ data });
  } catch (err) { next(err); }
}

module.exports = { meProfile, meContact, meVerification, meServices, meData };
