# 🚀 Quick Start: Firebase to PostgreSQL Migration

## ✅ Correct Order of Operations

Follow these steps in order:

### 1️⃣ Set Up PostgreSQL Database (Already Done ✅)

```bash
# Create database (if not exists)
createdb kafka_backend_db

# Run migrations to create tables
npm run migrate

# Seed initial admin users (optional)
npm run seed
```

### 2️⃣ Configure Firebase Credentials (Do This Now!)

**Get your Firebase service account key:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings → Service Accounts
3. Click "Generate new private key"
4. Save the JSON file

**Add to `.env` file:**

**Option A - Environment Variable** (Recommended):
```env
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

**Option B - File Path** (Easier):
```env
GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json
```

**Then:**
```bash
# Copy your service account file to project root
cp ~/Downloads/firebase-service-account.json ./firebase-credentials.json

# Make sure it's in .gitignore (already added ✅)
```

### 3️⃣ Test Firebase Connection

```bash
# Quick test
node -e "
require('dotenv').config();
const { getFirestore } = require('./src/services/firestoreService');
(async () => {
  try {
    const db = getFirestore();
    await db.collection('_test').limit(1).get();
    console.log('✅ Firebase connected!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
"
```

### 4️⃣ Run Migration

```bash
npm run migrate:firestore
```

The script will:
- ✅ Verify PostgreSQL connection
- ✅ Verify Firestore connection  
- 📄 Migrate admin_content documents
- 📊 Migrate statistics items
- 👥 Migrate users (if exists)
- 📋 Show summary

### 5️⃣ Verify Migration

```bash
# Test content endpoints
curl http://localhost:3000/api/content/home
curl http://localhost:3000/api/content/statistics

# Test with a migrated user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-user@example.com","password":"password"}'
```

## 📋 Checklist

- [ ] PostgreSQL database created
- [ ] Database migrations run (`npm run migrate`)
- [ ] Firebase service account key downloaded
- [ ] Firebase credentials added to `.env`
- [ ] Firebase connection tested
- [ ] Migration script run (`npm run migrate:firestore`)
- [ ] Data verified via API endpoints

## 🆘 Common Issues

### "Firebase credentials NOT configured"
→ Follow Step 2 above - add credentials to `.env`

### "PostgreSQL connection failed"
→ Check `DATABASE_URL` in `.env` file

### "Permission denied" in Firebase
→ Check service account has Firestore permissions

## 📚 Detailed Guides

- [Firebase Setup Guide](./FIREBASE_SETUP.md) - Detailed Firebase configuration
- [Migration Guide](./FIRESTORE_MIGRATION.md) - Complete migration documentation

