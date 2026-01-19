# Security & Development Guidelines - Raptor Portal

This document outlines security protocols for the Raptor Portal project. Follow these guidelines for all new features, API routes, and integrations.

## Tech Stack

- **Frontend:** React (Create React App)
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **API Routes:** Vercel Serverless Functions (`/api/*.js`)
- **Email:** Mailgun
- **SMS:** HighLevel API
- **Auth:** Simple password authentication (admin only)

---

## API Route Security

### Vercel Serverless Function Template

All API routes in `/api/` should follow this pattern:

```javascript
// api/example.js
export default async function handler(req, res) {
  // 1. Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Environment variable validation
  const API_KEY = process.env.SOME_API_KEY;
  if (!API_KEY) {
    console.error('API_KEY not configured');
    return res.status(500).json({ error: 'Service not configured' });
  }

  // 3. Input validation
  const { requiredField, optionalField } = req.body;
  if (!requiredField) {
    return res.status(400).json({ error: 'Missing required field' });
  }

  // 4. Business logic with try/catch
  try {
    // Your code here
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
```

### Cron Job Authentication

For cron-triggered endpoints (like `/api/send-reminders`), validate the cron secret:

```javascript
export default async function handler(req, res) {
  // Verify cron secret for automated calls
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow manual POST without auth for testing, but log it
    if (req.method !== 'POST') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Continue with handler...
}
```

---

## Input Validation

### Phone Number Validation

```javascript
const digits = phone.replace(/\D/g, '');
if (digits.length !== 10) {
  return res.status(400).json({ error: 'Invalid phone number' });
}
const formattedPhone = `+1${digits}`;
```

### Email Validation

```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: 'Invalid email address' });
}
```

### Required Fields

```javascript
const { name, email, phone } = req.body;

if (!name || !email) {
  return res.status(400).json({ error: 'Name and email are required' });
}
```

---

## Environment Variables

### Current Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL | Frontend |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key (read-only after RLS update) | Frontend |
| `SUPABASE_URL` | Supabase project URL (for API routes) | Vercel only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin writes | Vercel only |
| `ADMIN_PASSWORD` | Admin dashboard password (server-side) | Vercel only |
| `JWT_SECRET` | Secret for signing admin JWT tokens (min 32 chars) | Vercel only |
| `MAILGUN_API_KEY` | Mailgun API key | Vercel only |
| `MAILGUN_DOMAIN` | Mailgun sending domain | Vercel only |
| `HIGHLEVEL_API_KEY` | HighLevel API key | Vercel only |
| `HIGHLEVEL_LOCATION_ID` | HighLevel location ID | Vercel only |
| `CRON_SECRET` | Vercel cron authentication | Vercel only |
| `PORTAL_URL` | Production URL | Vercel only |

> **IMPORTANT:** `SUPABASE_SERVICE_ROLE_KEY` has full database access. Never expose in frontend code.

> **Note:** `REACT_APP_ADMIN_PASSWORD` is deprecated. Use `ADMIN_PASSWORD` instead for server-side validation.

### Generating Secrets

For `JWT_SECRET`, generate a cryptographically secure random string:
```bash
openssl rand -hex 32
```

### Adding New Variables

1. **Local development:** Add to `.env` (never commit)
2. **Production:** Add to Vercel dashboard → Settings → Environment Variables
3. **Update this doc** with the new variable

### Rules

- ❌ Never hardcode secrets in code
- ❌ Never commit `.env` files
- ❌ Never log secrets or include in error messages
- ✅ Use `process.env.VARIABLE_NAME`
- ✅ Check variables exist before using

```javascript
// Good - check at runtime
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  return res.status(500).json({ error: 'Service not configured' });
}
```

---

## Supabase Security

### Row Level Security (RLS)

All tables should have RLS enabled. Current policy is permissive for the portal's use case, but sensitive operations should be done through API routes, not direct client access.

### Client-Side Queries

