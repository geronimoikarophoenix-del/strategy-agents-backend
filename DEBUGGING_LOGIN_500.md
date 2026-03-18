# Debugging 500 Error on Login

**Status:** Backend server running, but login endpoint returns 500 error
**Root Cause:** Database connection issue (most likely)
**Solution:** Follow this diagnostic guide

---

## Step 1: Check Environment Variables on Railway

**Go to:** Railway Dashboard → Your Backend Service → Variables tab

**Verify these are set:**
- ✅ `DATABASE_URL` — Should look like: `postgresql://postgres:PASSWORD@host:port/database`
- ✅ `JWT_SECRET` — Can be any string (for testing: "test_secret")
- ✅ `NODE_ENV` — Should be "production"

**If DATABASE_URL is missing:**
1. Go to "Create" or "Add Service"
2. Add PostgreSQL to your backend service
3. Railway will auto-populate DATABASE_URL
4. Then redeploy backend

---

## Step 2: Test Database Connection

**Make a request to the new debug endpoint:**

```bash
curl https://your-backend.up.railway.app/api/health/db
```

**Expected response (if DB is connected):**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-18T...",
  "dbTime": {"now": "2026-03-18T..."}
}
```

**Error response (if DB is NOT connected):**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "[error message]"
}
```

**If you get an error:** This is the problem. Check:
1. PostgreSQL service is "Active" (not crashed)
2. DATABASE_URL is set correctly
3. Connection string hasn't expired

---

## Step 3: Check if User Exists

**Make a request to the debug endpoint:**

```bash
curl https://your-backend.up.railway.app/api/debug/user/ikaro@test.com
```

**Expected response (if user exists):**
```json
{
  "found": true,
  "user": {
    "id": "...",
    "email": "ikaro@test.com",
    "username": "...",
    "created_at": "..."
  }
}
```

**Error response (if user doesn't exist):**
```json
{
  "found": false,
  "user": null
}
```

**If user doesn't exist:**
1. Go to Railway PostgreSQL UI
2. Run this SQL:
   ```sql
   INSERT INTO users (email, username, password_hash) 
   VALUES ('ikaro@test.com', 'ikaro', '$2b$10$YOW8iv4lSsG0YXN8/V.eOO.V8hRrfKB7bz8KJ6.7xVb5X9cO5XFaa');
   ```
3. Then try login again

---

## Step 4: Test Password Hash

**Make a request:**

```bash
curl -X POST https://your-backend.up.railway.app/api/debug/password-test
```

**Expected response:**
```json
{
  "testPassword": "TestPass123",
  "knownHash": "$2b$10$...",
  "passwordMatchesHash": true,
  "bcryptVersion": "5.1.1"
}
```

**If `passwordMatchesHash` is false:**
- Password hash is corrupted or wrong
- Solution: Re-hash and update in database

---

## Step 5: Try Login

**Once above 4 steps pass, try:**

```bash
curl -X POST https://your-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ikaro@test.com","password":"TestPass123"}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGc...",
    "expiresIn": "7d"
  }
}
```

---

## Step 6: Check Railway Logs

**If still failing:**
1. Go to Railway Dashboard → Backend Service → Logs tab
2. Look for error messages starting with `❌`
3. Copy the error message and paste here

The new detailed logging will show exactly where it's failing.

---

## Common Issues & Fixes

### Issue: DATABASE_URL not set
**Fix:** Add PostgreSQL service to backend on Railway

### Issue: User doesn't exist
**Fix:** Create user via Railway PostgreSQL SQL editor (see Step 3)

### Issue: Password hash mismatch
**Fix:** Use correct hash: `$2b$10$YOW8iv4lSsG0YXN8/V.eOO.V8hRrfKB7bz8KJ6.7xVb5X9cO5XFaa`

### Issue: Connection timeout
**Fix:** Check if PostgreSQL service is running and accessible

---

## Code Changes Made

These new endpoints were added for debugging:
1. **`GET /api/health/db`** — Test database connection
2. **`GET /api/debug/user/:email`** — Check if user exists
3. **`GET /api/debug/users`** — List all users
4. **`POST /api/debug/password-test`** — Test bcrypt password hashing

And improved logging in auth.service.ts to show exactly where login fails.

---

## Next: Deploy

Once you've fixed the issue using this guide:
1. Push the code from local to GitHub
2. Railway will auto-redeploy with the new debugging endpoints
3. Try login again

All the fixes are in this commit. Just need the push from your machine.
