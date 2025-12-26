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

All endpoints require authentication: `Authorization: Bearer <admin_or_superadmin_token>`

### GET `/api/auth/admin/users`
**Description:** List all users (paginated)  
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
      "email": "...",
      "fullName": "...",
      "role": "...",
      "status": "...",
      ...
    },
    ...
  ]
}
```

---

### GET `/api/auth/admin/users/:id`
**Description:** Get a specific user by ID  
**Parameters:**
- `id` - User ID
**Response:**
```json
{
  "user": {
    "id": "user_xxx",
    "email": "...",
    "fullName": "...",
    "role": "...",
    "status": "...",
    "profile": { ... },
    ...
  }
}
```
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
  "role": "admin",           // optional
  "status": "active",        // optional
  "profile": { ... },         // optional
  "fullName": "...",          // optional
  "email": "...",             // optional
  ...
}
```
**Response:**
```json
{
  "user": {
    "id": "user_xxx",
    "email": "...",
    "role": "admin",
    "status": "active",
    ...
  }
}
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
| Admin Users | 3 | ❌ | ❌ | ✅ |
| Requests | 2 | ✅ | ❌ | ❌ |
| Content (Read) | 3 | ✅ | ❌ | ❌ |
| Content (Write) | 4 | ❌ | ❌ | ✅ |
| **Total** | **25** | **8** | **11** | **8** |

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

