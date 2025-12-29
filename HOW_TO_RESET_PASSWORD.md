# 🔐 How to Reset Password

Multiple methods are available to reset user passwords. Choose the one that fits your needs.

## 📋 Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one special character

---

## Method 1: Using Reset Password Script (Easiest)

### Quick Reset

```bash
npm run reset-password user@example.com NewPassword123!
```

Or directly:
```bash
node scripts/reset-password.js user@example.com NewPassword123!
```

**Example:**
```bash
node scripts/reset-password.js majed@gmail.com SecurePassword123!
```

✅ **Pros:** Fast, no authentication needed  
⚠️ **Cons:** Requires command-line access

---

## Method 2: Using Admin API Endpoint

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

### Step 2: Reset User Password

```bash
curl -X POST http://localhost:3000/api/auth/password/reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "user@example.com",
    "newPassword": "NewPassword123!"
  }'
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

✅ **Pros:** Can be done via API, good for automation  
⚠️ **Cons:** Requires admin authentication

---

## Method 3: User Changes Own Password

Users can change their own password if they know their current password.

### Step 1: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "CurrentPassword123!"
  }'
```

Save the `token`.

### Step 2: Change Password

```bash
curl -X POST http://localhost:3000/api/auth/password/change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "currentPassword": "CurrentPassword123!",
    "newPassword": "NewPassword123!"
  }'
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

✅ **Pros:** Self-service, secure  
⚠️ **Cons:** Requires current password

---

## Method 4: Using Admin API to Update User

You can also update a user's password via the admin user update endpoint.

### Step 1: Login as Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@trustedvalley.com",
    "password": "Test123456$"
  }'
```

### Step 2: Get User ID

```bash
curl http://localhost:3000/api/auth/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Find the user's `id` from the response.

### Step 3: Update User Password

```bash
curl -X PUT http://localhost:3000/api/auth/admin/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "password": "NewPassword123!"
  }'
```

✅ **Pros:** Part of user management API  
⚠️ **Cons:** Requires user ID lookup

---

## Method 5: Direct SQL (Quick Manual Reset)

Connect to PostgreSQL and run:

```sql
-- Generate password hash first (see below)
UPDATE users 
SET password_hash = '$2b$10$YOUR_BCRYPT_HASH_HERE', 
    updated_at = now() 
WHERE email = 'user@example.com';
```

### Generate Password Hash

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword123!', 10).then(hash => console.log(hash));"
```

Or using the script:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword123!', 10).then(hash => console.log(hash));"
```

✅ **Pros:** Direct database access  
⚠️ **Cons:** Requires database access, manual hash generation

---

## 📊 Comparison Table

| Method | Speed | Requires Auth | Best For |
|--------|-------|---------------|----------|
| **Script** | ⚡ Fastest | ❌ No | Quick resets, automation |
| **Admin API** | ⚡ Fast | ✅ Admin | API integration |
| **User Change** | ⚡ Fast | ✅ User | Self-service |
| **Admin Update** | ⚡ Fast | ✅ Admin | User management |
| **SQL** | ⚡ Fastest | ❌ No | Emergency, direct access |

---

## 🔍 Verify Password Reset

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "NewPassword123!"
  }'
```

If successful, you'll receive a token.

---

## 🆘 Troubleshooting

### "weak-password" Error

**Solution:** Ensure password meets requirements:
- At least 8 characters
- At least one uppercase letter (A-Z)
- At least one special character (!@#$%^&*)

**Example valid passwords:**
- ✅ `Password123!`
- ✅ `SecurePass@2024`
- ❌ `password123` (no uppercase, no special char)
- ❌ `PASS123!` (too short)

### "user-not-found" Error

**Solution:** Check if email exists:
```sql
SELECT email FROM users WHERE email = 'user@example.com';
```

### "Forbidden: Admin access required"

**Solution:** Use an admin account (role 0) or use the script method.

### "wrong-password" Error (when changing own password)

**Solution:** Verify the current password is correct.

---

## 📝 Examples

### Reset Password for Admin User

```bash
# Using script
npm run reset-password admin@trustedvalley.com NewAdminPass123!

# Using API (as another admin)
curl -X POST http://localhost:3000/api/auth/password/reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"email": "admin@trustedvalley.com", "newPassword": "NewAdminPass123!"}'
```

### Reset Password for User Created from Admins Collection

```bash
# Reset password for majed@gmail.com
npm run reset-password majed@gmail.com SecurePassword123!
```

---

## 🔒 Security Best Practices

1. **Use Strong Passwords**: Always use passwords that meet the policy
2. **Rotate Regularly**: Change passwords periodically
3. **Admin Only**: Only admins should reset other users' passwords
4. **Log Resets**: Consider logging password reset actions
5. **Secure Storage**: Never store passwords in plain text

---

## 📚 Related Documentation

- [How to Add Admin](./HOW_TO_ADD_ADMIN.md) - Admin management
- [API Endpoints](./API_ENDPOINTS.md) - Full API documentation

