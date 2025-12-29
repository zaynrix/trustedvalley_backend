require('dotenv').config();
const { getFirestore } = require('../src/services/firestoreService');
const postgres = require('../src/services/postgresService');

/**
 * Migration script to transfer data from Firestore to PostgreSQL
 * 
 * Migrates:
 * 1. admin_content collection documents (e.g., home_content)
 * 2. statistics items (admin_content/statistics/items subcollection)
 * 3. users collection (if exists in Firestore)
 */

let migratedCount = 0;
let errorCount = 0;
const errors = [];

async function migrateAdminContent() {
  console.log('\n📄 Migrating admin_content collection...');
  const db = getFirestore();
  const adminContentRef = db.collection('admin_content');
  const snapshot = await adminContentRef.get();

  if (snapshot.empty) {
    console.log('   ℹ️  No admin_content documents found in Firestore');
    return;
  }

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const docId = doc.id;

      // Skip statistics document as it's handled separately
      if (docId === 'statistics') {
        console.log(`   ⏭️  Skipping 'statistics' document (handled separately)`);
        continue;
      }

      // Insert or update in PostgreSQL
      await postgres.query(
        `INSERT INTO admin_content (id, data, created_at, updated_at)
         VALUES ($1, $2, now(), now())
         ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now()`,
        [docId, JSON.parse(JSON.stringify(data))] // Deep clone to handle Firestore Timestamps
      );

      console.log(`   ✅ Migrated: ${docId}`);
      migratedCount++;
    } catch (err) {
      console.error(`   ❌ Error migrating document ${doc.id}:`, err.message);
      errorCount++;
      errors.push({ collection: 'admin_content', docId: doc.id, error: err.message });
    }
  }
}

