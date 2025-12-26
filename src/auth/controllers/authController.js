const userService = require('../services/userService');

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
    if (!finalFullName || !email || !password) return res.status(400).json({ error: 'fullName, email and password are required' });

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
    // map known errors to client-friendly messages (include substrings Flutter checks)
    const message = (err && err.message) ? err.message : String(err);
    if (message.includes('email-already-in-use') || message.includes('البريد الإلكتروني مستخدم بالفعل')) {
      return res.status(409).json({ error: 'email-already-in-use - البريد الإلكتروني مستخدم بالفعل' });
    }
    if (message.includes('weak-password')) {
      // Pass through the helpful message if present (format: 'weak-password: <human message>')
      const parts = message.split(':');
      const human = parts.length > 1 ? parts.slice(1).join(':').trim() : 'Password does not meet policy';
      return res.status(400).json({ error: 'weak-password', message: human });
    }
    if (message.includes('invalid-email')) return res.status(400).json({ error: 'invalid-email' });
    // fallback
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

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
    // Provide clear responses for authentication errors
    const msg = (err && err.message) ? err.message : String(err);
    if (msg.includes('user-not-found')) return res.status(404).json({ error: 'user-not-found', message: 'No account exists for that email' });
    if (msg.includes('wrong-password')) return res.status(401).json({ error: 'wrong-password', message: 'The password is incorrect' });
    next(err);
  }
}

async function profile(req, res) {
  // req.user is populated by authMiddleware
  res.json({ user: req.user });
}

async function adminOnly(req, res) {
  res.json({ message: 'Welcome, admin!', user: req.user });
}

async function guestPage(req, res) {
  res.json({ message: 'Guest or higher access OK', user: req.user });
}

module.exports = { register, login, profile, adminOnly, guestPage };
