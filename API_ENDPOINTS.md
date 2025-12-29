# 📡 API Endpoints Summary

**Base URL:** `http://localhost:3000`

---

## 🔍 Health Check

### GET `/`
**Description:** Server health check  
**Authentication:** None  
**Response:**
```json
{
  "message": "Backend is running! 🚀",
  "timestamp": "2025-12-26T09:18:02.329Z",
  "kafka": "Ready"
}
```

---

## 🔐 Authentication Endpoints

### POST `/api/auth/register`
**Description:** Register a new user  
**Authentication:** None (Public)  
**Request Body:**
```json
{
  "name": "Ahmed",           // or "fullName"
  "email": "ahmed@example.com",
  "password": "Password123!",
  "phoneNumber": "optional",
  "additionalPhone": "optional",
  "location": "optional",
  "services": "optional",
  "servicePaymentMethods": "optional",
  "referenceNumber": "optional",
  "moneyTransferServices": "optional",
  "role": "user"              // optional, defaults to "user"
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
    "role": "user",
    "status": "pending",
    "isApproved": false,
    "profileImageUrl": "..."
  }
}
```
**Errors:**
- `400` - weak-password (password must be 8+ chars, 1 uppercase, 1 special char)
- `409` - email-already-in-use

---

### POST `/api/auth/login`
**Description:** Login with email and password  
**Authentication:** None (Public)  
**Request Body:**
```json
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
    "role": "user",
    "status": "pending",
    "isApproved": false
  }
}
```
**Errors:**
- `404` - user-not-found
- `401` - wrong-password

---


### POST `/api/auth/password/forgot`
**Description:** Request a password reset for a user account. The server will check whether the email exists and (if so) generate a one-time numeric reset code and email it to the user. For security the endpoint returns a neutral success message whether or not the email exists.
**Authentication:** None (Public)
**Request Body:**
```json
{
  "email": "user@example.com"
}
```
**Behavior:**
- If the email exists the server generates a 6-digit code (e.g. `123456`), stores it temporarily (15 minute expiry) and sends it to the user's email address.
- To avoid account enumeration the server responds with a 200-level message regardless of whether the email exists.

**Response (200):**
```json
{
  "message": "If an account with that email exists, a reset code has been sent."
}
```

**Notes:**
- The reset code is valid for 15 minutes and is one-time use.
- Implementation path: `src/auth/controllers/passwordController.js` and route `POST /api/auth/password/forgot`.