async function migrateStatisticsItems() {
  console.log('\n📊 Migrating statistics items...');
  const db = getFirestore();
  
  try {
    const statsRef = db.collection('admin_content').doc('statistics').collection('items');
    const snapshot = await statsRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No statistics items found in Firestore');
      return;
    }

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const itemId = doc.id;

        // Map Firestore fields to PostgreSQL schema
        await postgres.query(
          `INSERT INTO statistics_items (id, label, description, value, order_index, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 
                   COALESCE($7::timestamptz, now()), 
                   COALESCE($8::timestamptz, now()))
           ON CONFLICT (id) DO UPDATE SET
             label = EXCLUDED.label,
             description = EXCLUDED.description,
             value = EXCLUDED.value,
             order_index = EXCLUDED.order_index,
             is_active = EXCLUDED.is_active,
             updated_at = EXCLUDED.updated_at`,
          [
            itemId,
            data.label || null,
            data.description || null,
            data.value || null,
            data.orderIndex !== undefined ? data.orderIndex : (data.order_index || 0),
            data.isActive !== undefined ? data.isActive : (data.is_active !== false),
            data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null,
            data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt) : null
          ]
        );

        console.log(`   ✅ Migrated statistics item: ${itemId}`);
        migratedCount++;
      } catch (err) {
        console.error(`   ❌ Error migrating statistics item ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'statistics_items', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  Statistics subcollection not found (this is OK if you never created statistics)');
    } else {
      console.error('   ❌ Error accessing statistics collection:', err.message);
      errorCount++;
      errors.push({ collection: 'statistics_items', docId: 'N/A', error: err.message });
    }
  }
}

async function migrateUsers() {
  console.log('\n👥 Migrating users collection...');
  const db = getFirestore();
  
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No users found in Firestore');
      return;
    }

    console.log(`   📋 Found ${snapshot.size} users in Firestore`);

    for (const doc of snapshot.docs) {
      try {
        const firestoreData = doc.data();
        const firestoreId = doc.id;

        // Check if user already exists in PostgreSQL
        const existing = await postgres.query('SELECT id FROM users WHERE id = $1 OR email = $2', 
          [firestoreId, firestoreData.email]);

        if (existing.rows.length > 0) {
          console.log(`   ⏭️  Skipping user ${firestoreId} (already exists in PostgreSQL)`);
          continue;
        }

        // Extract data from Firestore user document
        const profile = firestoreData.profile || firestoreData;
        const email = profile.email || firestoreData.email || '';
        const fullName = profile.fullName || profile.displayName || firestoreData.name || '';
        const phoneNumber = profile.phoneNumber || firestoreData.phoneNumber || null;
        const additionalPhone = profile.additionalPhone || firestoreData.additionalPhone || null;
        const location = profile.location || firestoreData.location || null;
        const services = profile.services || firestoreData.services || null;
        const servicePaymentMethods = profile.servicePaymentMethods || firestoreData.servicePaymentMethods || null;
        const referenceNumber = profile.referenceNumber || firestoreData.referenceNumber || null;
        const moneyTransferServices = profile.moneyTransferServices || firestoreData.moneyTransferServices || null;
        const role = profile.role || firestoreData.role || 'user';
        const status = profile.status || firestoreData.status || 'pending';

        // Handle password hash - if exists in Firestore, use it; otherwise generate a placeholder
        // Note: You may need to handle password migration separately if passwords are stored differently
        let passwordHash = firestoreData.password_hash || firestoreData.passwordHash;
        if (!passwordHash) {
          // Generate a random hash as placeholder - users will need to reset password
          const bcrypt = require('bcrypt');
          passwordHash = await bcrypt.hash('TEMPORARY_PASSWORD_' + Math.random().toString(36), 10);
          console.log(`   ⚠️  User ${email} has no password - set temporary password (user must reset)`);
        }

        // Convert Firestore Timestamps to ISO strings for JSONB
        const profileData = { ...profile };
        Object.keys(profileData).forEach(key => {
          if (profileData[key] && typeof profileData[key] === 'object' && profileData[key].toDate) {
            profileData[key] = profileData[key].toDate().toISOString();
          }
        });

        // Use Firestore document ID or generate new one
        const userId = firestoreId.startsWith('user_') ? firestoreId : `user_${firestoreId}`;

        await postgres.query(
          `INSERT INTO users (id, full_name, email, password_hash, phone_number, additional_phone, 
                              location, services, service_payment_methods, reference_number, 
                              money_transfer_services, profile, role, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                   COALESCE($15::timestamptz, now()), 
                   COALESCE($16::timestamptz, now()))`,
          [
            userId,
            fullName,
            email.toLowerCase(),
            passwordHash,
            phoneNumber,
            additionalPhone,
            location,
            services ? JSON.parse(JSON.stringify(services)) : null,
            servicePaymentMethods ? JSON.parse(JSON.stringify(servicePaymentMethods)) : null,
            referenceNumber,
            moneyTransferServices ? JSON.parse(JSON.stringify(moneyTransferServices)) : null,
            profileData,
            role,
            status,
            profile.createdAt ? new Date(profile.createdAt.toDate ? profile.createdAt.toDate() : profile.createdAt) : null,
            profile.updatedAt ? new Date(profile.updatedAt.toDate ? profile.updatedAt.toDate() : profile.updatedAt) : null
          ]
        );

        console.log(`   ✅ Migrated user: ${email} (${userId})`);
        migratedCount++;
      } catch (err) {
        console.error(`   ❌ Error migrating user ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'users', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  Users collection not found in Firestore (this is OK if users are already in PostgreSQL)');
    } else {
      console.error('   ❌ Error accessing users collection:', err.message);
      errorCount++;
      errors.push({ collection: 'users', docId: 'N/A', error: err.message });
    }
  }
}

