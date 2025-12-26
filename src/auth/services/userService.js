const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const postgres = require('../../services/postgresService');
const inMemoryModel = require('../models/userModel');

// Allow a developer-friendly in-memory mode for quick testing by setting USE_IN_MEMORY=1.
// Otherwise require DATABASE_URL for Postgres-backed persistence.
const usePostgres = (process.env.USE_IN_MEMORY === '1') ? false : !!process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function generateId() {
  return `user_${crypto.randomBytes(6).toString('hex')}`;
}

function generateTokenForUser(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

// Merge profile fields into a single, analysis-friendly user object
function mergeUserAndProfile(user) {
  // user: { id, fullName/name, email, role, status, profile, token }
  if (!user) return user;
  const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};

  // Start with top-level canonical fields
  const merged = {
    id: user.id,
    fullName: user.fullName || user.name || profile.fullName || profile.displayName || null,
    name: user.name || user.fullName || profile.displayName || profile.fullName || null,
    email: (user.email || profile.email || '').toLowerCase() || null,
    role: user.role || profile.role || 'user',
    status: user.status || profile.status || null,
    token: user.token || null
  };

  // Promote a small whitelist of profile fields that are useful for analytics / quick access.
  // This avoids duplicating the entire profile object at the top level.
  const whitelist = [
    'phoneNumber', 'location', 'services', 'moneyTransferServices', 'referenceNumber',
    'displayName', 'profileImageUrl', 'createdAt', 'updatedAt', 'isActive', 'isApproved', 'joinedDate'
  ];

  whitelist.forEach((k) => {
    if (profile[k] !== undefined && merged[k] === undefined) merged[k] = profile[k];
  });

  // keep profile nested as well (single source of truth)
  merged.profile = profile;
  return merged;
}

function validateEmail(email) {
  // basic email regex
  return typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
}

