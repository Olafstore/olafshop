OLAF SHOP — Payment / Profile / 15-minute expiry v102
Date: 2026-07-14

HOST UPLOAD
1. Upload every file in this package to the website root while preserving filenames.
2. Replace the existing files when prompted.
3. Do not upload supabase-order-expiry-15m.sql to the public website.
4. Clear the host/CDN cache, then hard refresh the browser.

SUPABASE SQL (RUN MANUALLY AFTER A DATABASE BACKUP)
1. Open Supabase SQL Editor.
2. Run supabase-order-expiry-15m.sql from the project root.
3. Confirm the transaction completes without an exception.
4. Confirm pg_cron contains the olaf-expire-unpaid-orders-15m job.
5. If the migration prints the pg_cron notice, enable pg_cron and rerun only the scheduling block documented at the end of the SQL file.

ADMIN CHECK
- Payment channels must be active.
- PromptPay / Wallet QR must be uploaded in Admin payment settings.
- The site icon must be set in Admin store settings. Storefront, auth pages, mobile menu and favicon read that value.

VERIFY AFTER UPLOAD
- Product checkout can create an order and display the configured QR.
- Point top-up displays the same QR payment surface.
- Closing a payment popup fades/slides out without leaving another layer.
- Product detail displays its cover on mobile.
- profile.html order/inventory cards fit at 360px, 390px, 430px and tablet widths.
- A pending order with no slip is cancelled after 15 minutes and its reserved stock/used Points are returned once.

SECURITY
- No .env, Supabase service-role key, account TXT, real credentials, backups or reports are included in this package.
- Do not place service-role credentials in browser files.
- No Production SQL, deployment or account import was executed while preparing this package.
