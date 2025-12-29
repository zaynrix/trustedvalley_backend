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
    role: user.role !== undefined && user.role !== null ? normalizeRole(user.role) : (profile.role !== undefined && profile.role !== null ? normalizeRole(profile.role) : 2),
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

// Role mapping helper
// 0 = admin, 1 = trusted user, 2 = common user, 3 = betrug user
function normalizeRole(role) {
  if (typeof role === 'number') {
    return role >= 0 && role <= 3 ? role : 2; // Default to common user if invalid
  }
  if (typeof role === 'string') {
    const roleMap = {
      'admin': 0, 'superadmin': 0,
      'trusted': 1, 'trusted_user': 1, 'trusteduser': 1,
      'user': 2, 'common': 2, 'common_user': 2, 'commonuser': 2, 'guest': 2,
      'betrug': 3, 'betrug_user': 3, 'betruguser': 3, 'fraud': 3, 'fraud_user': 3
    };
    return roleMap[role.toLowerCase()] !== undefined ? roleMap[role.toLowerCase()] : 2;
  }
  return 2; // Default to common user
}

async function createUser({ fullName, email, password, phoneNumber, additionalPhone, location, services, servicePaymentMethods, referenceNumber, moneyTransferServices, role = 2 }) {
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
    const normalizedRole = normalizeRole(role);

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
      role: normalizeRole(role),
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
      [id, fullName, email.toLowerCase(), password_hash, phoneNumber || null, additionalPhone || null, location || null, servicesJson ? servicesJson : null, servicePaymentMethodsJson ? servicePaymentMethodsJson : null, referenceNumber || null, mtServicesJson ? mtServicesJson : null, profile, normalizedRole]
    );

    const user = { id, fullName, email: email.toLowerCase(), role: normalizedRole, status: 'pending', profile };
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
    role: normalizeRole(role),
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