async function createUser({ fullName, email, password, phoneNumber, additionalPhone, location, services, servicePaymentMethods, referenceNumber, moneyTransferServices, role = 'user' }) {
  // validation
  if (!fullName || !email || !password) {
    throw new Error('missing-fields');
  }
  if (!validateEmail(email)) {
    throw new Error('invalid-email');
  }
  // Password policy: at least 8 characters, at least one uppercase letter, and at least one special character
  if (typeof password !== 'string') {
    throw new Error('weak-password');
  }
  const passwordPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
  if (!passwordPolicy.test(password)) {
    // include the substring the Flutter client checks but provide a clearer message
    throw new Error('weak-password: Password must be at least 8 characters long and include at least one uppercase letter and one special character');
  }
  // If Postgres not enabled, fall back to the in-memory model below.

  if (usePostgres) {
    // check duplicate email
    const existing = await postgres.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing && existing.rows && existing.rows.length > 0) {
      // include both Arabic and English tokens to match Flutter checks
      throw new Error('email-already-in-use - البريد الإلكتروني مستخدم بالفعل');
    }

    const id = generateId();
    const password_hash = await bcrypt.hash(password, 10);
    const servicesJson = services ? JSON.stringify(services) : null;
    const servicePaymentMethodsJson = servicePaymentMethods ? JSON.stringify(servicePaymentMethods) : null;
    const mtServicesJson = moneyTransferServices ? JSON.stringify(moneyTransferServices) : null;

    // Build a profile object similar to the Firebase schema provided by the client
    const now = new Date().toISOString();
    const profile = {
      accountCreated: true,
      addedToTrustedAt: null,
      addedToTrustedTable: false,
      additionalPhone: additionalPhone || '',
      approvalDate: null,
      bio: '',
      city: '',
      createdAt: now,
      currentIP: null,
      currentIPInfo: {},
      browserName: null,
      country: null,
      deviceFingerprint: null,
      ip: null,
      ipType: null,
      operatingSystem: null,
      timestamp: now,
      description: '',
      displayName: fullName,
      email: email.toLowerCase(),
      firebaseUid: null,
      fullName: fullName,
      hasNewDocumentRequests: false,
      isActive: true,
      isApproved: false,
      isOnline: false,
      isTrustedUser: false,
      isVisible: false,
      lastDocumentRequestDate: null,
      lastSeen: null,
      lastUpdated: now,
      location: location || '',
      moneyTransferServices: moneyTransferServices || [],
      pendingDocumentTypes: [],
      permissions: {},
      canAccessDashboard: false,
      canEditProfile: false,
      phoneNumber: phoneNumber || '',
      profileImageUrl: '',
      referenceBy: null,
      referenceNumber: referenceNumber || '',
      registrationIpData: {},
      reviewedAt: null,
      role: role === undefined ? 2 : role,
      servicePaymentMethods: servicePaymentMethods || [],
      services: services || [],
      showAddress: true,
      showEmail: false,
      showPhone: true,
      state: '',
      statistics: {},
      joinedDate: now,
      rating: 0,
      totalReviews: 0,
      status: 'pending',
      submittedAt: now,
      telegramAccount: '',
      uid: null,
      updatedAt: now,
      verification: {},
      documentsSubmitted: false,
      emailVerified: false,
      phoneVerified: false,
      verifiedAt: null,
      verificationBadges: [],
      workingHours: ''
    };

    await postgres.query(
      `INSERT INTO users (id, full_name, email, password_hash, phone_number, additional_phone, location, services, service_payment_methods, reference_number, money_transfer_services, profile, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')`,
      [id, fullName, email.toLowerCase(), password_hash, phoneNumber || null, additionalPhone || null, location || null, servicesJson ? servicesJson : null, servicePaymentMethodsJson ? servicePaymentMethodsJson : null, referenceNumber || null, mtServicesJson ? mtServicesJson : null, profile, role]
    );

    const user = { id, fullName, email: email.toLowerCase(), role, status: 'pending', profile };
    user.token = generateTokenForUser(user);
    return mergeUserAndProfile(user);
  }

  // fallback to in-memory model
  const exists = inMemoryModel.findByEmail(email);
  if (exists) throw new Error('email-already-in-use - البريد الإلكتروني مستخدم بالفعل');

  const id = generateId();
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  const profile = {
    accountCreated: true,
    addedToTrustedAt: null,
    addedToTrustedTable: false,
    additionalPhone: additionalPhone || '',
    approvalDate: null,
    bio: '',
    city: '',
    createdAt: now,
    currentIP: null,
    currentIPInfo: {},
    browserName: null,
    country: null,
    deviceFingerprint: null,
    ip: null,
    ipType: null,
    operatingSystem: null,
    timestamp: now,
    description: '',
    displayName: fullName,
    email: email.toLowerCase(),
    firebaseUid: null,
    fullName: fullName,
    hasNewDocumentRequests: false,
    isActive: true,
    isApproved: false,
    isOnline: false,
    isTrustedUser: false,
    isVisible: false,
    lastDocumentRequestDate: null,
    lastSeen: null,
    lastUpdated: now,
    location: location || '',
    moneyTransferServices: moneyTransferServices || [],
    pendingDocumentTypes: [],
    permissions: {},
    canAccessDashboard: false,
    canEditProfile: false,
    phoneNumber: phoneNumber || '',
    profileImageUrl: '',
    referenceBy: null,
    referenceNumber: referenceNumber || '',
    registrationIpData: {},
    reviewedAt: null,
    role: role === undefined ? 2 : role,
    servicePaymentMethods: servicePaymentMethods || [],
    services: services || [],
    showAddress: true,
    showEmail: false,
    showPhone: true,
    state: '',
    statistics: {},
    joinedDate: now,
    rating: 0,
    totalReviews: 0,
    status: 'pending',
    submittedAt: now,
    telegramAccount: '',
    uid: null,
    updatedAt: now,
    verification: {},
    documentsSubmitted: false,
    emailVerified: false,
    phoneVerified: false,
    verifiedAt: null,
    verificationBadges: [],
    workingHours: ''
  };

  const user = {
    id,
    name: fullName,
    email: email.toLowerCase(),
    password: passwordHash,
    role,
    phoneNumber,
    additionalPhone,
    location,
    services: services || [],
    servicePaymentMethods: servicePaymentMethods || [],
    referenceNumber,
    moneyTransferServices: moneyTransferServices || [],
    createdAt: now,
    profile
  };

  inMemoryModel.add(user);
  user.token = generateTokenForUser({ id: user.id, email: user.email, role: user.role });
  return mergeUserAndProfile({ id: user.id, fullName: user.name, email: user.email, role: user.role, token: user.token, profile: user.profile });
}

