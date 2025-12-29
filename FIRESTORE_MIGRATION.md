# 🔄 Firestore to PostgreSQL Migration Guide

This guide explains how to migrate your data from Firestore (Firebase) to PostgreSQL.

## 📋 Prerequisites

1. **PostgreSQL Database** - Already set up and running
2. **Firebase Credentials** - Service account JSON or credentials file
3. **Database Migrations** - Run `npm run migrate` first to create tables

## 🔧 Setup

### 1. Configure Firebase Credentials

You need to set up Firebase authentication. Choose one of these methods:

#### Option A: Service Account JSON (Environment Variable)
Add to your `.env` file:
```env
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

#### Option B: Service Account File
1. Download your Firebase service account JSON file
2. Add to your `.env` file:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```

### 2. Ensure PostgreSQL Tables Exist

Run the database migrations first:
```bash
npm run migrate
```

This creates the following tables:
- `admin_content` - For admin content documents
- `statistics_items` - For statistics items
- `users` - For user accounts (includes trusted users and user applications)
- `activities` - For user activities
- `untrusted_users` - For untrusted users
- `payment_place_submissions` - For payment place submissions

## 🚀 Running the Migration

### Basic Migration

```bash
npm run migrate:firestore
```

Or directly:
```bash
node scripts/migrate-firestore-to-postgres.js
```

### What Gets Migrated

The script migrates the following Firestore collections:

1. **admin_content Collection**
   - All documents in the `admin_content` collection
   - Examples: `home_content`, `about_content`, etc.
   - Stored as JSONB in PostgreSQL `admin_content` table

2. **Statistics Items**
   - Subcollection: `admin_content/statistics/items`
   - Migrated to `statistics_items` table with structured fields
   - Preserves: `id`, `label`, `description`, `value`, `orderIndex`, `isActive`

3. **Users Collection** (Optional)
   - All documents in the `users` collection
   - Migrated to `users` table
   - Handles password hashes, profiles, and user metadata
   - **Note**: If users don't have passwords in Firestore, temporary passwords are generated

4. **Trusted Users Collection**
   - All documents in the `trusted_users` collection
   - **Merged into `users` table** with role=1 (trusted user)
   - All data stored in user's profile JSONB field
   - Sets `trusted_added_at` timestamp

5. **User Applications Collection**
   - All documents in the `user_applications` collection
   - **Merged into `users` table** with application data
   - Stores `application_type`, `application_submitted_at`, `application_reviewed_at`
   - All data stored in user's profile JSONB field

6. **Activities Collection**
   - All documents in the `activities` collection
   - Stored in `activities` table as JSONB

7. **Untrusted Users Collection**
   - All documents in the `untrusted_users` collection
   - Stored in `untrusted_users` table

8. **Payment Place Submissions Collection**
   - All documents in the `payment_place_submissions` collection
   - Stored in `payment_place_submissions` table

9. **Admins Collection**
   - All documents in the `admins` collection
   - **Merged into `users` table** with role=0 (admin)
   - All data stored in user's profile JSONB field

## 📊 Migration Process

The script will:

1. ✅ Verify PostgreSQL connection
2. ✅ Verify Firestore connection
3. 📄 Migrate `admin_content` documents
4. 📊 Migrate statistics items
5. 👥 Migrate users (if collection exists)
6. ✅ Migrate `trusted_users` → merge into `users` table (role=1)
7. 📋 Migrate `user_applications` → merge into `users` table
8. 📝 Migrate `activities` collection
9. ❌ Migrate `untrusted_users` collection
10. 💳 Migrate `payment_place_submissions` collection
11. 👑 Migrate `admins` → merge into `users` table (role=0)
12. 📋 Display summary with success/error counts

### Example Output

```
🚀 Starting Firestore to PostgreSQL migration...

📋 Configuration:
   - DATABASE_URL: ✅ Set
   - Firebase Auth: ✅ Configured

✅ PostgreSQL connection successful
✅ Firestore connection successful

📄 Migrating admin_content collection...
   ✅ Migrated: home_content
   ✅ Migrated: about_content

📊 Migrating statistics items...
   ✅ Migrated statistics item: stat_1
   ✅ Migrated statistics item: stat_2

👥 Migrating users collection...
   📋 Found 150 users in Firestore
   ✅ Migrated user: user1@example.com (user_abc123)
   ✅ Migrated user: user2@example.com (user_def456)
   ⏭️  Skipping user user_xyz789 (already exists in PostgreSQL)

============================================================
📊 Migration Summary
============================================================
✅ Successfully migrated: 153 items
❌ Errors: 0 items

✨ Migration completed!
```

