# CatchAbit Floor Hours Tracker (`time.catchabit.in`)

A mobile-first, native-feeling Progressive Web App (PWA) and internal office attendance tracker for **CatchAbit Solutions**, built with React, Tailwind CSS, Cloudflare Pages Functions, Cloudflare D1 (SQLite), and a companion Cloudflare Worker Cron Trigger.

---

## Live Deployments & URLs

- **Official Subdomain**: [`https://time.catchabit.in`](https://time.catchabit.in)
- **Cloudflare Pages Production URL**: [`https://catchabit-time.pages.dev`](https://catchabit-time.pages.dev)
- **8:00 PM IST Auto-Checkout Cron Worker**: [`https://catchabit-time-auto-checkout.jaivethakur.workers.dev`](https://catchabit-time-auto-checkout.jaivethakur.workers.dev) (Cron: `30 14 * * *` UTC = 8:00 PM IST daily)
- **Cloudflare D1 Database**: `catchabit-time-db` (`c83b9ae8-e606-4422-9a2c-b8e5826bac68`)

---

## Seed Accounts & Credentials

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | Admin | `admin@catchabit.in` | `admin123` *(or master: `Billi@1029`)* |
| **Employee** | Rahul Sharma | `rahul@catchabit.in` | `password123` |
| **Employee** | Priya Patel | `priya@catchabit.in` | `password123` |
| **Employee** | Amit Verma | `amit@catchabit.in` | `password123` |

---

## Core Features & Logic Implemented

1. **Standalone PWA (Native Mobile App Feel)**:
   - Configured with `manifest.webmanifest`, app icons, splash theme, and service worker shell caching.
   - When added to the Home Screen on iOS or Android (`Add to Home Screen`), launches with **zero browser address bar, URL fields, or browser buttons** in full standalone mode.
   - Mobile-first layout with bottom navigation bar, active indicators, and 48px+ touch targets.

2. **Live Floor Hours Tracker (IST)**:
   - Tracks 7 floor hours/day (time physically on floor, excluding breaks).
   - Real-time ticking timer (HH:MM:SS with tabular digits).
   - SVG circular progress ring visualizing completion towards 7 hours.
   - Contextual primary actions: **Check In** → **Start Break** / **Check Out** → **Resume from Break**.
   - Multiple breaks supported per session (lunch, tea, meetings) with automatic duration logging.

3. **8:00 PM IST Auto-Checkout Engine**:
   - Cloudflare Cron Worker runs daily at `30 14 * * *` (14:30 UTC = 20:00 IST).
   - Finds all active or on-break sessions for today, auto-closes any open break at 20:00 IST, and sets `check_out_time = 20:00 IST`, `status = 'completed'`, and `is_auto_checkout = 1`.
   - Distinctive visual warning badge ("Auto-Checked Out at 8:00 PM") in the employee UI with a one-tap button to request an adjustment if they left earlier.

4. **Monthly Calendar & Shortfall / Recovery Calculator**:
   - Calendar month grid color-coded:
     - **Green**: 7+ hours (Met)
     - **Yellow**: 6–7 hours (Close)
     - **Red**: < 6 hours (Short)
     - **Grey**: Non-working day / Off
   - Tapping any day opens a comprehensive inspection sheet detailing check-in, check-out, break intervals, net floor hours, and full audit logs.
   - **Monthly Recovery Projection**: If below 7 hours/day average, calculates **exact extra hours per remaining working day** needed to bring the monthly average back to 7.00 hours.
   - Interactive daily floor hours bar chart across the month.

5. **Manual Edit System & Full Audit Trail**:
   - **Employees**: Submit edit requests with mandatory reasons (`check_in_time`, `check_out_time`, or breaks). Requests enter a pending queue without altering live data.
   - **Admins**: Direct edit capability on any employee session with automatic audit logging, plus an approval queue with 1-tap **Approve & Apply** or **Reject**.
   - Complete audit trail preserved in `edit_logs` (editor, previous value, new value, reason, approver, and timestamp).

6. **Admin Operations Hub**:
   - **Team Today**: Live presence dashboard showing who is on the floor, on break, checked out, or not in yet.
   - **Org Compliance Report**: Organization-wide compliance leaderboard, total floor hours, shortfalls, and one-click **CSV export**.
   - **System Rules**: Dynamic configuration of daily target hours (7h), auto-checkout time (20:00), and active working days (Mon–Sat).
   - **On-Demand Auto-Checkout Trigger**: Admin can simulate or manually run the 8:00 PM auto-checkout routine on demand.

---

## Architecture & File Structure

```
catchabit-time/
├── functions/api/                     # Cloudflare Pages Functions (Serverless Backend)
│   ├── _helpers.js                    # IST date/time utilities & floor hour math
│   ├── _middleware.js                 # Web Crypto JWT verification & route protection
│   ├── auth/                          # Login, Me, Logout endpoints
│   ├── attendance/                    # Check-in, check-out, breaks, month, today, edits
│   └── admin/                         # Team status, approvals, compliance report, settings
├── workers/auto-checkout-cron/        # Companion Cloudflare Cron Worker
│   ├── wrangler.toml                  # Cron trigger: 30 14 * * * (8:00 PM IST)
│   └── src/index.js                   # Scheduled auto-checkout logic with D1 binding
├── public/                            # PWA Assets
│   ├── manifest.webmanifest           # App manifest (display: standalone)
│   ├── sw.js                          # Service Worker for shell caching
│   ├── favicon.svg                    # SVG icon
│   └── icons/                         # 192x192 & 512x512 PWA icons
├── src/                               # React Application
│   ├── context/                       # AuthContext & AttendanceContext (live ticking timer)
│   ├── components/                    # Header, BottomNav, LiveTimer, Modals
│   ├── screens/                       # Today, History, Summary, Requests, Team, Admin Hub
│   └── services/api.js                # API client with fallback dev engine
├── schema.sql                         # Cloudflare D1 / SQLite database schema
├── seed.sql                           # Seed users and default settings
├── wrangler.toml                      # Cloudflare Pages configuration & D1 binding
└── package.json                       # Project configuration
```

---

## Local Development & Deployment Commands

### 1. Run Locally
```bash
cd /Users/jaivendrasingh/.gemini/antigravity/scratch/catchabit-time
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Build for Production
```bash
npm run build
```

### 3. Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name=catchabit-time
```

### 4. Deploy 8:00 PM Auto-Checkout Cron Worker
```bash
cd workers/auto-checkout-cron
npx wrangler deploy
```

### 5. Custom Domain Setup (`time.catchabit.in`)
1. In Cloudflare Dashboard ➔ DNS Records for `catchabit.in`:
2. Add a `CNAME` record:
   - **Type**: `CNAME`
   - **Name**: `time`
   - **Target**: `catchabit-time.pages.dev`
   - **Proxy status**: **Proxied** (Orange cloud enabled)
