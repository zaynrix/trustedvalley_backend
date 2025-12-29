const userService = require('../services/userService');
const { translate } = require('../../utils/i18n');

async function register(req, res, next) {
  try {
    const {
      fullName,
      name,
      email,
      password,
      phoneNumber,
      additionalPhone,
      location,
      services,
      servicePaymentMethods,
      referenceNumber,
      moneyTransferServices,
      role
    } = req.body || {};

    const finalFullName = fullName || name;
    if (!finalFullName || !email || !password) {
      return res.status(400).json({ 
        error: 'fields-required', 
        message: translate(req, 'errors.fields-required') 
      });
    }

    const user = await userService.createUser({
      fullName: finalFullName,
      email,
      password,
      phoneNumber,
      additionalPhone,
      location,
      services,
      servicePaymentMethods,
      referenceNumber,
      moneyTransferServices,
      role: role || 'user'
    });

  // return minimal sanitized user + token
  const token = user && user.token ? user.token : null;
  // use the already-required userService to avoid duplicate requires and ensure we call the correct sanitizer
  const sanitized = userService.sanitizeUserForClient(user);
  return token ? res.status(201).json({ token, user: sanitized }) : res.status(201).json({ user: sanitized });
  } catch (err) {
    // map known errors to client-friendly messages with translations
    const message = (err && err.message) ? err.message : String(err);
    if (message.includes('email-already-in-use')) {
      return res.status(409).json({ 
        error: 'email-already-in-use', 
        message: translate(req, 'errors.email-already-in-use') 
      });
    }
    if (message.includes('weak-password')) {
      const parts = message.split(':');
      const human = parts.length > 1 ? parts.slice(1).join(':').trim() : translate(req, 'errors.weak-password');
      return res.status(400).json({ error: 'weak-password', message: human });
    }
    if (message.includes('invalid-email')) {
      return res.status(400).json({ 
        error: 'invalid-email', 
        message: translate(req, 'errors.invalid-email') 
      });
    }
    // fallback
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'fields-required', 
        message: translate(req, 'errors.email-required') + ', ' + translate(req, 'errors.password-required') 
      });
    }

  const user = await userService.validateCredentials(email, password);

    // sanitize user object before returning (remove any sensitive fields if present)
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.password_hash;

    // produce minimal login response
    const sanitized = require('../services/userService').sanitizeUserForClient(safeUser);
    const token = user.token || null;
    return token ? res.json({ token, user: sanitized }) : res.json({ user: sanitized });
  } catch (err) {
    // Provide clear responses for authentication errors with translations
    const msg = (err && err.message) ? err.message : String(err);
    if (msg.includes('user-not-found')) {
      return res.status(404).json({ 
        error: 'user-not-found', 
        message: translate(req, 'errors.user-not-found') 
      });
    }
    if (msg.includes('wrong-password')) {
      return res.status(401).json({ 
        error: 'wrong-password', 
        message: translate(req, 'errors.wrong-password') 
      });
    }
    next(err);
  }
}

async function profile(req, res) {
  // req.user is populated by authMiddleware
  res.json({ user: req.user });
}

async function adminOnly(req, res) {
  res.json({ message: translate(req, 'messages.welcome-admin'), user: req.user });
}

async function guestPage(req, res) {
  res.json({ message: translate(req, 'messages.guest-access-ok'), user: req.user });
}

// Admin: create user (including other admins)
async function createUser(req, res, next) {
  try {
    const {
      fullName,
      name,
      email,
      password,
      phoneNumber,
      additionalPhone,
      location,
      services,
      servicePaymentMethods,
      referenceNumber,
      moneyTransferServices,
      role,
      status
    } = req.body || {};

    const finalFullName = fullName || name;
    if (!finalFullName || !email || !password) {
      return res.status(400).json({ 
        error: 'fields-required', 
        message: translate(req, 'errors.fields-required') 
      });
    }

    // Normalize role - admins can create users with any role (0, 1, 2, 3)
    const normalizedRole = role !== undefined ? (typeof role === 'number' ? role : 
      (role === 'admin' || role === 'superadmin' ? 0 :
       role === 'trusted' || role === 'trusted_user' ? 1 :
       role === 'betrug' || role === 'betrug_user' ? 3 : 2)) : 2;

    const user = await userService.createUser({
      fullName: finalFullName,
      email,
      password,
      phoneNumber,
      additionalPhone,
      location,
      services,
      servicePaymentMethods,
      referenceNumber,
      moneyTransferServices,
      role: normalizedRole
    });

    // Update status if provided
    if (status) {
      await userService.updateUser(user.id, { status });
    }

    // Return user without token (admin creating user, not logging in)
    const sanitized = userService.sanitizeUserForClient(user);
    return res.status(201).json({ user: sanitized });
  } catch (err) {
    const message = (err && err.message) ? err.message : String(err);
    if (message.includes('email-already-in-use')) {
      return res.status(409).json({ 
        error: 'email-already-in-use', 
        message: translate(req, 'errors.email-already-in-use') 
      });
    }
    if (message.includes('weak-password')) {
      const parts = message.split(':');
      const human = parts.length > 1 ? parts.slice(1).join(':').trim() : translate(req, 'errors.weak-password');
      return res.status(400).json({ error: 'weak-password', message: human });
    }
    if (message.includes('invalid-email')) {
      return res.status(400).json({ 
        error: 'invalid-email', 
        message: translate(req, 'errors.invalid-email') 
      });
    }
    next(err);
  }
}

module.exports = { register, login, profile, adminOnly, guestPage, createUser };
