# LockLock - Automated Time Tracker App

## Overview
**LockLock** is a SaaS application that automates time-in/time-out for time tracking systems. Users configure their schedule with random time windows, and the system logs them in/out automatically using headless browser automation.

**Tagline:** "Lock in your time, automatically"

---

## Tech Stack

### Frontend/Backend
- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library

### Database & ORM
- **PostgreSQL** for data persistence
- **Prisma** as ORM

### Authentication
- **NextAuth.js** with credentials provider (email/password)

### Background Jobs
- **Redis** for job queue
- **Bull/BullMQ** for job processing
- Custom scheduler (checks every minute)

### Automation
- **Puppeteer** for headless browser automation
- **Node.js crypto** (AES-256-GCM) for credential encryption

### Deployment
- **Railway** (~$20-25/month)
  - PostgreSQL (managed)
  - Redis (managed)
  - Web service (Next.js)
  - Background worker process

---

## Core Features

### 1. User Authentication
- Sign up with email/password
- Login with session management
- Protected dashboard routes

### 2. Time Tracker Configuration
- Add time tracker website URL
- Store username (plaintext)
- Store password (encrypted with AES-256-GCM)
- Test connection button (validates without exposing credentials)

### 3. Schedule Management
- Configure time-in schedule:
  - Base time (e.g., 2:50 PM)
  - Random window (e.g., 0-20 minutes)
  - Actual execution: randomly between 2:50-3:10 PM
- Configure time-out schedule:
  - Base time (e.g., 12:00 AM)
  - Random window (e.g., 0-10 minutes)
  - Actual execution: randomly between 12:00-12:10 AM
- Timezone selection
- Enable/disable toggle

### 4. Automated Time Tracking
- Background scheduler checks every minute
- When current time falls within window:
  - Calculate random delay (0-N minutes)
  - Queue automation job
  - Job executes: Launch Puppeteer → Navigate → Login → Click button → Log result

### 5. Time Logs (History)
- View all automation attempts
- Filter by date range, status (success/failed)
- Display: scheduled time, actual time, action, status, error message
- Optional: Screenshots for verification

---

## Database Schema

### User
```prisma
model User {
  id                String              @id @default(cuid())
  email             String              @unique
  password          String              // Hashed with bcrypt
  createdAt         DateTime            @default(now())
  timeTrackerConfig TimeTrackerConfig?
  schedule          Schedule?
  timeLogs          TimeLog[]
}
```

### TimeTrackerConfig
```prisma
model TimeTrackerConfig {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  user                    User     @relation(fields: [userId], references: [id])
  trackerUrl              String
  trackerUsername         String
  trackerPasswordEncrypted String  // AES-256-GCM encrypted
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

### Schedule
```prisma
model Schedule {
  id                          String   @id @default(cuid())
  userId                      String   @unique
  user                        User     @relation(fields: [userId], references: [id])

  // Time In
  timeInHour                  Int      // 0-23 (e.g., 14 = 2pm)
  timeInMinute                Int      // 0-59 (e.g., 50)
  timeInRandomWindowMinutes   Int      // e.g., 20 (executes 14:50-15:10)

  // Time Out
  timeOutHour                 Int      // 0-23 (e.g., 0 = 12am)
  timeOutMinute               Int      // 0-59 (e.g., 0)
  timeOutRandomWindowMinutes  Int      // e.g., 10 (executes 00:00-00:10)

  timezone                    String   // e.g., "America/New_York"
  enabled                     Boolean  @default(true)

  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
}
```

### TimeLog
```prisma
model TimeLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  action        String   // "TIME_IN" | "TIME_OUT"
  scheduledTime DateTime // When it was supposed to run
  actualTime    DateTime // When it actually ran
  status        String   // "SUCCESS" | "FAILED"
  errorMessage  String?  // If failed
  createdAt     DateTime @default(now())
}
```

---

## Security Architecture

### Password Encryption
**Problem:** App needs to store user's time tracker passwords to automate login

**Solution:** AES-256-GCM encryption with Node.js crypto

```typescript
// lib/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Developer Safeguards
- **Never expose credentials via API:** Endpoints return `hasPassword: boolean`, never raw/encrypted password
- **Decrypt only in-memory:** Automation decrypts → uses immediately → clears variable
- **No logging:** Never log decrypted passwords
- **Test endpoint:** Validates credentials without returning them

---

## Project Structure

