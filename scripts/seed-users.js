require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Cannot run seed.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    const now = new Date().toISOString();
      const sampleEmail = process.env.SEED_USER_EMAIL || 'ahmed@test.com';
      const samplePassword = process.env.SEED_USER_PASSWORD || 'Password123!';

      // Admin users to create
      // Role mapping: 0=admin, 1=trusted, 2=common, 3=betrug
      const admins = [
        { email: process.env.SEED_ADMIN_EMAIL || 'admin@trustedvalley.com', password: process.env.SEED_ADMIN_PASSWORD || 'Test123456$', role: 0, fullName: 'Admin User' },
        { email: process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@trustedvalley.com', password: process.env.SEED_SUPERADMIN_PASSWORD || 'Test123456$', role: 0, fullName: 'Super Admin' }
      ];
      const bcrypt = require('bcrypt');

    // Ensure primary seed user
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [sampleEmail]);
    if (exists.rows.length > 0) {
      console.log('Seed user already exists, updating password (if needed):', sampleEmail);
      const passwordHash = await bcrypt.hash(samplePassword, 10);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE email = $3', [passwordHash, now, sampleEmail]);
      console.log('Seed user password updated');
    } else {
      const profile = {
        fullName: 'Seed User',
        displayName: 'Seed User',
        email: sampleEmail,
        createdAt: now,
        joinedDate: now,
        isActive: true,
        status: 'pending'
      };
      const id = `user_${Math.random().toString(36).slice(2, 10)}`;
      const passwordHash = await bcrypt.hash(samplePassword, 10);
      await pool.query(
        `INSERT INTO users (id, full_name, email, password_hash, phone_number, additional_phone, location, services, service_payment_methods, reference_number, money_transfer_services, profile, role, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [id, 'Seed User', sampleEmail, passwordHash, null, null, null, null, null, null, null, profile, 2, 'pending', now, now]
      );
      console.log('Seed user inserted:', sampleEmail);
    }

    // Ensure admin and superadmin users
    for (const a of admins) {
      const row = await pool.query('SELECT id FROM users WHERE email = $1', [a.email]);
      if (row.rows.length > 0) {
        console.log('Seed user already exists:', a.email);
        // ensure role is correct
        await pool.query('UPDATE users SET role = $1, updated_at = $2 WHERE email = $3', [a.role, now, a.email]);
        continue;
      }
      const id = `user_${Math.random().toString(36).slice(2, 10)}`;
      const passwordHash = await bcrypt.hash(a.password, 10);
      const profile = { fullName: a.fullName, displayName: a.fullName, email: a.email, createdAt: now, joinedDate: now, isActive: true, status: 'active' };
      await pool.query(
        `INSERT INTO users (id, full_name, email, password_hash, profile, role, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, a.fullName, a.email, passwordHash, profile, a.role, 'active', now, now]
      );
      console.log('Seed admin inserted:', a.email, 'role:', a.role);
    }

    await pool.end();
    process.exit(0);

    const profile = {
      fullName: 'Seed User',
      displayName: 'Seed User',
      email: sampleEmail,
      createdAt: now,
      joinedDate: now,
      isActive: true,
      status: 'pending'
    };

    const id = `user_${Math.random().toString(36).slice(2, 10)}`;
  const passwordHash = await bcrypt.hash(samplePassword, 10);

  await pool.query(
      `INSERT INTO users (id, full_name, email, password_hash, phone_number, additional_phone, location, services, service_payment_methods, reference_number, money_transfer_services, profile, role, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, 'Seed User', sampleEmail, passwordHash, null, null, null, null, null, null, null, profile, 'user', 'pending', now, now]
    );

    console.log('Seed user inserted:', sampleEmail);
  // unreachable
  } catch (err) {
    console.error('Seeding error:', err);
    await pool.end();
    process.exit(1);
  }
}

run();
