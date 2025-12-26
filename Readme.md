# 🚀 Kafka Backend - Node.js

Backend مبني بـ Node.js مع Apache Kafka لمشروع Flutter Platform.

## 📋 المتطلبات

- Node.js (v18 أو أحدث) ✅ منصب عندك
- Kafka & Zookeeper (اختياري للتطوير)
- VS Code ✅ منصب عندك

## 🎯 الـ Architecture

```
Producers (API) → Kafka Broker → Consumers (Services)
     ↓                               ↓
  REST API                    Notifications
                              Analytics
```

## 📦 التثبيت

### 1. نصب الـ Dependencies

```bash
npm install
```

### 2. إعداد Kafka (اختياري - للمرحلة الأولى)

يمكنك تشغيل المشروع بدون Kafka في البداية للتجربة، أو نصب Kafka بـ Docker:

```bash
# إذا عندك Docker
docker-compose up -d
```

**ملاحظة:** إذا ما عندك Kafka، المشروع راح يشتغل لكن راح تشوف errors في الـ console. لا تقلق، هذا طبيعي في البداية.

## 🚀 تشغيل المشروع

### Development Mode (مع auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

السيرفر راح يشتغل على: **http://localhost:3000**

## 📡 API Endpoints

### Authentication

#### تسجيل مستخدم جديد
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "password": "password123"
}
```

#### تسجيل دخول
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "ahmed@example.com",
  "password": "password123"
}
```

#### تحديث الملف الشخصي
```bash
PUT http://localhost:3000/api/auth/profile
Content-Type: application/json

{
  "userId": "user_123",
  "name": "Ahmed Updated",
  "email": "newemail@example.com"
}
```

### Requests Management

#### إنشاء Request جديد
```bash
POST http://localhost:3000/api/requests
Content-Type: application/json

{
  "userId": "user_123",
  "title": "طلب جديد",
  "description": "تفاصيل الطلب",
  "priority": "high"
}
```

#### تحديث Request
```bash
PUT http://localhost:3000/api/requests/req_123
Content-Type: application/json

{
  "userId": "user_123",
  "status": "in-progress"
}
```

#### إنهاء Request
```bash
DELETE http://localhost:3000/api/requests/req_123
Content-Type: application/json

{
  "userId": "user_123"
}
```

## 📊 Kafka Topics

المشروع يستخدم 4 Topics:

1. **user-events** - Login, Register, Profile Updates
2. **request-events** - Create, Update, Complete
````markdown
# 🚀 Kafka Backend - Node.js

This repository is a small Node.js backend originally built to work with a Flutter frontend and Apache Kafka. It now uses PostgreSQL for persistent user/auth data and provides JWT-based authentication with role-based access (guest, user, admin, superadmin).

This README covers installation, environment, database migrations & seeds, the authentication contract (register/login) and the lightweight user/profile API that supports lazy loading on the client.

## 🔧 Tech stack

- Node.js (>=18)
- Express
- PostgreSQL (JSONB for profile)
- bcrypt (password hashing)
- jsonwebtoken (JWT)
- kafka (optional for producers/consumers)

## Prerequisites

- Node.js and npm
- PostgreSQL (a running database and a connection URL)
- Optional: Docker (for Kafka if you use it)

## Quick setup

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file (or export env vars). Important variables:

```env
PORT=3000
DATABASE_URL=postgres://<user>:<pass>@localhost:5432/kafka_backend_db
JWT_SECRET=your_jwt_secret_here
KAFKA_BROKER=localhost:9092          # optional
KAFKA_CLIENT_ID=my-platform          # optional
```

3. Run database migrations (this project includes a small migration runner):

```bash
# ensure DATABASE_URL is set
node scripts/run-migrations.js
```

4. Run seed script to create initial users (admin + superadmin):

```bash
node scripts/seed-users.js
```

The seed creates two administrative accounts (if they don't exist):

- admin@trustedvalley.com / Test123456$
- superadmin@trustedvalley.com / Test123456$

Change those credentials after first login in production.

5. Start the server

Development (with nodemon if available):

```bash
npm run dev
```

Production

```bash
npm start
```

Server URL: http://localhost:3000 (default)

## Database note

This project requires `DATABASE_URL` to be set. If it is not set, auth-related operations will throw an error containing `postgres-required`.

## API: Authentication contract

All auth endpoints are under `/api/auth`.

### Register — POST /api/auth/register

Request body (example):

```json
{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

Behavior:
- Password policy: minimum 8 characters, at least one uppercase letter, and at least one special character. If the policy fails, the response includes `error: "weak-password"` and a human message.
- Requires `DATABASE_URL`.

Successful response (201):

```json
{
  "token": "<jwt token>",
  "user": {
    "id": "user_xxx",
    "email": "ahmed@example.com",
    "fullName": "Ahmed",
    "role": "user",
    "status": "pending",
    "isApproved": false,
    "profileImageUrl": "..."
  }
}
```

Note: the `user` object returned by register and login is intentionally minimal (top-level fields only). The full profile is available at the lazy endpoints below.

### Login — POST /api/auth/login

Request body:

```json
{
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

Successful response (200):

```json
{
  "token": "<jwt token>",
  "user": {
    "id": "user_xxx",
    "email": "ahmed@example.com",
    "fullName": "Ahmed",
    "role": "user",
    "status": "pending",
    "isApproved": false
  }
}
```

If credentials are wrong, responses include `error: "user-not-found"` (404) or `error: "wrong-password"` (401).

## User / profile lazy endpoints

These endpoints require `Authorization: Bearer <token>` and are mounted under `/api/users`.

- GET /api/users/me/profile — full profile JSON (JSONB stored in DB)
- GET /api/users/me/contact — contact subset (phone/email visibility)
- GET /api/users/me/verification — verification flags (emailVerified, phoneVerified)
- GET /api/users/me/services — services/payment methods/moneyTransfer info

Example header:

```http
Authorization: Bearer <token>
```

These endpoints return pruned JSON with empty/null fields removed so the client gets a compact payload.

## Admin endpoints

Admin routes are under `/api/auth/admin` and require an admin or superadmin token.

- GET /api/auth/admin/users — list users (limit/offset query)
- GET /api/auth/admin/users/:id — get user by id
- PUT /api/auth/admin/users/:id — update user (role/status/profile)

## Requests endpoints

Basic request creation/updating lives under `/api/requests` (examples exist in the earlier README content and in `test/test_api.js`).

## Tests / smoke checks

Run the quick smoke script used during development:

```bash
node test/test_api.js
```

It exercises health, register, login, and a simple create request flow.

## Troubleshooting

- If you see `postgres-required` errors: make sure `DATABASE_URL` is exported.
- If port 3000 is in use: change `PORT` in `.env` or kill the other process (`lsof -i :3000`).
- If migrations fail: check your Postgres user permissions and that the database exists.

## Next improvements (ideas)

- Add integration tests asserting the auth JSON contract.
- Add rate-limiting and audit logs for admin endpoints.
- Add role management UI or an admin CLI.

## Helpful commands recap

```bash
# install
npm install

# run migrations (requires DATABASE_URL)
node scripts/run-migrations.js

# seed users (create admin & superadmin)
node scripts/seed-users.js

# run smoke tests
node test/test_api.js

# start server
npm run dev   # dev
npm start     # prod
```

---

If you'd like, I can also add a short `docs/` folder with example Postman/Thunder requests and a small integration test that asserts the register/login response shapes. Want me to add that now?

````