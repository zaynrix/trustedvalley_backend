# 👑 How to Add an Admin User

There are several ways to add an admin user to your system. Choose the method that works best for you.

## 📋 Role System

**Role Numbers:**
- `0` = Admin
- `1` = Trusted User
- `2` = Common User (default)
- `3` = Betrug User

---

## Method 1: Using Seed Script (Recommended for Initial Setup)

The seed script creates default admin users automatically.

### Step 1: Configure Admin Credentials (Optional)

Edit your `.env` file to set custom admin credentials:

```env
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=YourSecurePassword123!
SEED_SUPERADMIN_EMAIL=superadmin@yourdomain.com
SEED_SUPERADMIN_PASSWORD=YourSecurePassword123!
```

### Step 2: Run Seed Script

```bash
npm run seed
```

This creates:
- `admin@trustedvalley.com` (or your custom email) with role `0`
- `superadmin@trustedvalley.com` (or your custom email) with role `0`

**Default passwords:** `Test123456$` (if not customized)

---

## Method 2: Using Admin API Endpoint (Requires Existing Admin)

If you already have an admin account, you can promote any user to admin via the API.

### Step 1: Login as Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@trustedvalley.com",
    "password": "Test123456$"
  }'
```

Save the `token` from the response.

### Step 2: Update User Role to Admin

```bash
curl -X PUT http://localhost:3000/api/auth/admin/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "role": 0
  }'
```

Replace:
- `USER_ID` - The ID of the user you want to make admin
- `YOUR_ADMIN_TOKEN` - The JWT token from step 1

---

## Method 3: Direct SQL (Quick Method)

Connect to your PostgreSQL database and run:

```sql
-- Option A: Update existing user to admin
UPDATE users 
SET role = 0, updated_at = now() 
WHERE email = 'user@example.com';

-- Option B: Create new admin user directly
INSERT INTO users (
  id, 
  full_name, 
  email, 
  password_hash, 
  role, 
  status, 
  created_at, 
  updated_at,
  profile
) VALUES (
  'user_' || substr(md5(random()::text), 1, 10),
  'Admin Name',
  'newadmin@example.com',
  '$2b$10$YOUR_BCRYPT_HASH_HERE',  -- Generate with: node -e "console.log(require('bcrypt').hashSync('YourPassword123!', 10))"
  0,  -- Admin role
  'active',
  now(),
  now(),
  '{"fullName": "Admin Name", "email": "newadmin@example.com"}'::jsonb
);
```

### Generate Password Hash

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword123!', 10).then(hash => console.log(hash));"
```

---

## Method 4: Register + Update (Two-Step Process)

### Step 1: Register a Regular User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Admin",
    "email": "newadmin@example.com",
    "password": "SecurePassword123!"
  }'
```

### Step 2: Update Role to Admin

Use Method 2 (Admin API) or Method 3 (SQL) to change the role from `2` to `0`.

---

## Method 5: Create Admin Script

Create a simple script to add admins:

```bash
# Create file: scripts/add-admin.js
```

```javascript
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
```

### Usage:

```bash
node scripts/add-admin.js admin@example.com SecurePassword123! "Admin Name"
```

---

## 🔍 Verify Admin User

### Check via API

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Check admin endpoint (requires admin token)
curl http://localhost:3000/api/auth/admin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check via Database

```sql
SELECT id, email, role, status FROM users WHERE role = 0;
```

---

## 📝 Quick Reference

| Method | When to Use | Requirements |
|--------|-------------|--------------|
| **Seed Script** | Initial setup | None |
| **Admin API** | Promoting users | Existing admin account |
| **Direct SQL** | Quick manual add | Database access |
| **Register + Update** | Creating new admin | Existing admin or SQL access |
| **Add Admin Script** | Automated creation | Node.js |

---

## ⚠️ Security Notes

1. **Change Default Passwords**: Always change default admin passwords in production
2. **Use Strong Passwords**: Minimum 8 characters, uppercase, special character
3. **Limit Admin Access**: Only create admin accounts for trusted users
4. **Rotate Credentials**: Regularly update admin passwords
5. **Audit Logs**: Keep track of who has admin access

---

## 🆘 Troubleshooting

### "Forbidden: insufficient role"
- User doesn't have role `0`
- Check role with: `SELECT email, role FROM users WHERE email = 'user@example.com';`

### "User not found"
- User doesn't exist
- Create user first using registration or seed script

### "Email already exists"
- User already exists
- Use update method instead of create

---

## 📚 Related Documentation

- [API Endpoints](./API_ENDPOINTS.md) - Full API documentation
- [Role System](./Readme.md) - Role-based access control