async function getUserByEmail(email) {
  if (!email) return null;
  if (usePostgres) {
    const res = await postgres.query('SELECT id, full_name, email, role, status, profile FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!res || !res.rows || res.rows.length === 0) return null;
    const row = res.rows[0];
    return mergeUserAndProfile({ id: row.id, fullName: row.full_name, email: row.email, role: row.role, status: row.status, profile: row.profile });
  }
  const found = inMemoryModel.findByEmail(email);
  return mergeUserAndProfile(found);
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
async function listUsers(limit = 100, offset = 0, simplified = true) {
  if (usePostgres) {
    if (simplified) {
      // Return essential fields for list view including data from profile JSONB and trusted_users fields
      const res = await postgres.query(
        `SELECT 
          id, 
          full_name, 
          email, 
          phone_number,
          additional_phone,
          location,
          services,
          money_transfer_services,
          role, 
          status, 
          application_type,
          application_id,
          application_submitted_at,
          application_reviewed_at,
          trusted_added_at,
          moved_to_trusted_at,
          action_by,
          action_type,
          action_reason,
          last_action_at,
          reviewed_by,
          last_modified_by,
          last_document_submission_date,
          has_pending_document_requests,
          profile,
          created_at,
          updated_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2`, 
        [limit, offset]
      );
      return res.rows.map(r => {
        const profile = r.profile && typeof r.profile === 'object' ? r.profile : {};
        
        // Extract fields from profile JSONB
        return {
          id: r.id,
          fullName: r.full_name || profile.fullName || profile.displayName || null,
          displayName: profile.displayName || r.full_name || null,
          email: r.email || profile.email || null,
          phoneNumber: r.phone_number || profile.phoneNumber || null,
          additionalPhone: r.additional_phone || profile.additionalPhone || null,
          location: r.location || profile.location || profile.city || null,
          services: r.services || profile.services || null,
          moneyTransferServices: r.money_transfer_services || profile.moneyTransferServices || null,
          role: r.role !== undefined && r.role !== null ? r.role : (profile.role !== undefined && profile.role !== null ? profile.role : 2),
          status: r.status || profile.status || 'pending',
          applicationStatus: r.status || profile.status || 'pending',
          applicationType: r.application_type || profile.applicationType || null,
          appliedDate: r.application_submitted_at || profile.submittedAt || profile.createdAt || r.created_at,
          reviewedAt: r.application_reviewed_at || profile.reviewedAt || null,
          approvalDate: profile.approvalDate || null,
          // Trusted user fields
          isTrustedUser: profile.isTrustedUser || profile.isTrusted || false,
          addedToTrustedAt: r.trusted_added_at || profile.addedToTrustedAt || null,
          movedToTrustedAt: r.moved_to_trusted_at || profile.movedToTrustedAt || null,
          addedToTrustedTable: profile.addedToTrustedTable || false,
          // Action tracking fields
          applicationId: r.application_id || profile.applicationId || null,
          actionBy: r.action_by || profile.actionBy || null,
          actionType: r.action_type || profile.actionType || null,
          actionReason: r.action_reason || profile.actionReason || null,
          lastActionAt: r.last_action_at || profile.lastActionAt || null,
          reviewedBy: r.reviewed_by || profile.reviewedBy || null,
          lastModifiedBy: r.last_modified_by || profile.lastModifiedBy || null,
          lastDocumentSubmissionDate: r.last_document_submission_date || profile.lastDocumentSubmissionDate || null,
          hasPendingDocumentRequests: r.has_pending_document_requests !== null ? r.has_pending_document_requests : (profile.hasPendingDocumentRequests || false),
          // Account status fields
          isActive: profile.isActive !== undefined ? profile.isActive : true,
          isApproved: profile.isApproved !== undefined ? profile.isApproved : false,
          isBlocked: profile.isBlocked || false,
          isVisible: profile.isVisible !== undefined ? profile.isVisible : false,
          accountCreated: profile.accountCreated !== undefined ? profile.accountCreated : true,
          // Verification status
          verification: profile.verification || {
            emailVerified: profile.emailVerified || false,
            phoneVerified: profile.phoneVerified || false,
            documentsSubmitted: profile.documentsSubmitted || false,
            locationVerified: profile.locationVerified || false
          },
          // Dates
          createdAt: profile.createdAt || r.created_at,
          lastUpdated: profile.lastUpdated || profile.updatedAt || r.updated_at,
          lastModificationDate: profile.lastModificationDate || null,
          joinedDate: profile.joinedDate || profile.statistics?.joinedDate || r.created_at,
          // Statistics (including trusted_users statistics fields)
          statistics: {
            joinedDate: profile.joinedDate || profile.statistics?.joinedDate || r.created_at,
            rating: profile.rating || profile.statistics?.rating || 0,
            totalReviews: profile.totalReviews || profile.statistics?.totalReviews || 0,
            profileViews: profile.statistics?.profileViews || 0,
            lastViewedAt: profile.statistics?.lastViewedAt || null,
            submittedAt: profile.submittedAt || profile.statistics?.submittedAt || r.application_submitted_at || r.created_at
          },
          // Complex nested objects from profile
          documentConfirmations: profile.documentConfirmations || null,
          permissions: profile.permissions || null,
          privacySettings: profile.privacySettings || null,
          publicProfile: profile.publicProfile || null,
          // Subscription
          subscription: profile.subscription || null,
          // Reference
          referenceNumber: profile.referenceNumber || r.reference_number || null,
          // Firebase UID
          firebaseUid: profile.firebaseUid || profile.uid || null
        };
      });
    } else {
      // Return full user data (for backward compatibility if needed)
      const res = await postgres.query('SELECT id, full_name, email, role, status, profile, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      return res.rows.map(r => mergeUserAndProfile({ id: r.id, fullName: r.full_name, email: r.email, role: r.role, status: r.status, profile: r.profile, createdAt: r.created_at, updatedAt: r.updated_at }));
    }
  }
  // in-memory fallback
  const all = inMemoryModel.all();
  const slice = all.slice(offset, offset + limit);
  if (simplified) {
    return slice.map(u => {
      const profile = u.profile || {};
      return {
        id: u.id,
        fullName: u.fullName || u.name || profile.fullName || profile.displayName,
        displayName: profile.displayName || u.fullName || u.name,
        email: u.email || profile.email,
        phoneNumber: u.phoneNumber || u.phone_number || profile.phoneNumber,
        additionalPhone: profile.additionalPhone,
        location: u.location || profile.location || profile.city,
        services: u.services || profile.services,
        moneyTransferServices: profile.moneyTransferServices,
        role: u.role !== undefined && u.role !== null ? u.role : (profile.role !== undefined && profile.role !== null ? profile.role : 2),
        status: u.status || profile.status || 'pending',
        applicationStatus: u.status || profile.status || 'pending',
        applicationType: profile.applicationType,
        appliedDate: profile.submittedAt || profile.createdAt || u.createdAt,
        reviewedAt: profile.reviewedAt,
        approvalDate: profile.approvalDate,
        isTrustedUser: profile.isTrustedUser || profile.isTrusted || false,
        addedToTrustedAt: profile.addedToTrustedAt || profile.movedToTrustedAt,
        addedToTrustedTable: profile.addedToTrustedTable || false,
        isActive: profile.isActive !== undefined ? profile.isActive : true,
        isApproved: profile.isApproved !== undefined ? profile.isApproved : false,
        isBlocked: profile.isBlocked || false,
        isVisible: profile.isVisible !== undefined ? profile.isVisible : false,
        accountCreated: profile.accountCreated !== undefined ? profile.accountCreated : true,
        verification: profile.verification || {
          emailVerified: profile.emailVerified || false,
          phoneVerified: profile.phoneVerified || false,
          documentsSubmitted: profile.documentsSubmitted || false,
          locationVerified: profile.locationVerified || false
        },
        createdAt: profile.createdAt || u.createdAt,
        lastUpdated: profile.lastUpdated || profile.updatedAt || u.updatedAt,
        lastModificationDate: profile.lastModificationDate,
        joinedDate: profile.joinedDate || profile.statistics?.joinedDate || u.createdAt,
        statistics: {
          joinedDate: profile.joinedDate || profile.statistics?.joinedDate || u.createdAt,
          rating: profile.rating || profile.statistics?.rating || 0,
          totalReviews: profile.totalReviews || profile.statistics?.totalReviews || 0,
          profileViews: profile.statistics?.profileViews || 0,
          lastViewedAt: profile.statistics?.lastViewedAt || null,
          submittedAt: profile.submittedAt || profile.statistics?.submittedAt || u.createdAt
        },
        subscription: profile.subscription || null,
        referenceNumber: profile.referenceNumber,
        firebaseUid: profile.firebaseUid || profile.uid,
        // Trusted user action tracking fields
        applicationId: profile.applicationId,
        actionBy: profile.actionBy,
        actionType: profile.actionType,
        actionReason: profile.actionReason,
        lastActionAt: profile.lastActionAt,
        reviewedBy: profile.reviewedBy,
        lastModifiedBy: profile.lastModifiedBy,
        movedToTrustedAt: profile.movedToTrustedAt,
        lastDocumentSubmissionDate: profile.lastDocumentSubmissionDate,
        hasPendingDocumentRequests: profile.hasPendingDocumentRequests || false,
        // Complex nested objects
        documentConfirmations: profile.documentConfirmations || null,
        permissions: profile.permissions || null,
        privacySettings: profile.privacySettings || null,
        publicProfile: profile.publicProfile || null
      };
    });
  }
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
    // allow updating full_name, role, status, profile, and password
    const updates = [];
    const vals = [];
    let idx = 1;
    if (fields.fullName) { updates.push(`full_name = $${idx++}`); vals.push(fields.fullName); }
    if (fields.role !== undefined) { updates.push(`role = $${idx++}`); vals.push(normalizeRole(fields.role)); }
    if (fields.status) { updates.push(`status = $${idx++}`); vals.push(fields.status); }
    if (fields.profile) { updates.push(`profile = $${idx++}`); vals.push(fields.profile); }
    if (fields.password) {
      // Validate password policy
      const passwordPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!passwordPolicy.test(fields.password)) {
        throw new Error('weak-password: Password must be at least 8 characters long and include at least one uppercase letter and one special character');
      }
      const passwordHash = await bcrypt.hash(fields.password, 10);
      updates.push(`password_hash = $${idx++}`); 
      vals.push(passwordHash);
    }
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
    role: user.role !== undefined && user.role !== null ? user.role : null, // Fix: handle role 0 correctly (0 is falsy)
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
async function deleteUser(id) {
  if (!id) throw new Error('invalid-user-id');
  if (usePostgres) {
    // Check if user exists
    const user = await getUserById(id);
    if (!user) return null;
    
    // Delete user
    await postgres.query('DELETE FROM users WHERE id = $1', [id]);
    return { id, deleted: true };
  }
  // in-memory fallback
  const found = inMemoryModel.findById(id);
  if (!found) return null;
  inMemoryModel.delete(id);
  return { id, deleted: true };
}

module.exports = { createUser, validateCredentials, getUserByEmail, getUserByToken, listUsers, getUserById, updateUser, deleteUser, sanitizeUserForClient, getFullProfile, getContact, getVerification, getServices, getRawProfile };
