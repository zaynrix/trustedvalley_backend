require('dotenv').config();
const { Pool } = require('pg');

async function fixAdminRoles() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Find all users that should be admins but aren't
    const result = await pool.query(`
      SELECT id, email, role, profile->>'isAdmin' as is_admin 
      FROM users 
      WHERE (
        email LIKE '%admin%' 
        OR email LIKE '%superadmin%' 
        OR profile->>'isAdmin' = 'true'
        OR profile->>'adminData' IS NOT NULL
      ) AND role != 0
    `);

    if (result.rows.length === 0) {
      console.log('✅ All admins already have role 0');
      await pool.end();
      process.exit(0);
    }

    console.log(`📋 Found ${result.rows.length} users that should be admins but have wrong role:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.email}: role ${row.role} → should be 0`);
    });

    // Update them to role 0
    const updateResult = await pool.query(`
      UPDATE users 
      SET role = 0, updated_at = now()
      WHERE (
        email LIKE '%admin%' 
        OR email LIKE '%superadmin%' 
        OR profile->>'isAdmin' = 'true'
        OR profile->>'adminData' IS NOT NULL
      ) AND role != 0
      RETURNING email, role
    `);

    console.log(`\n✅ Updated ${updateResult.rows.length} users to role 0 (admin):`);
    updateResult.rows.forEach(row => {
      console.log(`   - ${row.email}: now role ${row.role}`);
    });

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

fixAdminRoles();