The Supabase anon key is exposed to the frontend. This is acceptable because:
- RLS policies control access
- Sensitive operations go through API routes
- No admin operations happen client-side

### API Route Queries

For server-side operations, use the same Supabase client but with service role key if needed for admin operations:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // For admin operations
);
```

---

## Admin Authentication

### Current Implementation

Admin authentication uses server-side password validation with JWT tokens:

1. **Login** (`/api/admin-auth`):
   - Password validated server-side (never exposed in client bundle)
   - Rate limited: 5 attempts per minute per IP
   - Returns signed JWT with 8-hour expiration

2. **Protected API Routes** (require valid JWT via `requireAdmin` middleware):
   - `send-sms` - sends SMS to customers
   - `send-delivery-notification` - sends delivery notification emails
   - `sync-highlevel-contact` - syncs contacts with HighLevel CRM

3. **Token Storage**:
   - JWT stored in `sessionStorage.adminToken`
   - Sent via `Authorization: Bearer <token>` header

```javascript
// Frontend: Include auth header in protected requests
const response = await fetch('/api/protected-route', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
  },
  body: JSON.stringify(data)
});
```

### Security Features

- Server-side password validation (constant-time comparison)
- Cryptographically secure JWT (HS256, 8h expiration)
- Rate limiting on login endpoint
- Protected API routes require valid, non-expired token

### Known Limitations

- **Rate limiting resets on cold start**: The login rate limiter uses in-memory storage, which resets when the Vercel serverless function cold starts. This provides protection within an instance's lifecycle but is not persistent. For production-grade rate limiting, migrate to [Upstash Redis](https://upstash.com/) or Vercel KV.
- Admin CRUD operations still go directly to Supabase via anon key
- RLS policies are the primary protection for database writes
- No refresh token mechanism (user must re-login after 8h)

### Future Improvements

1. Route all admin writes through authenticated API endpoints
2. Add refresh token support
3. Migrate to Supabase Auth for full user management

---

## Error Handling

### Response Status Codes

| Code | When to Use |
|------|-------------|
| 200 | Success |
| 400 | Validation failed / Bad request |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 405 | Method not allowed |
| 500 | Server error |

### Error Response Shape

Always use consistent error responses:

```javascript
// Validation error
return res.status(400).json({ error: 'Missing phone number or URL' });

// Server error
return res.status(500).json({ error: error.message });

// Success
return res.status(200).json({ success: true, data: result });
```

### Logging

- ✅ Log errors with `console.error()` for Vercel logs
- ❌ Never log sensitive data (API keys, passwords, full phone numbers)

```javascript
// Good
console.error('SMS error:', error.message);

// Bad
console.error('SMS error:', { apiKey: API_KEY, phone: userPhone });
```

---

## External API Integration

### HighLevel API

- Uses private integration with scoped permissions
- Required scopes: `contacts.readonly`, `contacts.write`, `conversations/message.write`
- Always lookup contacts before creating to avoid duplicates

### Mailgun API

- Domain-restricted sending
- Templates stored in database for easy updates
- CC list configurable per template

---

## Deployment Checklist

Before deploying new features:

- [ ] Environment variables added to Vercel
- [ ] No hardcoded secrets in code
- [ ] Input validation for all user inputs
- [ ] Error handling with appropriate status codes
- [ ] No sensitive data in console logs
- [ ] Tested locally with `npm start`
- [ ] Build passes with `npm run build`

---

## Credential Rotation

If credentials are ever exposed:

1. **Immediately rotate** in the service dashboard (Supabase, Mailgun, HighLevel)
2. **Update** in Vercel environment variables
3. **Verify** the app still works
4. **Check git history** - never commit secrets

---

## Questions?

If unsure whether something is secure, ask:

1. Can an unauthenticated user reach this code?
2. What happens if someone sends malicious input?
3. Are there any secrets in this code or logs?
4. Is user input being sanitized before database queries?

When in doubt, add more checks, not fewer.
