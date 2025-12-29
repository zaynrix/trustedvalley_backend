# 🚀 Kafka Backend - Node.js

A Node.js backend built to work with a Flutter frontend and Apache Kafka. It uses PostgreSQL for persistent user/auth data and provides JWT-based authentication with role-based access control (0: Admin, 1: Trusted User, 2: Common User, 3: Betrug User).

## 📋 Prerequisites

- Node.js (v18 or later)
- PostgreSQL (running database)
- Kafka & Zookeeper (optional for development)
- VS Code (recommended)

## 🔧 Tech Stack

- **Node.js** (>=18)
- **Express.js** - Web framework
- **PostgreSQL** - Database with JSONB for flexible data storage
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **kafkajs** - Kafka integration (optional)
- **i18next** - Internationalization (English, Arabic, German)
- **Firebase Admin SDK** - For Firestore migration

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file:

```env
PORT=3000
DATABASE_URL=postgres://<user>:<pass>@localhost:5432/kafka_backend_db
JWT_SECRET=your_jwt_secret_here
KAFKA_BROKER=localhost:9092          # optional
KAFKA_CLIENT_ID=my-platform          # optional

# Firebase (for migration)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
# OR
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 3. Run Database Migrations

```bash
npm run migrate
# or
node scripts/run-migrations.js
```

This creates all necessary tables:
- `users` - User accounts with profile data
- `admin_content` - Admin content documents
- `statistics_items` - Statistics items
- `activities` - User activities
- `untrusted_users` - Untrusted users
- `payment_place_submissions` - Payment submissions

### 4. Seed Initial Users

```bash
npm run seed
# or
node scripts/seed-users.js
```

Creates default admin accounts:
- `admin@trustedvalley.com` / `Test123456$`
- `superadmin@trustedvalley.com` / `Test123456$`

**⚠️ Change these credentials in production!**

### 5. Start the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Server runs on: **http://localhost:3000**

## 🌍 Internationalization (i18n)

The API supports **3 languages**:
- **English (en)** - Default
- **Arabic (ar)** - العربية
- **German (de)** - Deutsch

### Language Detection

The API detects language from:
1. Query parameter: `?lang=ar`
2. HTTP header: `Accept-Language: de`
3. Cookie: `i18next=ar`

**Example:**
```bash
curl "http://localhost:3000/api/auth/login?lang=ar" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

All error messages and responses are automatically translated based on the user's language preference.

## 📡 API Endpoints

### 🔐 Authentication

#### Register - POST `/api/auth/register`
Register a new user account.

```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "password": "Password123!",
  "phoneNumber": "optional",
  "location": "optional",
  "services": ["service1", "service2"]
}
```

**Response (201):**
```json
{
  "token": "<jwt_token>",
  "user": {
    "id": "user_xxx",
    "email": "ahmed@example.com",
    "fullName": "Ahmed",
    "role": 2,
    "status": "pending"
  }
}
```

#### Login - POST `/api/auth/login`
Login with email and password.

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "token": "<jwt_token>",
  "user": {
    "id": "user_xxx",
    "email": "ahmed@example.com",
    "fullName": "Ahmed",
    "role": 2,
    "status": "pending"
  }
}
```

#### Get Profile - GET `/api/auth/profile`
Get current user's profile (requires authentication).

```bash
GET http://localhost:3000/api/auth/profile
Authorization: Bearer <token>
```

---

### 🔑 Password Management

#### Forgot Password - POST `/api/auth/password/forgot`
Request a password reset code (sent via email). Rate limited to once per 15 minutes.

```bash
POST http://localhost:3000/api/auth/password/forgot
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset code has been sent."
}
```

**Rate Limit:** Can only request once every 15 minutes. Returns `429` if rate limited.

#### Confirm Reset - POST `/api/auth/password/confirm`
Confirm reset with code and set new password.

```bash
POST http://localhost:3000/api/auth/password/confirm
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewPassword123!"
}
```

**Test Code:** Use `1232456` for testing (always works, no email required).

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

#### Change Password - POST `/api/auth/password/change`
Change own password (requires authentication and current password).

```bash
POST http://localhost:3000/api/auth/password/change
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Reset Password (Admin) - POST `/api/auth/password/reset`
Admin can reset any user's password (requires admin role).

