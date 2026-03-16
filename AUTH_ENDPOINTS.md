# Auth Endpoints

## POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "trader@example.com",
  "username": "trader123",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Trader"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "trader@example.com",
      "username": "trader123",
      "first_name": "John",
      "last_name": "Trader",
      "created_at": "2026-03-16T15:07:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

## POST /api/auth/login
Login and get JWT token.

**Request:**
```json
{
  "email": "trader@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "trader@example.com",
      "username": "trader123",
      "first_name": "John",
      "last_name": "Trader",
      "created_at": "2026-03-16T15:07:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

## GET /api/auth/me
Get current user (requires JWT).

**Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "trader@example.com",
      "username": "trader123",
      "first_name": "John",
      "last_name": "Trader",
      "created_at": "2026-03-16T15:07:00Z"
    }
  }
}
```

## POST /api/auth/logout
Logout user (requires JWT).

**Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Security

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire in 7 days (configurable via JWT_EXPIRY)
- All protected endpoints require valid JWT in Authorization header
- Password minimum: 8 characters

## Error Responses

**400 - Bad Request:**
```json
{
  "error": {
    "message": "Email, username, and password are required",
    "statusCode": 400,
    "timestamp": "2026-03-16T15:07:00Z"
  }
}
```

**401 - Unauthorized:**
```json
{
  "error": {
    "message": "Invalid email or password",
    "statusCode": 401,
    "timestamp": "2026-03-16T15:07:00Z"
  }
}
```

**409 - Conflict:**
```json
{
  "error": {
    "message": "Email or username already exists",
    "statusCode": 409,
    "timestamp": "2026-03-16T15:07:00Z"
  }
}
```