## ⚠️ Important Notes

### Duplicate Handling

- **admin_content**: Uses `ON CONFLICT` - updates existing documents
- **statistics_items**: Uses `ON CONFLICT` - updates existing items
- **users**: Updates existing users or creates new ones (checks by email or ID)
- **trusted_users**: Merges into `users` table - updates existing users or creates new ones
- **user_applications**: Merges into `users` table - updates existing users or creates new ones
- **admins**: Merges into `users` table - updates existing users or creates new ones

### Data Type Conversions

- **Firestore Timestamps** → PostgreSQL `TIMESTAMPTZ`
- **Firestore Maps** → PostgreSQL `JSONB`
- **Firestore Arrays** → PostgreSQL `JSONB`

### Password Migration

If users in Firestore don't have password hashes:
- Temporary passwords are generated
- Users will need to reset their passwords
- Check the migration output for warnings

### Date Handling

Firestore Timestamps are automatically converted to PostgreSQL timestamps. The script handles:
- Firestore Timestamp objects (`toDate()`)
- ISO string dates
- Missing dates (defaults to `now()`)

## 🔍 Troubleshooting

### Error: "Failed to initialize Firestore"

**Solution**: Ensure Firebase credentials are properly configured:
```bash
# Check if environment variable is set
echo $FIREBASE_SERVICE_ACCOUNT_JSON
# or
echo $GOOGLE_APPLICATION_CREDENTIALS
```

### Error: "PostgreSQL connection failed"

**Solution**: Verify `DATABASE_URL` is set in `.env`:
```bash
# Check .env file
cat .env | grep DATABASE_URL
```

### Error: "Collection not found"

**Solution**: This is normal if:
- The collection doesn't exist in Firestore
- You haven't created that type of data yet
- The script will skip it and continue

### Users Already Exist

If users already exist in PostgreSQL:
- The script will skip them (no duplicates)
- Check the output for "Skipping user..." messages

## 🔄 Re-running Migration

The migration script is **idempotent** - you can run it multiple times safely:

- Existing data will be **updated** (not duplicated)
- New data will be **inserted**
- The script handles conflicts gracefully

## 🔄 Merged Collections

### Trusted Users & User Applications

The `trusted_users` and `user_applications` collections are **merged into the `users` table** instead of being stored in separate tables. This provides:

- **Unified user management**: All user data in one place
- **Better queries**: Query users by role, application status, etc. in a single table
- **Simplified API**: No need to join multiple tables

**How it works:**
- `trusted_users` → Creates/updates users with `role=1` (trusted user)
- `user_applications` → Creates/updates users with application data in profile
- All original Firestore data is preserved in the `profile` JSONB field
- Additional fields like `application_type`, `application_submitted_at`, `trusted_added_at` are stored as separate columns for easy querying

**If you have existing data in `trusted_users` or `user_applications` tables:**
Run the migration script `006_merge_trusted_users_and_applications.sql` to merge existing data:
```bash
psql $DATABASE_URL -f sql/migrations/006_merge_trusted_users_and_applications.sql
```

## 📝 Custom Collections

To migrate additional Firestore collections, edit `scripts/migrate-firestore-to-postgres.js` and add new migration functions following the same pattern.

## 🧪 Testing

After migration, test your endpoints:

```bash
# Test content endpoints
curl http://localhost:3000/api/content/home
curl http://localhost:3000/api/content/statistics

# Test user endpoints (after login)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## 📚 Related Documentation

- [API Endpoints](./API_ENDPOINTS.md) - Full API documentation
- [README](./Readme.md) - Project setup guide
- [Supabase Setup](./SUPABASE_SETUP.md) - Cloud database setup

## 🆘 Need Help?

If you encounter issues:
1. Check the error messages in the migration output
2. Verify your Firebase credentials
3. Ensure PostgreSQL tables exist (`npm run migrate`)
4. Check the `.env` file configuration

