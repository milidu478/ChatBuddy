# AI Prompt Builder - Setup & Troubleshooting Guide

## 🚀 CRITICAL SETUP STEPS

### 1. Environment Configuration

**Create `.env` file in the root directory:**

```env
# Database Configuration
DATABASE_URL=postgresql://admin:password123@localhost:5432/aipromptbuilder

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345

# OpenAI Configuration (CRITICAL FOR AI STREAMING)
OPENAI_API_KEY=sk-your_openai_api_key_here

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_change_this_in_production_67890
NEXTAUTH_URL=http://localhost:3000

# Environment
NODE_ENV=development
PORT=5000
```

**⚠️ IMPORTANT:** The `OPENAI_API_KEY` is REQUIRED for the AI streaming feature to work. Without it, you'll get an error: "AI service is not configured."

### 2. Database Setup

**Start PostgreSQL (Docker):**

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432 (user: admin, password: password123)
- Redis on port 6379

**Run Prisma Migrations:**

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

### 3. Install Dependencies

```bash
npm install
```

This installs dependencies for both `apps/api` and `apps/web`.

### 4. Start the Application

**Terminal 1 - Start Backend:**

```bash
cd apps/api
npm run dev
```

Expected output:
```
✅ Server & WebSockets running on http://localhost:5000
```

**Terminal 2 - Start Frontend:**

```bash
cd apps/web
npm run dev
```

Expected output:
```
▲ Next.js 16.2.9
- Local:        http://localhost:3000
```

---

## 🔐 First Time User Flow

### Step 1: Create Account

1. Go to `http://localhost:3000`
2. You'll be redirected to `/login`
3. Click "Sign up" link → Goes to `/signup`
4. Fill in:
   - **Email:** test@example.com
   - **Name:** Test User (optional)
   - **Password:** password123 (min 8 chars)
   - **Confirm Password:** password123
5. Click "Create Account"
6. You'll be automatically logged in and redirected to `/` (Chat page)

### Step 2: Socket Connection & Session Ready

You should see in browser console:
```
✅ Connected to WebSocket Server
📤 Joining session: chat-session-xyz-789
✅ Session is ready for messaging
```

If you see errors instead, see the **Troubleshooting** section.

### Step 3: Send Your First Message

1. Type a message in the input box
2. Click Send or press Enter
3. Your message appears on the left (USER)
4. You'll see "streaming response..." indicator
5. AI response starts streaming on the right (ASSISTANT)

---

## 🐛 Troubleshooting

### Issue: "Socket not connected" or "Session not ready"

**Check 1: Backend running?**
```bash
curl http://localhost:5000/api/v1/health
```

Expected response:
```json
{
  "status": "success",
  "message": "AI Prompt Builder API is running! 🚀",
  "environment": "development"
}
```

**Check 2: Browser console errors**
- Open DevTools (F12)
- Go to Console tab
- Look for errors

**Check 3: CORS issues**
- Backend CORS is set to `http://localhost:3000`
- Frontend is running on `http://localhost:3000` ?
- If different port, update in [apps/api/src/socket.ts](apps/api/src/socket.ts)

---

### Issue: "AI service is not configured. Please set OPENAI_API_KEY"

**Solution:**
1. Get your OpenAI API key from https://platform.openai.com/api-keys
2. Add to `.env` file:
   ```env
   OPENAI_API_KEY=sk-your_actual_key_here
   ```
3. Restart backend:
   ```bash
   cd apps/api
   npm run dev
   ```

---

### Issue: Login fails with "Invalid email or password"

**Check 1: Is the user created?**

The user should have been created during signup. If signup failed, check:
- Is backend running? (`http://localhost:5000/api/v1/health`)
- Are there console errors?

**Check 2: Database connection?**

```bash
cd apps/api
npx prisma studio
```

This opens a GUI to see all users in the database. You should see your test user.

**Check 3: PostgreSQL running?**

```bash
docker ps
```

You should see `ai-prompt-db` and `ai-prompt-redis` containers.

---

### Issue: "AI response is not streaming"

**Check server logs (Terminal 1):**

