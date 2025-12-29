require('dotenv').config();
const { Pool } = require('pg');

async function removeAllAdmins() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Find all admin users
    const result = await pool.query(`
      SELECT id, email, role 
      FROM users 
      WHERE role = 0
    `);

    if (result.rows.length === 0) {
      console.log('ℹ️  No admin users found');
      await pool.end();
      process.exit(0);
    }

    console.log(`⚠️  Found ${result.rows.length} admin user(s) to remove:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.email} (${row.id})`);
    });

    // Delete all admins
    const deleteResult = await pool.query(`
      DELETE FROM users 
      WHERE role = 0
      RETURNING email
    `);

    console.log(`\n✅ Removed ${deleteResult.rows.length} admin user(s):`);
    deleteResult.rows.forEach(row => {
      console.log(`   - ${row.email}`);
    });

    console.log('\n📝 You can now add a new admin manually using:');
    console.log('   npm run add-admin email@example.com Password123! "Admin Name"');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

removeAllAdmins();

