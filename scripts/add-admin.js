require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function addAdmin(email, password, fullName = 'Admin User') {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      // Update existing user to admin
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET role = 0, password_hash = $1, updated_at = now() WHERE email = $2',
        [passwordHash, email]
      );
      console.log(`✅ Updated ${email} to admin`);
    } else {
      // Create new admin user
      const id = `user_${Math.random().toString(36).slice(2, 10)}`;
      const passwordHash = await bcrypt.hash(password, 10);
      const profile = {
        fullName: fullName,
        displayName: fullName,
        email: email,
        createdAt: new Date().toISOString(),
        joinedDate: new Date().toISOString(),
        isActive: true,
        status: 'active'
      };
      
      await pool.query(
        `INSERT INTO users (id, full_name, email, password_hash, profile, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, 'active', now(), now())`,
        [id, fullName, email, passwordHash, profile]
      );
      console.log(`✅ Created admin user: ${email}`);
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

// Get arguments from command line
const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'Admin User';

if (!email || !password) {
  console.error('Usage: node scripts/add-admin.js <email> <password> [fullName]');
  process.exit(1);
}

addAdmin(email, password, fullName);