async function migrateActivities() {
  console.log('\n📝 Migrating activities collection...');
  const db = getFirestore();
  
  try {
    const activitiesRef = db.collection('activities');
    const snapshot = await activitiesRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No activities found in Firestore');
      return;
    }

    console.log(`   📋 Found ${snapshot.size} activities`);

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const activityId = doc.id;

        // Extract common fields if they exist
        const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null;
        const updatedAt = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null;

        await postgres.query(
          `INSERT INTO activities (id, data, created_at, updated_at)
           VALUES ($1, $2, COALESCE($3::timestamptz, now()), COALESCE($4::timestamptz, now()))
           ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = COALESCE($4::timestamptz, now())`,
          [activityId, JSON.parse(JSON.stringify(data)), createdAt, updatedAt]
        );

        console.log(`   ✅ Migrated activity: ${activityId}`);
        migratedCount++;
      } catch (err) {
        console.error(`   ❌ Error migrating activity ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'activities', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  Activities collection not found in Firestore');
    } else {
      console.error('   ❌ Error accessing activities collection:', err.message);
      errorCount++;
      errors.push({ collection: 'activities', docId: 'N/A', error: err.message });
    }
  }
}

async function migrateTrustedUsers() {
  console.log('\n✅ Migrating trusted_users collection to users table...');
  const db = getFirestore();
  const bcrypt = require('bcrypt');
  
  try {
    const trustedUsersRef = db.collection('trusted_users');
    const snapshot = await trustedUsersRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No trusted users found in Firestore');
      return;
    }

    console.log(`   📋 Found ${snapshot.size} trusted users`);

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const trustedUserId = doc.id;

        // Extract common fields
        const userIdField = data.userId || data.user_id || data.uid || trustedUserId;
        const userEmail = data.email || data.userEmail || data.user_email || null;
        const fullName = data.fullName || data.displayName || data.name || data.userName || 'Trusted User';
        const addedAt = data.addedAt ? (data.addedAt.toDate ? data.addedAt.toDate() : new Date(data.addedAt)) : 
                      (data.added_at ? (data.added_at.toDate ? data.added_at.toDate() : new Date(data.added_at)) : null);
        const movedToTrustedAt = data.movedToTrustedAt ? (data.movedToTrustedAt.toDate ? data.movedToTrustedAt.toDate() : new Date(data.movedToTrustedAt)) : 
                                (data.moved_to_trusted_at ? (data.moved_to_trusted_at.toDate ? data.moved_to_trusted_at.toDate() : new Date(data.moved_to_trusted_at)) : addedAt);
        const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null;
        const updatedAt = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null;
        
        // Extract action tracking fields
        const applicationId = data.applicationId || data.application_id || null;
        const actionBy = data.actionBy || data.action_by || null;
        const actionType = data.actionType || data.action_type || null;
        const actionReason = data.actionReason || data.action_reason || null;
        const lastActionAt = data.lastActionAt ? (data.lastActionAt.toDate ? data.lastActionAt.toDate() : new Date(data.lastActionAt)) : 
                           (data.last_action_at ? (data.last_action_at.toDate ? data.last_action_at.toDate() : new Date(data.last_action_at)) : null);
        const reviewedBy = data.reviewedBy || data.reviewed_by || null;
        const lastModifiedBy = data.lastModifiedBy || data.last_modified_by || null;
        const lastDocumentSubmissionDate = data.lastDocumentSubmissionDate ? (data.lastDocumentSubmissionDate.toDate ? data.lastDocumentSubmissionDate.toDate() : new Date(data.lastDocumentSubmissionDate)) : 
                                         (data.last_document_submission_date ? (data.last_document_submission_date.toDate ? data.last_document_submission_date.toDate() : new Date(data.last_document_submission_date)) : null);
        const hasPendingDocumentRequests = data.hasPendingDocumentRequests !== undefined ? data.hasPendingDocumentRequests : 
                                         (data.has_pending_document_requests !== undefined ? data.has_pending_document_requests : false);

        if (!userEmail) {
          console.log(`   ⚠️  Skipping trusted user ${trustedUserId}: no email found`);
          continue;
        }

        // Convert Firestore data to JSON
        const trustedData = JSON.parse(JSON.stringify(data));
        Object.keys(trustedData).forEach(key => {
          if (trustedData[key] && typeof trustedData[key] === 'object' && trustedData[key].toDate) {
            trustedData[key] = trustedData[key].toDate().toISOString();
          }
        });

        // Find existing user by email or id
        let userResult = await postgres.query('SELECT id, email, profile, role FROM users WHERE email = $1 OR id = $2', 
          [userEmail.toLowerCase(), userIdField]);

        const now = new Date().toISOString();

        if (userResult && userResult.rows.length > 0) {
          // Update existing user
          const existingUser = userResult.rows[0];
          const existingProfile = existingUser.profile || {};
          
          // Merge trusted user data into profile
          const mergedProfile = {
            ...existingProfile,
            ...trustedData,
            // Preserve important user fields
            email: existingProfile.email || userEmail,
            fullName: existingProfile.fullName || fullName,
            displayName: existingProfile.displayName || fullName,
            // Mark as trusted
            isTrusted: true,
            trustedUserData: trustedData,
            // Update timestamps
            lastUpdated: now,
            updatedAt: now
          };

          await postgres.query(
            `UPDATE users 
             SET role = 1, 
                 profile = $1, 
                 trusted_added_at = COALESCE($2::timestamptz, trusted_added_at, now()),
                 moved_to_trusted_at = COALESCE($3::timestamptz, moved_to_trusted_at),
                 application_id = COALESCE($4, application_id),
                 action_by = COALESCE($5, action_by),
                 action_type = COALESCE($6, action_type),
                 action_reason = COALESCE($7, action_reason),
                 last_action_at = COALESCE($8::timestamptz, last_action_at),
                 reviewed_by = COALESCE($9, reviewed_by),
                 last_modified_by = COALESCE($10, last_modified_by),
                 last_document_submission_date = COALESCE($11::timestamptz, last_document_submission_date),
                 has_pending_document_requests = COALESCE($12, has_pending_document_requests),
                 updated_at = now()
             WHERE id = $13`,
            [mergedProfile, addedAt, movedToTrustedAt, applicationId, actionBy, actionType, actionReason, lastActionAt, reviewedBy, lastModifiedBy, lastDocumentSubmissionDate, hasPendingDocumentRequests, existingUser.id]
          );

          console.log(`   ✅ Updated user to trusted: ${userEmail} (from trusted_users doc: ${trustedUserId})`);
          migratedCount++;
        } else {
          // Create new user from trusted user data
          const userId = userIdField.startsWith('user_') ? userIdField : `user_${userIdField}`;
          const userEmailLower = userEmail.toLowerCase();
          
          // Generate a temporary password if not provided
          const tempPassword = data.password || `TempTrusted${Math.random().toString(36).slice(2, 8)}!`;
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          const profile = {
            ...trustedData,
            fullName: fullName,
            displayName: fullName,
            email: userEmailLower,
            createdAt: createdAt || now,
            joinedDate: createdAt || now,
            isActive: true,
            status: 'active',
            isTrusted: true,
            trustedUserData: trustedData,
            lastUpdated: now,
            updatedAt: now
          };

          await postgres.query(
            `INSERT INTO users (id, full_name, email, password_hash, profile, role, status, trusted_added_at, moved_to_trusted_at, application_id, action_by, action_type, action_reason, last_action_at, reviewed_by, last_modified_by, last_document_submission_date, has_pending_document_requests, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 1, 'active', COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, $6::timestamptz, now()), $8, $9, $10, $11, $12, $13, $14, $15, $16, COALESCE($17::timestamptz, now()), COALESCE($18::timestamptz, now()))
             ON CONFLICT (email) DO UPDATE SET
               role = 1,
               profile = $5,
               trusted_added_at = COALESCE($6::timestamptz, users.trusted_added_at, now()),
               moved_to_trusted_at = COALESCE($7::timestamptz, users.moved_to_trusted_at),
               application_id = COALESCE($8, users.application_id),
               action_by = COALESCE($9, users.action_by),
               action_type = COALESCE($10, users.action_type),
               action_reason = COALESCE($11, users.action_reason),
               last_action_at = COALESCE($12::timestamptz, users.last_action_at),
               reviewed_by = COALESCE($13, users.reviewed_by),
               last_modified_by = COALESCE($14, users.last_modified_by),
               last_document_submission_date = COALESCE($15::timestamptz, users.last_document_submission_date),
               has_pending_document_requests = COALESCE($16, users.has_pending_document_requests),
               updated_at = now()`,
            [userId, fullName, userEmailLower, passwordHash, profile, addedAt, movedToTrustedAt, applicationId, actionBy, actionType, actionReason, lastActionAt, reviewedBy, lastModifiedBy, lastDocumentSubmissionDate, hasPendingDocumentRequests, createdAt, updatedAt]
          );

          console.log(`   ✅ Created trusted user: ${userEmail} (from trusted_users doc: ${trustedUserId})`);
          if (!data.password) {
            console.log(`      ⚠️  Temporary password generated - user should reset password`);
          }
          migratedCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error migrating trusted user ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'trusted_users', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  Trusted users collection not found in Firestore');
    } else {
      console.error('   ❌ Error accessing trusted_users collection:', err.message);
      errorCount++;
      errors.push({ collection: 'trusted_users', docId: 'N/A', error: err.message });
    }
  }
}

async function migrateUntrustedUsers() {
  console.log('\n❌ Migrating untrusted_users collection...');
  const db = getFirestore();
  
  try {
    const untrustedUsersRef = db.collection('untrusted_users');
    const snapshot = await untrustedUsersRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No untrusted users found in Firestore');
      return;
    }

    console.log(`   📋 Found ${snapshot.size} untrusted users`);

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const userId = doc.id;

        // Extract common fields
        const userIdField = data.userId || data.user_id || data.uid || null;
        const userEmail = data.email || data.userEmail || null;
        const addedAt = data.addedAt ? (data.addedAt.toDate ? data.addedAt.toDate() : new Date(data.addedAt)) : 
                      (data.added_at ? (data.added_at.toDate ? data.added_at.toDate() : new Date(data.added_at)) : null);
        const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null;
        const updatedAt = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null;

        await postgres.query(
          `INSERT INTO untrusted_users (id, data, user_id, user_email, added_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()), COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, now()))
           ON CONFLICT (id) DO UPDATE SET 
             data = $2, 
             user_id = $3, 
             user_email = $4, 
             added_at = COALESCE($5::timestamptz, untrusted_users.added_at),
             updated_at = COALESCE($7::timestamptz, now())`,
          [userId, JSON.parse(JSON.stringify(data)), userIdField, userEmail, addedAt, createdAt, updatedAt]
        );

        console.log(`   ✅ Migrated untrusted user: ${userId}`);
        migratedCount++;
      } catch (err) {
        console.error(`   ❌ Error migrating untrusted user ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'untrusted_users', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  Untrusted users collection not found in Firestore');
    } else {
      console.error('   ❌ Error accessing untrusted_users collection:', err.message);
      errorCount++;
      errors.push({ collection: 'untrusted_users', docId: 'N/A', error: err.message });
    }
  }
}