```bash
POST http://localhost:3000/api/auth/password/reset
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "user@example.com",
  "newPassword": "NewPassword123!"
}
```

---

### 👤 User Profile Endpoints

All require `Authorization: Bearer <token>`.

#### Get Full Profile - GET `/api/users/me/profile`
Get complete user profile data.

```bash
GET http://localhost:3000/api/users/me/profile
Authorization: Bearer <token>
```

#### Get Contact Info - GET `/api/users/me/contact`
Get contact information subset.

```bash
GET http://localhost:3000/api/users/me/contact
Authorization: Bearer <token>
```

#### Get Verification Status - GET `/api/users/me/verification`
Get verification flags (email, phone, documents).

```bash
GET http://localhost:3000/api/users/me/verification
Authorization: Bearer <token>
```

#### Get Services - GET `/api/users/me/services`
Get services, payment methods, and money transfer info.

```bash
GET http://localhost:3000/api/users/me/services
Authorization: Bearer <token>
```

#### Get Raw Data - GET `/api/users/me/data`
Get raw stored profile with metadata.

```bash
GET http://localhost:3000/api/users/me/data
Authorization: Bearer <token>
```

---

### 👥 Admin Endpoints

All admin endpoints require `Authorization: Bearer <admin_token>` (role 0).

#### List Users - GET `/api/auth/admin/users`
Get paginated list of all users with essential fields.

```bash
GET http://localhost:3000/api/auth/admin/users?limit=50&offset=0
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `limit` (optional, default: 100) - Number of users
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "users": [
    {
      "id": "user_xxx",
      "email": "user@example.com",
      "fullName": "User Name",
      "phoneNumber": "009725666565365",
      "location": "Gaza",
      "services": ["Mobile Development", "Web Development"],
      "role": 2,
      "status": "active",
      "applicationStatus": "pending",
      "appliedDate": "2024-01-01T00:00:00.000Z",
      "isTrustedUser": false,
      "isActive": true,
      "isApproved": true,
      "verification": {
        "emailVerified": true,
        "phoneVerified": true
      }
    }
  ]
}
```

#### Get User by ID - GET `/api/auth/admin/users/:id`
Get full details of a specific user.

```bash
GET http://localhost:3000/api/auth/admin/users/user_123
Authorization: Bearer <admin_token>
```

#### Create User - POST `/api/auth/admin/users`
Create a new user (including other admins).

```bash
POST http://localhost:3000/api/auth/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "SecurePassword123!",
  "role": 0,
  "status": "active"
}
```

**Role Options:**
- `0` - Admin
- `1` - Trusted User
- `2` - Common User (default)
- `3` - Betrug User

#### Update User - PUT `/api/auth/admin/users/:id`
Update user (role, status, profile).

```bash
PUT http://localhost:3000/api/auth/admin/users/user_123
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": 1,
  "status": "active",
  "fullName": "Updated Name"
}
```

#### Delete User - DELETE `/api/auth/admin/users/:id`
Delete a user.

```bash
DELETE http://localhost:3000/api/auth/admin/users/user_123
Authorization: Bearer <admin_token>
```

---

### 📄 Content Endpoints

#### Get Home Content - GET `/api/content/home`
Get home page content.

```bash
GET http://localhost:3000/api/content/home
```

#### Get Statistics - GET `/api/content/statistics`
Get all statistics items.

```bash
GET http://localhost:3000/api/content/statistics
```

#### Get Statistics Item - GET `/api/content/statistics/:id`
Get a specific statistics item.

```bash
GET http://localhost:3000/api/content/statistics/stat_123
```

**Admin Only - Content Management:**