async function validateCredentials(email, password) {
  if (usePostgres) {
    const res = await postgres.query('SELECT id, full_name, email, password_hash, role, status, profile FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!res || !res.rows || res.rows.length === 0) {
      // user not found
      throw new Error('user-not-found');
    }
    const row = res.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      // wrong password
      throw new Error('wrong-password');
    }
    const user = { id: row.id, fullName: row.full_name, email: row.email, role: row.role, status: row.status, profile: row.profile };
    user.token = generateTokenForUser(user);
    return mergeUserAndProfile(user);
  }

  const user = inMemoryModel.findByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  // Return the full user object (without password) for consistency with Postgres path
  const token = generateTokenForUser({ id: user.id, email: user.email, role: user.role });
  const safeUser = { ...user };
  // remove sensitive fields
  delete safeUser.password;
  delete safeUser.password_hash;
  safeUser.token = token;
  return mergeUserAndProfile(safeUser);
}

async function getUserByToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const id = decoded.id;
    if (usePostgres) {
      const res = await postgres.query('SELECT id, full_name, email, role, status, profile FROM users WHERE id = $1', [id]);
      if (!res || !res.rows || res.rows.length === 0) return null;
      const row = res.rows[0];
      const user = { id: row.id, fullName: row.full_name, email: row.email, role: row.role, status: row.status, profile: row.profile };
      return mergeUserAndProfile(user);
    }
    const found = inMemoryModel.findById(id);
    return mergeUserAndProfile(found);
  } catch (err) {
    return null;
  }
}