```
📨 [chat-session-xyz-789] Received message from USER_ID
💾 Saving user message to database...
📚 Fetching message history...
🤖 Calling OpenAI API with 1 previous messages
```

If you see "OpenAI API Error", check your API key.

**Check browser logs (DevTools → Console):**

```
📤 Sending message
📨 Received chunk (45 chars)
📨 Received chunk (32 chars)
✅ AI stream ended (1245 chars total)
```

If no chunks are received, check CORS or socket connection.

---

### Issue: Template Creation gives 401 Unauthorized

**Check 1: Is session valid?**

In PromptBuilder (browser console), you should see:
```
Token from session: eyJ...  (very long string)
Token length: 200+
```

**Check 2: Backend logs**

Server should show:
```
🔍 Auth Middleware - Token verified for user: USER_ID
✅ Template created: TEMPLATE_ID
```

If it shows "No token provided" or "Invalid token", the issue is with token passing.

---

## 📋 Complete Architecture Overview

### Authentication Flow
```
1. User → /signup → Frontend creates account
2. Frontend → POST /api/v1/auth/register → Backend creates user
3. User → /login → Frontend authenticates
4. Frontend → POST /api/v1/auth/login → Backend returns JWT token
5. NextAuth saves token in session
6. Page.tsx extracts token → Passes to Socket.io
```

### Real-time Chat Flow
```
1. Frontend → Socket.io connect with token
2. Backend socket middleware → Verifies JWT token
3. Frontend → emit join_session → Backend creates ChatSession
4. Backend → emit session_ready → Frontend enables send button
5. User sends message → emit send_message
6. Backend → Save message → Call OpenAI → Stream chunks
7. Backend → emit ai_chunk (multiple times) → Frontend displays
8. Backend → emit ai_stream_end → Frontend finishes
```

### File Locations

| File | Purpose |
|------|---------|
| `apps/web/src/app/(auth)/login/page.tsx` | Login page |
| `apps/web/src/app/(auth)/signup/page.tsx` | Signup page (NEWLY CREATED) |
| `apps/web/src/app/page.tsx` | Main chat page |
| `apps/web/src/app/stores/chatStore.ts` | Socket & state management |
| `apps/web/src/app/components/PromptBuilder.tsx` | Template builder |
| `apps/api/src/server.ts` | Express + HTTP server |
| `apps/api/src/socket.ts` | Socket.io handlers |
| `apps/api/src/config/database.ts` | Prisma client |
| `apps/api/src/services/auth.service.ts` | User login/register |
| `apps/api/src/services/ai.service.ts` | OpenAI streaming |
| `apps/api/src/middleware/authenticate.ts` | JWT verification |

---

## 🧪 Testing Checklist

- [ ] PostgreSQL running (`docker-compose up -d`)
- [ ] Backend running (`npm run dev` in `apps/api`)
- [ ] Frontend running (`npm run dev` in `apps/web`)
- [ ] Can create account (`/signup`)
- [ ] Can login (`/login`)
- [ ] Socket connects (see blue "Connecting..." message)
- [ ] Session ready (message disappears)
- [ ] Can send message
- [ ] AI response streams back
- [ ] Template builder works
- [ ] Can build prompts from templates

---

## 🔧 Common Commands

```bash
# Start everything
npm install  # from root

# Backend only
cd apps/api && npm run dev

# Frontend only
cd apps/web && npm run dev

# Database GUI
cd apps/api && npx prisma studio

# Reset database (CAUTION!)
cd apps/api && npx prisma migrate reset

# View backend logs
# Just check Terminal output where backend is running

# View frontend logs
# Check browser DevTools Console (F12)
```

---

## 📞 Still Having Issues?

1. **Check server logs** (Terminal where backend runs)
2. **Check browser console** (F12 → Console)
3. **Verify .env file** has all required variables
4. **Verify Docker containers** are running
5. **Check ports**: Backend=5000, Frontend=3000, DB=5432

If stuck, restart everything:
```bash
docker-compose down
docker-compose up -d
npm run dev  # in apps/api
npm run dev  # in apps/web (new terminal)
```