#### Create/Update Home Content - POST `/api/content/home`
```bash
POST http://localhost:3000/api/content/home
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Welcome",
  "content": "..."
}
```

#### Create Statistics Item - POST `/api/content/statistics`
```bash
POST http://localhost:3000/api/content/statistics
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "label": "Total Users",
  "value": "1000"
}
```

#### Update Statistics Item - PUT `/api/content/statistics/:id`
```bash
PUT http://localhost:3000/api/content/statistics/stat_123
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "value": "1500"
}
```

#### Delete Statistics Item - DELETE `/api/content/statistics/:id`
```bash
DELETE http://localhost:3000/api/content/statistics/stat_123
Authorization: Bearer <admin_token>
```

---

### 📝 Requests Endpoints

#### Create Request - POST `/api/requests`
```bash
POST http://localhost:3000/api/requests
Content-Type: application/json

{
  "userId": "user_123",
  "title": "New Request",
  "description": "Request details",
  "priority": "high"
}
```

#### List Requests - GET `/api/requests`
```bash
GET http://localhost:3000/api/requests
```

---

## 🔄 Database Migrations

### Run All Migrations
```bash
npm run migrate
```

### Migrate from Firestore
```bash
npm run migrate:firestore
```

This migrates data from Firebase Firestore to PostgreSQL:
- `admin_content` → `admin_content` table
- `statistics_items` → `statistics_items` table
- `users` → `users` table
- `trusted_users` → merged into `users` table (role=1)
- `user_applications` → merged into `users` table
- `activities` → `activities` table
- `untrusted_users` → `untrusted_users` table
- `payment_place_submissions` → `payment_place_submissions` table
- `admins` → merged into `users` table (role=0)

## 🛠️ Utility Scripts

### Add Admin User
```bash
npm run add-admin <email> <password> <name>
# Example:
npm run add-admin admin@example.com SecurePass123! "Admin Name"
```

### Reset User Password
```bash
npm run reset-password <email> <new_password>
# Example:
npm run reset-password user@example.com NewPassword123!
```

### Remove All Admins
```bash
npm run remove-admins
```

## 📊 Role System

Users have numeric roles:
- **0** - Admin (full access)
- **1** - Trusted User
- **2** - Common User (default)
- **3** - Betrug User

## 🌐 Translation Support

All API responses support translations. See [TRANSLATION_GUIDE.md](./TRANSLATION_GUIDE.md) for details.

**Supported Languages:**
- English (en) - Default
- Arabic (ar)
- German (de)

## 📚 Documentation

- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Complete API documentation
- [TRANSLATION_GUIDE.md](./TRANSLATION_GUIDE.md) - Translation guide
- [FIRESTORE_MIGRATION.md](./FIRESTORE_MIGRATION.md) - Firestore migration guide
- [HOW_TO_ADD_ADMIN.md](./HOW_TO_ADD_ADMIN.md) - Admin user management
- [HOW_TO_RESET_PASSWORD.md](./HOW_TO_RESET_PASSWORD.md) - Password reset guide

## 🧪 Testing

Run smoke tests:
```bash
node test/test_api.js
```

## 🐛 Troubleshooting

- **`postgres-required` errors:** Ensure `DATABASE_URL` is set in `.env`
- **Port 3000 in use:** Change `PORT` in `.env` or kill the process: `lsof -i :3000`
- **Migration errors:** Check PostgreSQL permissions and database exists
- **Translation not working:** Ensure `i18next` middleware is loaded before routes

## 🚀 Deployment

**Note:** GitHub Pages only hosts static websites. For Node.js APIs, consider:
- **Heroku** - Easy deployment
- **Railway** - Simple setup
- **Render** - Free tier available
- **Vercel** - Serverless functions
- **AWS/GCP/Azure** - Enterprise solutions

## 📝 License

ISC

## 👥 Contributors

- Initial setup and development

---

For detailed API documentation, see [API_ENDPOINTS.md](./API_ENDPOINTS.md)