### POST `/api/auth/password/confirm`
**Description:** Confirm the reset code and set a new password. This is a public endpoint that accepts the email, the code received by email, and the desired new password.
**Authentication:** None (Public)
**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewStrongPassword1!"
}
```
**Behavior:**
- Validates the code for the email and expiry. If valid and the new password meets policy, updates the user's password and consumes the code.

**Response (200):**
```json
{
  "message": "Password changed successfully."
}
```

**Errors:**
- `400` - invalid-or-expired-code
- `400` - weak-password
- `404` - user-not-found

**Notes:**
- Password policy enforced: minimum length and character requirements (see implementation).
- Implementation path: `src/auth/controllers/passwordController.js` route `POST /api/auth/password/confirm`.


---

### GET `/api/auth/profile`
**Description:** Get current user's profile (minimal)  
**Authentication:** Required (Bearer token)  
**Headers:**
```
Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "user": {
    "id": "user_xxx",
    "email": "...",
    "fullName": "...",
    "role": "...",
    ...
  }
}
```

---

### GET `/api/auth/admin`
**Description:** Admin-only endpoint (test)  
**Authentication:** Required (Admin role)  
**Headers:**
```
Authorization: Bearer <admin_token>
```
**Response (200):**
```json
{
  "message": "Welcome, admin!",
  "user": { ... }
}
```

---

### GET `/api/auth/guest`
**Description:** Guest or higher access (test)  
**Authentication:** Required (Guest, User, Admin roles allowed)  
**Headers:**
```
Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "message": "Guest or higher access OK",
  "user": { ... }
}
```

---

## 👤 User Profile Endpoints (Lazy Loading)

All endpoints require authentication: `Authorization: Bearer <token>`

### GET `/api/users/me/profile`
**Description:** Get full user profile (JSONB)  
**Response:**
```json
{
  "profile": {
    "fullName": "...",
    "displayName": "...",
    "email": "...",
    "createdAt": "...",
    "joinedDate": "...",
    "isActive": true,
    "status": "pending",
    ...
  }
}
```

---

### GET `/api/users/me/contact`
**Description:** Get contact information subset  
**Response:**
```json
{
  "contact": {
    "phone": "...",
    "email": "...",
    "additionalPhone": "...",
    ...
  }
}
```

---

### GET `/api/users/me/verification`
**Description:** Get verification flags  
**Response:**
```json
{
  "verification": {
    "emailVerified": true/false,
    "phoneVerified": true/false,
    ...
  }
}
```

---

### GET `/api/users/me/services`
**Description:** Get services/payment methods/money transfer info  
**Response:**
```json
{
  "services": {
    "services": "...",
    "servicePaymentMethods": "...",
    "moneyTransferServices": "...",
    ...
  }
}
```

---

### GET `/api/users/me/data`
**Description:** Get raw profile data + metadata  
**Response:**
```json
{
  "data": {
    "id": "user_xxx",
    "full_name": "...",
    "email": "...",
    "role": "...",
    "status": "...",
    "profile": { ... },
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

## 👥 Admin - User Management

All endpoints require authentication: `Authorization: Bearer <admin_token>` (role 0)

### POST `/api/auth/admin/users`
**Description:** Create a new user (including admins)  
**Request Body:**
```json
{
  "name": "New Admin",           // or "fullName"
  "email": "newadmin@example.com",
  "password": "SecurePassword123!",
  "role": 0,                     // 0=admin, 1=trusted, 2=common, 3=betrug (optional, default: 2)
  "status": "active",            // optional, default: "pending"
  "phoneNumber": "optional",
  "additionalPhone": "optional",
  "location": "optional",
  "services": "optional",
  "servicePaymentMethods": "optional",
  "referenceNumber": "optional",
  "moneyTransferServices": "optional"
}
```
**Response (201):**
```json
{
  "user": {
    "id": "user_xxx",
    "email": "newadmin@example.com",
    "fullName": "New Admin",
    "role": 0,
    "status": "active",
    "isApproved": false
  }
}
```
**Errors:**
- `400` - weak-password (password must be 8+ chars, 1 uppercase, 1 special char)
- `409` - email-already-in-use

**Example - Create Admin:**
```bash
curl -X POST http://localhost:3000/api/auth/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "New Admin",
    "email": "newadmin@example.com",
    "password": "SecurePassword123!",
    "role": 0
  }'
```

---

### GET `/api/auth/admin/users`
**Description:** List all users (paginated) - Returns user list with essential fields  
**Authentication:** Required (Admin role 0)  
**Query Parameters:**
- `limit` (optional, default: 100) - Number of users to return
- `offset` (optional, default: 0) - Pagination offset
**Example:** `/api/auth/admin/users?limit=50&offset=0`
**Response:**
```json
{
  "users": [
    {
      "id": "user_xxx",
      "email": "user@example.com",
      "fullName": "User Name",
      "displayName": "User Display Name",
      "phoneNumber": "009725666565365",
      "additionalPhone": "0592487533",
      "location": "Gaza",
      "services": ["Mobile Development", "Web Development", "Money Transfer"],
      "moneyTransferServices": ["سحب الأموال", "إيداع الأموال"],
      "role": 2,
      "status": "active",
      "applicationStatus": "pending",
      "applicationType": "trusted_user",
      "appliedDate": "2024-01-01T00:00:00.000Z",
      "reviewedAt": null,
      "approvalDate": null,
      "isTrustedUser": true,
      "addedToTrustedAt": "2024-12-18T14:52:59.000Z",
      "addedToTrustedTable": true,
      "isActive": true,
      "isApproved": true,
      "isBlocked": false,
      "isVisible": false,
      "accountCreated": true,
      "verification": {
        "emailVerified": true,
        "phoneVerified": true,
        "documentsSubmitted": false,
        "locationVerified": true
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastUpdated": "2024-12-26T22:21:29.000Z",
      "lastModificationDate": "2024-12-22T18:33:49.000Z",
      "joinedDate": "2024-01-01T00:00:00.000Z",
      "statistics": {
        "joinedDate": "2024-01-01T00:00:00.000Z",
        "rating": 0,
        "totalReviews": 0
      },
      "subscription": {
        "status": "active",
        "planName": "Gold",
        "expiresAt": "2026-01-25T22:51:58.000Z"
      },
      "referenceNumber": "",
      "firebaseUid": "2sKNwIhACzbldx0DNpPgMaswnHB2",
      "applicationId": null,
      "actionBy": null,
      "actionType": null,
      "actionReason": null,
      "lastActionAt": null,
      "reviewedBy": null,
      "lastModifiedBy": null,
      "movedToTrustedAt": "2024-12-18T14:52:59.000Z",
      "lastDocumentSubmissionDate": null,
      "hasPendingDocumentRequests": false,
      "documentConfirmations": null,
      "permissions": {
        "canAccessDashboard": true,
        "canEditProfile": true,
        "canManagePrivacy": false,
        "canViewAnalytics": false,
        "showMyProfile": true
      },
      "privacySettings": {
        "showAddress": true,
        "showDescription": true,
        "showEmail": false,
        "showLocation": true,
        "showPhone": true,
        "showProfile": true,
        "showServices": true,
        "showTelegram": true,
        "showWorkingHours": true
      },
      "publicProfile": {
        "address": "",
        "bio": "",
        "city": "",
        "description": "",
        "displayName": "Ahed Eid",
        "email": "ahed2@gmail.com",
        "fullName": "",
        "location": "Gaza",
        "phone": "0592487533",
        "profileImageUrl": "",
        "serviceProvider": "Beruftsadsdasdasdsad"
      }
    },
    ...
  ]
}
```
**Fields:**
- `id` - User ID
- `email` - User email address
- `fullName` - User's full name
- `displayName` - User's display name
- `phoneNumber` - User's primary phone number (nullable)
- `additionalPhone` - User's additional phone number (nullable)
- `location` - User's location/city (nullable)
- `services` - Array of services selected by user (nullable)
- `moneyTransferServices` - Array of money transfer services (nullable)
- `role` - User role (0=admin, 1=trusted, 2=common, 3=betrug)
- `status` - User status (e.g., "active", "pending", "approved")
- `applicationStatus` - Application status
- `applicationType` - Type of application (nullable)
- `appliedDate` - Date when application was submitted
- `reviewedAt` - Date when application was reviewed (nullable)
- `approvalDate` - Date when user was approved (nullable)
- `isTrustedUser` - Whether user is a trusted user (boolean)
- `addedToTrustedAt` - Date when user was added to trusted table (nullable)
- `addedToTrustedTable` - Whether user was added to trusted table (boolean)
- `isActive` - Whether user account is active (boolean)
- `isApproved` - Whether user is approved (boolean)
- `isBlocked` - Whether user is blocked (boolean)
- `isVisible` - Whether user profile is visible (boolean)
- `accountCreated` - Whether account was created (boolean)
- `verification` - Verification status object:
  - `emailVerified` - Email verification status
  - `phoneVerified` - Phone verification status
  - `documentsSubmitted` - Documents submission status
  - `locationVerified` - Location verification status
- `createdAt` - Account creation date
- `lastUpdated` - Last update timestamp
- `lastModificationDate` - Last modification date (nullable)
- `joinedDate` - Date when user joined
- `statistics` - User statistics object:
  - `joinedDate` - Join date
  - `rating` - User rating
  - `totalReviews` - Total number of reviews
- `subscription` - Subscription information (nullable)
- `referenceNumber` - Reference number (nullable)
- `firebaseUid` - Firebase UID (nullable)
- `applicationId` - Application ID reference (nullable)
- `actionBy` - Who performed the last action (nullable)
- `actionType` - Type of last action (nullable)
- `actionReason` - Reason for last action (nullable)
- `lastActionAt` - Timestamp of last action (nullable)
- `reviewedBy` - Who reviewed the user (nullable)
- `lastModifiedBy` - Who last modified the user (nullable)
- `movedToTrustedAt` - Date when user was moved to trusted (nullable)
- `lastDocumentSubmissionDate` - Last document submission date (nullable)
- `hasPendingDocumentRequests` - Whether user has pending document requests (boolean)
- `documentConfirmations` - Document confirmation data (nullable, object)
- `permissions` - User permissions object (nullable):
  - `canAccessDashboard`, `canEditProfile`, `canManagePrivacy`, `canViewAnalytics`, `showMyProfile`
- `privacySettings` - Privacy settings object (nullable):
  - `showAddress`, `showDescription`, `showEmail`, `showLocation`, `showPhone`, `showProfile`, `showServices`, `showTelegram`, `showWorkingHours`
- `publicProfile` - Public profile information (nullable, object):
  - `address`, `bio`, `city`, `description`, `displayName`, `email`, `fullName`, `location`, `phone`, `profileImageUrl`, `serviceProvider`

**Note:** This endpoint returns essential fields for the admin list view. For full user details including complete profile, use `GET /api/auth/admin/users/:id`

---

### GET `/api/auth/admin/users/:id`
**Description:** Get full details of a specific user by ID  
**Authentication:** Required (Admin role 0)  
**Parameters:**
- `id` - User ID
**Response:**
```json
{
  "user": {
    "id": "user_xxx",
    "email": "user@example.com",
    "fullName": "User Name",
    "role": 2,
    "status": "active",
    "profile": {
      // Full profile data
    },
    "phoneNumber": "...",
    "location": "...",
    "services": {...},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    ...
  }
}
```
**Note:** This endpoint returns the complete user profile with all data. Use `GET /api/auth/admin/users` for a simplified list.
**Errors:**
- `404` - user-not-found

---

### PUT `/api/auth/admin/users/:id`
**Description:** Update user (role/status/profile)  
**Parameters:**
- `id` - User ID
**Request Body:**
```json
{
  "role": 0,                 // optional: 0=admin, 1=trusted, 2=common, 3=betrug
  "status": "active",        // optional
  "profile": { ... },         // optional
  "fullName": "...",          // optional
  "password": "...",          // optional (will be hashed)
  ...
}
```
**Response:**
```json
{
  "user": {
    "id": "user_xxx",
    "email": "...",
    "role": 0,
    "status": "active",
    ...
  }
}
```

---

### DELETE `/api/auth/admin/users/:id`
**Description:** Delete a user  
**Authentication:** Required (Admin role 0)  
**Parameters:**
- `id` - User ID
**Response (200):**
```json
{
  "message": "User deleted successfully",
  "deleted": {
    "id": "user_xxx",
    "deleted": true
  }
}
```
**Errors:**
- `404` - user-not-found

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/auth/admin/users/user_xxx \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📝 Requests Endpoints

### POST `/api/requests`
**Description:** Create a new request  
**Authentication:** None (Public)  
**Request Body:**
```json
{
  "userId": "user_123",
  "title": "طلب جديد",
  "description": "تفاصيل الطلب",
  "priority": "high"          // optional, default: "normal"
}
```
**Response (201):**
```json
{
  "request": {
    "id": "req_1",
    "userId": "user_123",
    "title": "طلب جديد",
    "description": "تفاصيل الطلب",
    "priority": "high",
    "createdAt": "2025-12-26T09:18:02.329Z"
  }
}
```

---

### GET `/api/requests`
**Description:** List all requests (in-memory store)  
**Authentication:** None (Public)  
**Response:**
```json
{
  "requests": [
    {
      "id": "req_1",
      "userId": "user_123",
      "title": "...",
      "description": "...",
      "priority": "...",
      "createdAt": "..."
    },
    ...
  ]
}
```

---

## 📄 Content Endpoints

### GET `/api/content/home`
**Description:** Get home page content  
**Authentication:** None (Public)  
**Response:**
```json
{
  "data": {
    "title": "...",
    "description": "...",
    "content": { ... }
  }
}
```
**Errors:**
- `404` - home_content not found

---

### GET `/api/content/statistics`
**Description:** Get all statistics items  
**Authentication:** None (Public)  
**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "title": "...",
      "value": "...",
      ...
    },
    ...
  ]
}
```

---

### GET `/api/content/statistics/:id`
**Description:** Get a specific statistics item  
**Authentication:** None (Public)  
**Parameters:**
- `id` - Statistics item ID
**Response:**
```json
{
  "item": {
    "id": "...",
    "title": "...",
    "value": "...",
    ...
  }
}
```
**Errors:**
- `404` - item not found

---

## 🔒 Admin - Content Management

All endpoints require authentication: `Authorization: Bearer <admin_or_superadmin_token>`

### POST `/api/content/home`
**Description:** Create or update home content  
**Request Body:**
```json
{
  "title": "...",
  "description": "...",
  "content": { ... }
}
```
**Response (201):**
```json
{
  "data": {
    "id": "...",
    "title": "...",
    "description": "...",
    "content": { ... },
    ...
  }
}
```

---

### POST `/api/content/statistics`
**Description:** Create a new statistics item  
**Request Body:**
```json
{
  "title": "...",
  "value": "...",
  "description": "...",
  ...
}
```
**Response (201):**
```json
{
  "item": {
    "id": "...",
    "title": "...",
    "value": "...",
    ...
  }
}
```

---

### PUT `/api/content/statistics/:id`
**Description:** Update a statistics item  
**Parameters:**
- `id` - Statistics item ID
**Request Body:**
```json
{
  "title": "...",        // optional
  "value": "...",        // optional
  "description": "...",   // optional
  ...
}
```
**Response:**
```json
{
  "item": {
    "id": "...",
    "title": "...",
    "value": "...",
    ...
  }
}
```
**Errors:**
- `404` - not_found

---

### DELETE `/api/content/statistics/:id`
**Description:** Delete a statistics item  
**Parameters:**
- `id` - Statistics item ID
**Response:**
```json
{
  "deleted": true
}
```

---

## 🔑 Authentication & Authorization

### Token Format
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Roles
- `guest` - Basic access
- `user` - Standard user (default)
- `admin` - Administrative access
- `superadmin` - Full administrative access

### Role-Based Access
- **Public:** Register, Login, Health check, Content (read), Requests
- **Authenticated:** Profile endpoints, User profile data
- **Admin/Superadmin:** User management, Content management

---

## 📊 Summary

| Category | Endpoints | Public | Auth Required | Admin Only |
|----------|-----------|--------|---------------|------------|
| Health | 1 | ✅ | ❌ | ❌ |
| Authentication | 5 | 2 | 3 | 1 |
| User Profile | 5 | ❌ | ✅ | ❌ |
| Admin Users | 5 | ❌ | ❌ | ✅ |
| Requests | 2 | ✅ | ❌ | ❌ |
| Content (Read) | 3 | ✅ | ❌ | ❌ |
| Content (Write) | 4 | ❌ | ❌ | ✅ |
| **Total** | **27** | **8** | **11** | **10** |

---

## 🧪 Testing

You can test the API using:
- **cURL**
- **Postman**
- **Thunder Client** (VS Code extension)
- **The included test script:** `npm test` or `node test/test_api.js`

---

## 📝 Notes

- All endpoints return JSON
- Error responses follow the format: `{ "error": "error-code", "message": "human readable message" }`
- Password policy: Minimum 8 characters, at least one uppercase letter, and at least one special character
- The requests endpoint uses in-memory storage (data is lost on server restart)
- Content and user data are stored in PostgreSQL

