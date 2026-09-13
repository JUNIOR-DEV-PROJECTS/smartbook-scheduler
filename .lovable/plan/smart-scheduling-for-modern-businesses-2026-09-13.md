# Smart Scheduling for Modern Businesses

A multi-tenant scheduling and business management platform for salons, clinics, spas and practices. Each business gets its own account, staff, services, calendar, customer list and a public booking page.

## What gets built

### 1. Accounts and onboarding
- Sign up / sign in with email and password, plus Google sign-in.
- First-time owners go through a short setup wizard: business name and type, address and timezone, opening hours, first services, first staff member. The wizard creates the business and a web address like `/book/serenity-spa`.
- Staff can be invited to an existing business with a role (owner, manager, staff).

### 2. Dashboard
Today's appointments, next up, quick stats (bookings today/this week, revenue booked, new customers), and shortcuts to add an appointment or block time.

### 3. Calendar
- Day, week and month views, staff columns in day view, filter by staff or service.
- Create, move, reschedule and cancel appointments; block personal time off.
- Double-booking prevention enforced both in the interface and on the server, so two people booking the same slot at the same second cannot both succeed.

### 4. Services and staff
- Services: name, description, duration, price, category, colour, active/inactive, which staff can perform it.
- Staff: profile, weekly working hours, breaks, date-specific overrides (holidays, sick days).

### 5. Customers (CRM)
Customer list with search, profile page showing contact details, full visit history, total spend, no-show count, tags and private notes. Customers are created automatically on first booking.

### 6. Public booking page `/book/[slug]`
Mobile-first flow: pick service → pick staff (or "anyone") → pick date and time from real availability → enter details → confirm. Public business profile shows description, photos, services, hours and location. No account needed to book.

### 7. Customer portal
Customers can view, reschedule or cancel upcoming appointments and see past visits, reached through a secure link sent with their confirmation, or by signing in.

### 8. Notifications
Confirmation, reminder, reschedule and cancellation messages are queued in the system with delivery status and per-business settings (reminder timing, which messages are on). Email/SMS sending is wired as one swappable step so a provider can be connected later without reworking the flow.

### 9. Subscription plans
Starter $19, Pro $39, Business $79 monthly. Each business has a plan, trial end date and status, and limits are enforced in the app (staff seats, monthly bookings, feature access such as SMS reminders and custom branding). A pricing page and an in-app billing screen show the plan, usage against limits and upgrade options. Card payments are not switched on in this build — the structure is ready for a payment provider to be connected in a follow-up.

## Design direction
Calm, clinical-modern: deep teal and warm sand on off-white, generous spacing, rounded cards, one clear accent for primary actions. Not a purple-gradient SaaS template.

## Technical notes
- Lovable Cloud for database, auth, storage and server logic.
- Tables: `businesses`, `business_members` (+ `app_role` enum in a separate roles table), `services`, `staff`, `staff_availability`, `staff_time_off`, `customers`, `appointments`, `notifications`, `subscriptions`. Row-level security on every table, scoped by business membership; public booking reads go through narrow anonymous-read policies on business/service/availability data only.
- Slot generation and booking creation run as server functions. Booking insert is guarded by a database-level exclusion constraint on overlapping active appointments per staff member, so races cannot double-book.
- Routes: public `/`, `/pricing`, `/book/$slug`, `/appointment/$token`; gated `/dashboard`, `/calendar`, `/services`, `/staff`, `/customers`, `/settings`, `/billing`, `/onboarding`.
- Appointments stored in UTC with each business's timezone applied for display.

## Build order
1. Cloud setup, schema, policies, auth pages
2. Onboarding wizard + settings
3. Services and staff availability
4. Calendar and appointments with conflict prevention
5. Customers CRM
6. Public profile, booking flow, customer portal
7. Notifications and plan limits, pricing and billing screens