async function migratePaymentPlaceSubmissions() {
  console.log('\n💳 Migrating payment_place_submissions collection...');
  const db = getFirestore();
  
  try {
    const submissionsRef = db.collection('payment_place_submissions');
    const snapshot = await submissionsRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No payment place submissions found in Firestore');
      return;
    }

    console.log(`   📋 Found ${snapshot.size} payment place submissions`);

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const submissionId = doc.id;

        // Extract common fields
        const userId = data.userId || data.user_id || data.uid || null;
        const placeName = data.placeName || data.place_name || data.name || null;
        const status = data.status || data.state || 'pending';
        const submittedAt = data.submittedAt ? (data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt)) : 
                          (data.submitted_at ? (data.submitted_at.toDate ? data.submitted_at.toDate() : new Date(data.submitted_at)) : null);
        const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null;
        const updatedAt = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null;

        await postgres.query(
          `INSERT INTO payment_place_submissions (id, data, user_id, place_name, status, submitted_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, now()), COALESCE($8::timestamptz, now()))
           ON CONFLICT (id) DO UPDATE SET 
             data = $2, 
             user_id = $3, 
             place_name = $4, 
             status = $5,
             submitted_at = COALESCE($6::timestamptz, payment_place_submissions.submitted_at),
             updated_at = COALESCE($8::timestamptz, now())`,
          [submissionId, JSON.parse(JSON.stringify(data)), userId, placeName, status, submittedAt, createdAt, updatedAt]
        );

        console.log(`   ✅ Migrated payment place submission: ${submissionId}`);
        migratedCount++;
      } catch (err) {
        console.error(`   ❌ Error migrating payment place submission ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'payment_place_submissions', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  Payment place submissions collection not found in Firestore');
    } else {
      console.error('   ❌ Error accessing payment_place_submissions collection:', err.message);
      errorCount++;
      errors.push({ collection: 'payment_place_submissions', docId: 'N/A', error: err.message });
    }
  }
}

async function migrateUserApplications() {
  console.log('\n📋 Migrating user_applications collection to users table...');
  const db = getFirestore();
  const bcrypt = require('bcrypt');
  
  try {
    const applicationsRef = db.collection('user_applications');
    const snapshot = await applicationsRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No user applications found in Firestore');
      return;
    }

    console.log(`   📋 Found ${snapshot.size} user applications`);

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const applicationId = doc.id;

        // Extract common fields
        const userId = data.userId || data.user_id || data.uid || applicationId;
        const userEmail = data.email || data.userEmail || data.user_email || null;
        const fullName = data.fullName || data.displayName || data.name || data.userName || 'User';
        const applicationType = data.applicationType || data.application_type || data.type || null;
        const status = data.status || data.state || 'pending';
        const submittedAt = data.submittedAt ? (data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt)) : 
                          (data.submitted_at ? (data.submitted_at.toDate ? data.submitted_at.toDate() : new Date(data.submitted_at)) : null);
        const reviewedAt = data.reviewedAt ? (data.reviewedAt.toDate ? data.reviewedAt.toDate() : new Date(data.reviewedAt)) : 
                          (data.reviewed_at ? (data.reviewed_at.toDate ? data.reviewed_at.toDate() : new Date(data.reviewed_at)) : null);
        const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null;
        const updatedAt = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : null;

        if (!userEmail) {
          console.log(`   ⚠️  Skipping user application ${applicationId}: no email found`);
          continue;
        }

        // Convert Firestore data to JSON
        const applicationData = JSON.parse(JSON.stringify(data));
        Object.keys(applicationData).forEach(key => {
          if (applicationData[key] && typeof applicationData[key] === 'object' && applicationData[key].toDate) {
            applicationData[key] = applicationData[key].toDate().toISOString();
          }
        });

        // Find existing user by email or id
        let userResult = await postgres.query('SELECT id, email, profile, role FROM users WHERE email = $1 OR id = $2', 
          [userEmail.toLowerCase(), userId]);

        const now = new Date().toISOString();

        if (userResult && userResult.rows.length > 0) {
          // Update existing user
          const existingUser = userResult.rows[0];
          const existingProfile = existingUser.profile || {};
          
          // Merge application data into profile
          const mergedProfile = {
            ...existingProfile,
            ...applicationData,
            // Preserve important user fields
            email: existingProfile.email || userEmail,
            fullName: existingProfile.fullName || fullName,
            displayName: existingProfile.displayName || fullName,
            // Add application info
            applicationType: applicationType || existingProfile.applicationType,
            applicationStatus: status || existingProfile.applicationStatus,
            applicationData: applicationData,
            // Update timestamps
            lastUpdated: now,
            updatedAt: now
          };

          await postgres.query(
            `UPDATE users 
             SET profile = $1, 
                 application_type = COALESCE($2, application_type),
                 application_submitted_at = COALESCE($3::timestamptz, application_submitted_at),
                 application_reviewed_at = COALESCE($4::timestamptz, application_reviewed_at),
                 status = COALESCE($5, status),
                 updated_at = now()
             WHERE id = $6`,
            [mergedProfile, applicationType, submittedAt, reviewedAt, status, existingUser.id]
          );

          console.log(`   ✅ Updated user with application: ${userEmail} (from user_applications doc: ${applicationId})`);
          migratedCount++;
        } else {
          // Create new user from application data
          const userDbId = userId.startsWith('user_') ? userId : `user_${userId}`;
          const userEmailLower = userEmail.toLowerCase();
          
          // Generate a temporary password if not provided
          const tempPassword = data.password || `TempUser${Math.random().toString(36).slice(2, 8)}!`;
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          const profile = {
            ...applicationData,
            fullName: fullName,
            displayName: fullName,
            email: userEmailLower,
            applicationType: applicationType,
            applicationStatus: status,
            applicationData: applicationData,
            createdAt: createdAt || now,
            joinedDate: createdAt || now,
            isActive: true,
            lastUpdated: now,
            updatedAt: now
          };

          await postgres.query(
            `INSERT INTO users (id, full_name, email, password_hash, profile, role, status, application_type, application_submitted_at, application_reviewed_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 2, COALESCE($6, 'pending'), $7, COALESCE($8::timestamptz, now()), $9, COALESCE($10::timestamptz, now()), COALESCE($11::timestamptz, now()))
             ON CONFLICT (email) DO UPDATE SET
               profile = $5,
               application_type = COALESCE($7, users.application_type),
               application_submitted_at = COALESCE($8::timestamptz, users.application_submitted_at),
               application_reviewed_at = COALESCE($9::timestamptz, users.application_reviewed_at),
               status = COALESCE($6, users.status),
               updated_at = now()`,
            [userDbId, fullName, userEmailLower, passwordHash, profile, status, applicationType, submittedAt, reviewedAt, createdAt, updatedAt]
          );

          console.log(`   ✅ Created user from application: ${userEmail} (from user_applications doc: ${applicationId})`);
          if (!data.password) {
            console.log(`      ⚠️  Temporary password generated - user should reset password`);
          }
          migratedCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error migrating user application ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'user_applications', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  User applications collection not found in Firestore');
    } else {
      console.error('   ❌ Error accessing user_applications collection:', err.message);
      errorCount++;
      errors.push({ collection: 'user_applications', docId: 'N/A', error: err.message });
    }
  }
}

async function migrateAdmin() {
  console.log('\n👑 Migrating admins collection to users table...');
  const db = getFirestore();
  const bcrypt = require('bcrypt');
  
  try {
    const adminRef = db.collection('admins');
    const snapshot = await adminRef.get();

    if (snapshot.empty) {
      console.log('   ℹ️  No admins documents found in Firestore');
      return;
    }

    console.log(`   📋 Found ${snapshot.size} admins documents`);

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const adminId = doc.id;

        // Extract common fields to find matching user
        const email = data.email || data.userEmail || data.user_email || data.profile?.email || null;
        const uid = data.uid || data.userId || data.user_id || adminId || null;
        
        if (!email && !uid) {
          console.log(`   ⚠️  Skipping admin document ${adminId}: no email or uid found`);
          continue;
        }

        // Find existing user by email or uid
        let userResult;
        if (email) {
          userResult = await postgres.query('SELECT id, email, profile FROM users WHERE email = $1', [email.toLowerCase()]);
        }
        
        if ((!userResult || userResult.rows.length === 0) && uid) {
          // Try to find by uid in profile or id
          userResult = await postgres.query(
            'SELECT id, email, profile FROM users WHERE id = $1 OR profile->>\'uid\' = $2 OR profile->>\'firebaseUid\' = $2',
            [uid, uid]
          );
        }

        const now = new Date().toISOString();
        const adminData = JSON.parse(JSON.stringify(data));
        
        // Convert Firestore Timestamps to ISO strings
        Object.keys(adminData).forEach(key => {
          if (adminData[key] && typeof adminData[key] === 'object' && adminData[key].toDate) {
            adminData[key] = adminData[key].toDate().toISOString();
          }
        });

        if (userResult && userResult.rows.length > 0) {
          // Update existing user
          const existingUser = userResult.rows[0];
          const existingProfile = existingUser.profile || {};
          
          // Merge admin data into profile
          const mergedProfile = {
            ...existingProfile,
            ...adminData,
            // Preserve important user fields
            email: existingProfile.email || email || existingUser.email,
            fullName: existingProfile.fullName || adminData.fullName || adminData.displayName || existingProfile.displayName,
            displayName: existingProfile.displayName || adminData.displayName || adminData.fullName || existingProfile.fullName,
            // Mark as admin
            isAdmin: true,
            adminData: adminData,
            // Update timestamps
            lastUpdated: now,
            updatedAt: now
          };

          await postgres.query(
            `UPDATE users 
             SET role = 0, 
                 profile = $1, 
                 updated_at = now()
             WHERE id = $2`,
            [mergedProfile, existingUser.id]
          );

          console.log(`   ✅ Updated user to admin: ${existingUser.email || existingUser.id} (from admins doc: ${adminId})`);
          migratedCount++;
        } else {
          // Create new user from admin data
          const userId = uid && uid.startsWith('user_') ? uid : `user_${uid || adminId}`;
          const fullName = adminData.fullName || adminData.displayName || adminData.name || 'Admin User';
          const userEmail = email || adminData.email || `${adminId}@admin.local`;
          
          // Generate a temporary password if not provided
          const tempPassword = adminData.password || `TempAdmin${Math.random().toString(36).slice(2, 8)}!`;
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          const profile = {
            ...adminData,
            fullName: fullName,
            displayName: fullName,
            email: userEmail,
            createdAt: adminData.createdAt || now,
            joinedDate: adminData.joinedDate || adminData.createdAt || now,
            isActive: true,
            status: 'active',
            isAdmin: true,
            adminData: adminData,
            lastUpdated: now,
            updatedAt: now
          };

          await postgres.query(
            `INSERT INTO users (id, full_name, email, password_hash, profile, role, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 0, 'active', now(), now())
             ON CONFLICT (email) DO UPDATE SET
               role = 0,
               profile = $5,
               updated_at = now()`,
            [userId, fullName, userEmail.toLowerCase(), passwordHash, profile]
          );

          console.log(`   ✅ Created admin user: ${userEmail} (from admins doc: ${adminId})`);
          if (!adminData.password) {
            console.log(`      ⚠️  Temporary password generated - user should reset password`);
          }
          migratedCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error migrating admin document ${doc.id}:`, err.message);
        errorCount++;
        errors.push({ collection: 'admins', docId: doc.id, error: err.message });
      }
    }
  } catch (err) {
    if (err.message.includes('not found') || err.code === 5) {
      console.log('   ℹ️  Admins collection not found in Firestore');
    } else {
      console.error('   ❌ Error accessing admins collection:', err.message);
      errorCount++;
      errors.push({ collection: 'admins', docId: 'N/A', error: err.message });
    }
  }
}

