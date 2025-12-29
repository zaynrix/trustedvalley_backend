# 🔥 Firebase Integration Setup Guide

Firebase is already integrated in this project! You just need to configure your Firebase credentials to connect to your Firestore database.

## ✅ What's Already Done

- ✅ Firebase Admin SDK installed (`firebase-admin` package)
- ✅ Firestore service configured (`src/services/firestoreService.js`)
- ✅ Migration script ready (`scripts/migrate-firestore-to-postgres.js`)

## 📋 Step-by-Step Setup

### Step 1: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **⚙️ Settings** icon → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. Save the JSON file (e.g., `firebase-service-account.json`)

**⚠️ Important**: Keep this file secure! Never commit it to Git.

### Step 2: Configure Firebase Credentials

You have **two options**:

#### Option A: Use Environment Variable (Recommended for Production)

1. Copy the entire JSON content from your service account file
2. Add to your `.env` file as a single-line JSON string:

```env
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Note**: Make sure to escape quotes and keep it as a single line.

#### Option B: Use File Path (Easier for Local Development)

1. Place your service account JSON file in a secure location:
   ```bash
   # Example: in project root (but NOT committed to Git)
   cp ~/Downloads/firebase-service-account.json ./firebase-credentials.json
   ```

2. Add to your `.env` file:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json
   ```

3. **Important**: Add to `.gitignore`:
   ```bash
   echo "firebase-credentials.json" >> .gitignore
   ```

### Step 3: Verify Firebase Connection

Test the connection:

```bash
# Create a simple test script
node -e "
require('dotenv').config();
const { getFirestore } = require('./src/services/firestoreService');
(async () => {
  try {
    const db = getFirestore();
    const testRef = db.collection('_test').limit(1);
    await testRef.get();
    console.log('✅ Firebase connection successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Firebase connection failed:', err.message);
    process.exit(1);
  }
})();
"
```

Or test with the migration script (it will verify connections first):

```bash
npm run migrate:firestore
```

## 🔍 Troubleshooting

### Error: "Failed to initialize Firestore"

**Check:**
1. Is `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` set?
   ```bash
   # Check your .env file
   cat .env | grep FIREBASE
   ```

2. Is the JSON valid?
   ```bash
   # Test JSON parsing
   node -e "JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)" 
   ```

3. Does the file path exist? (if using Option B)
   ```bash
   ls -la $GOOGLE_APPLICATION_CREDENTIALS
   ```

### Error: "Permission denied" or "Access denied"

**Solution**: 
- Make sure your service account has **Firestore** permissions
- In Firebase Console → IAM & Admin → check service account permissions
- Ensure the service account has at least **Cloud Datastore User** role

### Error: "Project not found"

**Solution**:
- Verify the `project_id` in your service account JSON matches your Firebase project
- Check that you're using the correct service account key

## 📝 Complete Setup Checklist

- [ ] Firebase project created/selected
- [ ] Service account key downloaded
- [ ] Credentials added to `.env` file (Option A or B)
- [ ] `.gitignore` updated (if using file path)
- [ ] Firebase connection tested
- [ ] PostgreSQL database set up (`npm run migrate`)
- [ ] Ready to run migration (`npm run migrate:firestore`)

## 🚀 Next Steps

Once Firebase is configured:

1. **Verify connection**:
   ```bash
   npm run migrate:firestore
   ```

2. **Check migration output** - Should show:
   - ✅ PostgreSQL connection successful
   - ✅ Firestore connection successful
   - Migration results

3. **Test your endpoints** after migration:
   ```bash
   curl http://localhost:3000/api/content/home
   ```

## 🔒 Security Best Practices

1. **Never commit** service account keys to Git
2. **Use environment variables** in production
3. **Restrict service account permissions** (least privilege)
4. **Rotate keys regularly**
5. **Use different keys** for development/production

## 📚 Related Documentation

- [Firestore Migration Guide](./FIRESTORE_MIGRATION.md) - How to migrate data
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Service Account Setup](https://firebase.google.com/docs/admin/setup#initialize-sdk)

