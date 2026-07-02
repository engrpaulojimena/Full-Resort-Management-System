# Email & In-App Notifications

This adds a full notification system on top of the existing mock-data admin UI.

## What's new

**In-app**
- Notification bell in the topbar (`components/layout/NotificationBell.tsx`) with unread badge, dropdown preview, mark-as-read / mark-all-read.
- Full notification center at `/admin/notifications` with filtering by type.
- Sidebar badge showing unread count.
- Toast pop-ups (`components/ui/Toaster.tsx`) for instant feedback on actions (e.g. verifying a payment).
- All notification state lives in `components/providers/NotificationProvider.tsx` (React context, seeded from `mockNotifications`). Swap the in-memory `useState` for real fetch/mutation calls once the `notifications` table (added to `lib/schema.ts`) is wired to Neon.

**Email**
- `lib/email.ts` — branded HTML templates (booking confirmation, payment received/verified/rejected, check-in reminder, admin alerts for new reservations & pending payments) plus a `sendEmail()` helper using [Resend](https://resend.com).
- **Dry-run by default.** If `RESEND_API_KEY` isn't set, emails are logged to the server console instead of sent — so the whole flow works immediately without any setup, and nothing breaks in preview/build environments.
- `app/api/notifications/send-email/route.ts` — POST endpoint that maps an `event` name to the right template and recipient.
- `app/api/notifications/test-email/route.ts` — used by the "Send Test Email" button.
- Payment verification/rejection on `/admin/payments` is now fully wired: clicking Verify/Reject updates the row, fires an in-app notification, shows a toast, and calls the guest's email.

**Settings**
- `/admin/settings/notifications` — toggle which events send email (new reservation, payment pending, payment verified, check-in/out reminders, cancellations, low availability, guest confirmations), send a test email, and view recent email delivery logs.

## Going live with real email

1. Create a free [Resend](https://resend.com) account and verify a sending domain.
2. `npm install` (adds the `resend` package already listed in `package.json`).
3. Set in `.env.local` / your hosting provider:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM="Your Resort <reservations@yourdomain.com>"
   RESORT_NAME="Your Resort"
   ```
4. Push the new tables (`notifications`, `notification_preferences`, `email_logs`) with `npm run db:push`.
5. Replace the in-memory state in `NotificationProvider` with real reads/writes against those tables, and call `/api/notifications/send-email` from your reservation/payment server actions (the payments page already shows the pattern).

## Design changes

- Notification bell + dropdown, avatar menu with quick links, toast system — all themed with the existing sage/gold palette, no dark mode.
- New `Toggle` component (`components/ui/Toggle.tsx`) for preference switches.
- Sidebar gained a secondary nav section (Notifications, Settings) with an unread-count pill.