async function migrateAllCollections() {
  console.log('🚀 Starting Firestore to PostgreSQL migration...\n');
  console.log('📋 Configuration:');
  console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - Firebase Auth: ${process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log('');

  // Verify PostgreSQL connection
  try {
    await postgres.query('SELECT 1');
    console.log('✅ PostgreSQL connection successful\n');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('\nPlease ensure DATABASE_URL is set in your .env file');
    process.exit(1);
  }

  // Verify Firestore connection
  try {
    const db = getFirestore();
    await db.collection('_test').limit(1).get();
    console.log('✅ Firestore connection successful\n');
  } catch (err) {
    console.error('❌ Firestore connection failed:', err.message);
    console.error('\nPlease ensure FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS is set');
    process.exit(1);
  }

  // Run migrations
  await migrateAdminContent();
  await migrateStatisticsItems();
  await migrateUsers();
  await migrateActivities();
  await migrateTrustedUsers();
  await migrateUntrustedUsers();
  await migratePaymentPlaceSubmissions();
  await migrateUserApplications();
  await migrateAdmin();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully migrated: ${migratedCount} items`);
  console.log(`❌ Errors: ${errorCount} items`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.collection}/${err.docId}: ${err.error}`);
    });
  }

  console.log('\n✨ Migration completed!');
  process.exit(errorCount > 0 ? 1 : 0);
}

// Run migration
migrateAllCollections().catch(err => {
  console.error('\n❌ Fatal error during migration:', err);
  process.exit(1);
});