```
locklock-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx           # Dashboard home
│   │   ├── config/
│   │   │   └── page.tsx       # Time tracker credentials
│   │   ├── schedule/
│   │   │   └── page.tsx       # Schedule configuration
│   │   └── logs/
│   │       └── page.tsx       # Time log history
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts
│   │   ├── config/
│   │   │   ├── route.ts       # GET/POST tracker config
│   │   │   └── test/route.ts  # Test connection
│   │   ├── schedule/
│   │   │   └── route.ts       # GET/POST schedule
│   │   └── logs/
│   │       └── route.ts       # GET time logs
│   ├── layout.tsx
│   └── page.tsx               # Landing page
├── lib/
│   ├── prisma.ts              # Prisma client
│   ├── encryption.ts          # Encrypt/decrypt utilities
│   ├── automation/
│   │   └── puppeteer.ts       # Browser automation engine
│   └── jobs/
│       ├── queue.ts           # Bull queue setup
│       └── scheduler.ts       # Cron-like scheduler
├── components/
│   ├── ui/                    # shadcn components
│   ├── auth-form.tsx
│   ├── config-form.tsx
│   ├── schedule-form.tsx
│   └── time-logs-table.tsx
├── prisma/
│   └── schema.prisma
├── worker.ts                  # Background worker process
├── .env.local
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Implementation Steps

### Phase 1: Project Setup (Day 1)
1. ✅ Create Next.js project with TypeScript
   ```bash
   npx create-next-app@latest locklock-app --typescript --tailwind --app
   ```
2. ✅ Initialize Prisma
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```
3. ✅ Install dependencies
   ```bash
   npm install next-auth bcryptjs bull puppeteer
   npm install -D @types/bcryptjs @types/bull
   ```
4. ✅ Set up shadcn/ui
   ```bash
   npx shadcn-ui@latest init
   ```

### Phase 2: Database & Auth (Day 1-2)
1. ✅ Define Prisma schema (User, TimeTrackerConfig, Schedule, TimeLog)
2. ✅ Run migrations: `npx prisma migrate dev`
3. ✅ Configure NextAuth.js with credentials provider
4. ✅ Create signup/login pages
5. ✅ Build auth forms (shadcn components)

### Phase 3: Encryption & Config (Day 2-3)
1. ✅ Build encryption utilities (`lib/encryption.ts`)
2. ✅ Generate encryption key: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`
3. ✅ Create config page (time tracker credentials form)
4. ✅ Create API endpoint: `POST /api/config` (encrypt & save)
5. ✅ Create API endpoint: `POST /api/config/test` (validate credentials)

### Phase 4: Schedule Management (Day 3)
1. ✅ Create schedule page (form with time pickers, random window sliders)
2. ✅ Add timezone selector
3. ✅ Create API endpoint: `POST /api/schedule`
4. ✅ Display current schedule with enable/disable toggle

### Phase 5: Browser Automation (Day 4-5)
1. ✅ Build Puppeteer automation engine (`lib/automation/puppeteer.ts`)
2. ✅ Generic flow:
   - Launch browser
   - Navigate to tracker URL
   - Fill username/password (decrypt in-memory)
   - Click time-in or time-out button
   - Take screenshot (optional)
   - Close browser
3. ✅ Error handling & retries
4. ✅ Log results to TimeLog table

### Phase 6: Job Queue & Scheduler (Day 5-6)
1. ✅ Set up Redis connection
2. ✅ Configure Bull queue (`lib/jobs/queue.ts`)
3. ✅ Create scheduler (`lib/jobs/scheduler.ts`):
   - Runs every minute
   - Fetch all enabled schedules
   - Check if current time is within window
   - Calculate random delay (0-N minutes)
   - Queue automation job with delay
4. ✅ Create worker process (`worker.ts`):
   - Processes queued jobs
   - Calls Puppeteer automation
   - Updates TimeLog
5. ✅ Test with local Redis

### Phase 7: Time Logs UI (Day 6-7)
1. ✅ Create logs page with table (shadcn table component)
2. ✅ Fetch logs: `GET /api/logs?from=&to=&status=`
3. ✅ Display: date, action, scheduled time, actual time, status, error
4. ✅ Add filters (date range picker, status dropdown)
5. ✅ Optional: Screenshot viewer modal

### Phase 8: Testing (Day 7)
1. ✅ Test signup → login flow
2. ✅ Test config → test connection
3. ✅ Test schedule setup
4. ✅ Test automation with real time tracker (dry run)
5. ✅ Verify logs are created correctly
6. ✅ Test random time windows

### Phase 9: Deployment (Day 8)
1. ✅ Create Railway account
2. ✅ Provision PostgreSQL + Redis
3. ✅ Deploy web service (Next.js)
4. ✅ Deploy worker process (separate service)
5. ✅ Set environment variables:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `ENCRYPTION_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
6. ✅ Run migrations: `npx prisma migrate deploy`
7. ✅ Test in production