// Admin helpers
async function listUsers(limit = 100, offset = 0) {
  if (usePostgres) {
    const res = await postgres.query('SELECT id, full_name, email, role, status, profile, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return res.rows.map(r => mergeUserAndProfile({ id: r.id, fullName: r.full_name, email: r.email, role: r.role, status: r.status, profile: r.profile, createdAt: r.created_at, updatedAt: r.updated_at }));
  }
  // in-memory fallback
  const all = inMemoryModel.all();
  const slice = all.slice(offset, offset + limit);
  return slice.map(u => mergeUserAndProfile({ id: u.id, fullName: u.fullName || u.name, email: u.email, role: u.role, status: u.status || null, profile: u.profile || {}, createdAt: u.createdAt, updatedAt: u.updatedAt }));
}

async function getUserById(id) {
  if (usePostgres) {
    const res = await postgres.query('SELECT id, full_name, email, role, status, profile, created_at, updated_at FROM users WHERE id = $1', [id]);
    if (!res || !res.rows || res.rows.length === 0) return null;
    const r = res.rows[0];
    return mergeUserAndProfile({ id: r.id, fullName: r.full_name, email: r.email, role: r.role, status: r.status, profile: r.profile, createdAt: r.created_at, updatedAt: r.updated_at });
  }
  const found = inMemoryModel.findById(id);
  return mergeUserAndProfile(found);
}

async function updateUser(id, fields) {
  if (!id) throw new Error('invalid-user-id');
  if (usePostgres) {
    // allow updating full_name, role, status, and profile (merge)
    const updates = [];
    const vals = [];
    let idx = 1;
    if (fields.fullName) { updates.push(`full_name = $${idx++}`); vals.push(fields.fullName); }
    if (fields.role) { updates.push(`role = $${idx++}`); vals.push(fields.role); }
    if (fields.status) { updates.push(`status = $${idx++}`); vals.push(fields.status); }
    if (fields.profile) { updates.push(`profile = $${idx++}`); vals.push(fields.profile); }
    if (updates.length === 0) return getUserById(id);
    vals.push(id);
    const q = `UPDATE users SET ${updates.join(',')}, updated_at = now() WHERE id = $${idx}`;
    await postgres.query(q, vals);
    return getUserById(id);
  }
  // in-memory update
  const found = inMemoryModel.findById(id);
  if (!found) return null;
  if (fields.fullName) found.fullName = fields.fullName;
  if (fields.role) found.role = fields.role;
  if (fields.status) found.status = fields.status;
  if (fields.profile && typeof fields.profile === 'object') found.profile = { ...(found.profile || {}), ...fields.profile };
  found.updatedAt = new Date().toISOString();
  return getUserById(id);
}

const { removeEmpty } = require('../../utils/clean');

function sanitizeUserForClient(user) {
  if (!user) return null;
  // minimal login response shape
  const out = {
    id: user.id,
    email: user.email,
    fullName: user.fullName || user.name || (user.profile && user.profile.displayName) || null,
    role: user.role || null,
    status: user.status || null,
    profileImageUrl: (user.profile && user.profile.profileImageUrl) || user.profileImageUrl || null,
    isApproved: (user.profile && typeof user.profile.isApproved !== 'undefined') ? user.profile.isApproved : (user.isApproved || false)
  };
  return removeEmpty(out);
}

// granular profile getters
async function getFullProfile(userId) {
  const u = await getUserById(userId);
  if (!u) return null;
  const p = u.profile || {};
  const result = {
    contact: {
      phoneNumber: p.phoneNumber || null,
      showPhone: typeof p.showPhone !== 'undefined' ? p.showPhone : null,
      showEmail: typeof p.showEmail !== 'undefined' ? p.showEmail : null
    },
    location: {
      city: p.city || null,
      country: p.country || null
    },
    services: {
      offered: p.services || [],
      moneyTransfer: p.moneyTransferServices || [],
      paymentMethods: p.servicePaymentMethods || []
    },
    profile: {
      bio: p.bio || null,
      rating: typeof p.rating !== 'undefined' ? p.rating : null,
      totalReviews: typeof p.totalReviews !== 'undefined' ? p.totalReviews : null
    },
    verification: {
      emailVerified: !!p.emailVerified,
      phoneVerified: !!p.phoneVerified
    }
  };
  return removeEmpty(result) || {};
}

async function getContact(userId) {
  const f = await getFullProfile(userId);
  if (!f) return null;
  return f.contact || {};
}

async function getVerification(userId) {
  const f = await getFullProfile(userId);
  if (!f) return null;
  return f.verification || {};
}

async function getServices(userId) {
  const f = await getFullProfile(userId);
  if (!f) return null;
  return f.services || {};
}

// Return the raw stored profile JSONB along with a few top-level metadata fields
async function getRawProfile(userId) {
  if (!userId) return null;
  if (!usePostgres) {
    const found = inMemoryModel.findById(userId);
    if (!found) return null;
    return { id: found.id, email: found.email, fullName: found.fullName || found.name, role: found.role, status: found.status || null, profile: found.profile || {} };
  }

  const res = await postgres.query('SELECT id, full_name, email, role, status, profile, created_at, updated_at FROM users WHERE id = $1', [userId]);
  if (!res || !res.rows || res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    status: r.status,
    profile: r.profile || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
module.exports = { createUser, validateCredentials, getUserByToken, listUsers, getUserById, updateUser, sanitizeUserForClient, getFullProfile, getContact, getVerification, getServices, getRawProfile };
