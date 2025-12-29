require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function resetPassword(email, newPassword) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-password.js <email> <newPassword>');
    process.exit(1);
  }

  // Password policy validation
  const passwordPolicy = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
  if (!passwordPolicy.test(newPassword)) {
    console.error('❌ Password must be at least 8 characters long and include at least one uppercase letter and one special character');
    process.exit(1);
  }

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (userResult.rows.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      await pool.end();
      process.exit(1);
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE email = $2',
      [passwordHash, email.toLowerCase()]
    );

    console.log(`✅ Password reset successfully for: ${email}`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting password:', err.message);
    await pool.end();
    process.exit(1);
  }
}

// Get arguments from command line
const email = process.argv[2];
const newPassword = process.argv[3];

resetPassword(email, newPassword);