---

## Environment Variables

```bash
# .env.local (development)
DATABASE_URL="postgresql://user:password@localhost:5432/locklock"
REDIS_URL="redis://localhost:6379"

# Encryption (generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))")
ENCRYPTION_KEY="a1b2c3d4e5f6789012345678901234567890123456789012345678901234"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Production (Railway)
# Same variables, but Railway provides DATABASE_URL and REDIS_URL automatically
```

---

## Deployment Configuration

### Railway Setup

1. **Web Service (Next.js)**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: 3000

2. **Worker Service (Background jobs)**
   - Build command: `npm run build`
   - Start command: `node worker.js`
   - No public port

3. **PostgreSQL** (managed by Railway)
4. **Redis** (managed by Railway)

### package.json scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build && tsc worker.ts --outDir dist",
    "start": "next start",
    "worker": "node dist/worker.js"
  }
}
```

---

## Cost Breakdown

### Railway Pricing (~$20-25/month)
- **PostgreSQL:** ~$5-8/month (starter tier)
- **Redis:** ~$3-5/month (starter tier)
- **Web Service:** ~$7-10/month (based on usage)
- **Worker Service:** ~$5-7/month (based on usage)

**Total:** Approximately **$20-25/month** for low-medium traffic

---

## Future Enhancements (Post-MVP)

### Features
- Multiple time tracker templates (pre-configured selectors)
- Custom selector configuration (for any time tracker)
- Screenshot storage (S3/Cloudinary) for verification
- Email/Slack notifications on failures
- Analytics dashboard (success rate, trends)
- Mobile app (React Native/Expo)
- Team accounts (manage multiple users)

### Technical
- Rate limiting & DDoS protection
- SOC2 compliance (audit logs)
- HashiCorp Vault for enterprise customers
- Horizontal scaling (multiple workers)
- Health checks & monitoring (Sentry/NewRelic)

### Business
- Pricing tiers (Free: 1 schedule, Pro: unlimited + features)
- Affiliate program
- API for integrations
- White-label solution for companies

---

## MVP Timeline

**Total: 8 days** (full-time) or **2-3 weeks** (part-time)

| Phase | Duration | Description |
|-------|----------|-------------|
| Setup | 1 day | Project init, dependencies, tooling |
| Auth | 1 day | Database, NextAuth, signup/login |
| Config | 1 day | Credential management, encryption |
| Schedule | 1 day | Schedule UI and API |
| Automation | 2 days | Puppeteer engine, error handling |
| Jobs | 1 day | Bull queue, scheduler, worker |
| UI Polish | 1 day | Logs page, testing, fixes |
| Deploy | 1 day | Railway setup, production testing |

---

## Success Metrics

### Technical
- ✅ Automation success rate >95%
- ✅ Average execution time <30 seconds
- ✅ Zero credential leaks

### Business (after launch)
- 10 beta users (first month)
- 100 users (3 months)
- 1000 users (6 months)
- $5-10/month pricing → $5k-10k MRR at 1000 users

---

## Getting Started

```bash
# 1. Create project directory
mkdir -p ~/Documents/workspace/locklock-app
cd ~/Documents/workspace/locklock-app

# 2. Initialize Next.js
npx create-next-app@latest . --typescript --tailwind --app

# 3. Install dependencies
npm install prisma @prisma/client next-auth bcryptjs bull puppeteer
npm install -D @types/bcryptjs @types/bull

# 4. Initialize shadcn/ui
npx shadcn-ui@latest init

# 5. Initialize Prisma
npx prisma init

# 6. Start building! 🚀
```

---

## Questions to Answer Before Starting

1. ✅ **App Name:** LockLock
2. ✅ **Directory:** `~/Documents/workspace/locklock-app`
3. ✅ **Hosting:** Railway
4. ✅ **Encryption:** Node.js crypto (no AWS KMS)
5. ⏳ **Target time tracker:** Which specific time tracker should we support first?
   - This will help tailor the Puppeteer selectors
   - Examples: Toggl, Harvest, Clockify, Jira, custom company tracker, etc.

---

**Ready to start building!** 🚀
