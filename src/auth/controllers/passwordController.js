const userService = require('../services/userService');
const bcrypt = require('bcrypt');
const postgres = require('../../services/postgresService');
const inMemoryModel = require('../models/userModel');
const { sendResetEmail } = require('../../utils/mailer');
const { translate } = require('../../utils/i18n');
const resetModel = require('../models/resetModel');

// Reset password by email (admin can reset without current password)
async function resetPassword(req, res, next) {
  try {
    const { email, newPassword } = req.body || {};
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        error: 'email-newpassword-required', 
        message: translate(req, 'validation.email-newpassword-required') 
      });
    }

    // Password policy validation
    const passwordPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordPolicy.test(newPassword)) {
      return res.status(400).json({ 
        error: 'weak-password', 
        message: translate(req, 'errors.weak-password') 
      });
    }

    // Check if user exists
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        error: 'user-not-found', 
        message: translate(req, 'errors.user-not-found') 
      });
    }

    // Check if requester is admin (role 0)
    const isAdmin = req.user && req.user.role === 0;
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'forbidden', 
        message: translate(req, 'errors.forbidden') 
      });
    }

    // Update password
    await userService.updateUser(user.id, { password: newPassword });

    res.json({ message: translate(req, 'messages.password-reset-success') });
  } catch (err) {
    next(err);
  }
}

// Change own password (requires authentication and current password)
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({ 
        error: 'not-authenticated', 
        message: translate(req, 'errors.not-authenticated') 
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'current-password-required', 
        message: translate(req, 'validation.current-password-required') 
      });
    }

    // Password policy validation
    const passwordPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordPolicy.test(newPassword)) {
      return res.status(400).json({ 
        error: 'weak-password', 
        message: translate(req, 'errors.weak-password') 
      });
    }

    // Verify current password
    const passwordResult = await postgres.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!passwordResult.rows.length) {
      return res.status(404).json({ 
        error: 'user-not-found', 
        message: translate(req, 'errors.user-not-found') 
      });
    }

    const isValid = await bcrypt.compare(currentPassword, passwordResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        error: 'wrong-password', 
        message: translate(req, 'errors.wrong-password') 
      });
    }

    // Update password
    await userService.updateUser(userId, { password: newPassword });

    res.json({ message: translate(req, 'messages.password-changed-success') });
  } catch (err) {
    next(err);
  }
}

// Public: forgot password (user provides email) -> send a one-time reset code
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ 
        error: 'email-required', 
        message: translate(req, 'errors.email-required') 
      });
    }

    const user = await userService.getUserByEmail(email);
    if (!user) {
      // To avoid account enumeration, respond with 200 but log the fact
      console.warn('Password reset requested for non-existing email:', email);
      return res.json({ message: translate(req, 'messages.reset-email-sent-if-exists') });
    }

    // Check rate limiting - don't send new code if one was sent within last 15 minutes
    const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
    if (resetModel.wasSentRecently(email, COOLDOWN_MS)) {
      const timeRemaining = resetModel.getTimeUntilNextCode(email, COOLDOWN_MS);
      const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
      return res.status(429).json({ 
        error: 'rate-limit-exceeded', 
        message: translate(req, 'errors.rate-limit-exceeded', { minutes: minutesRemaining }),
        retryAfter: Math.ceil(timeRemaining / 1000) // seconds
      });
    }

    // generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
    const sentAt = Date.now();
    resetModel.set(email, code, expiresAt, sentAt);

    // send code via email
    const subjectMsg = `Your password reset code`;
    const textMsg = `Use this code to reset your password: ${code}\nIt expires in 15 minutes.`;
    try {
      // sendResetEmail accepts to, tempPassword (legacy) and optional opts
      await sendResetEmail(email, code, { subject: subjectMsg, text: textMsg });
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr);
      // still respond success to caller to avoid exposing existence
    }

    return res.json({ message: translate(req, 'messages.reset-email-sent-if-exists') });
  } catch (err) {
    next(err);
  }
}

// Public: confirm reset with code + set new password (no login required)
async function confirmReset(req, res, next) {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        error: 'email-code-newpassword-required', 
        message: translate(req, 'validation.email-code-newpassword-required') 
      });
    }

    // Test code for development/testing (always works)
    const TEST_CODE = '1232456';
    const isTestCode = String(code) === TEST_CODE;

    // validate code (unless it's the test code)
    if (!isTestCode) {
      const entry = resetModel.get(email);
      if (!entry || entry.code !== String(code) || Date.now() > entry.expiresAt) {
        return res.status(400).json({ 
          error: 'invalid-or-expired-code', 
          message: translate(req, 'errors.invalid-or-expired-code') 
        });
      }
    }

    // password policy validation
    const passwordPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordPolicy.test(newPassword)) {
      return res.status(400).json({ 
        error: 'weak-password', 
        message: translate(req, 'errors.weak-password') 
      });
    }

    // Check if user exists (for both test code and regular code)
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        error: 'user-not-found', 
        message: translate(req, 'errors.user-not-found') 
      });
    }

    // hash and persist password
    const hash = await bcrypt.hash(newPassword, 10);
    const usePostgres = !!process.env.DATABASE_URL;
    if (usePostgres) {
      await postgres.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE email = $2', [hash, email.toLowerCase()]);
    } else {
      const mem = inMemoryModel.findByEmail(email);
      if (!mem) {
        return res.status(404).json({ 
          error: 'user-not-found', 
          message: translate(req, 'errors.user-not-found') 
        });
      }
      mem.password = hash;
    }

    // consume token (only if not test code)
    if (!isTestCode) {
      resetModel.consume(email);
    }

    return res.json({ message: translate(req, 'messages.password-changed-success') });
  } catch (err) {
    next(err);
  }
}

module.exports = { resetPassword, changePassword, forgotPassword, confirmReset };
