OLAF SHOP - Admin catalog authority v86

DATABASE STATUS
- Production migration was applied successfully on 2026-07-12.
- Product backup: 442 rows.
- Product total after insert: 443 rows.
- Existing rows changed: 0.
- New product: sa-48-stellar-blade.
- Do not run SQL again for this upload.

IMPORTANT GITHUB / VERCEL CLEANUP
1. Delete api/products-index.json from GitHub if it still exists.
2. Keep api/products-index.js.
3. Keep assets/products-index.json.

The JSON and JavaScript files above cannot coexist under api/ because Vercel
treats both as the same serverless route and the build will fail.

UPLOAD STEPS
1. Upload all files and folders from this package to the repository root.
2. Preserve the api/ and assets/ folder structure.
3. Commit to main only after confirming api/products-index.json is deleted.
4. Wait for Vercel deployment and confirm the build reports Ready.
5. Test index.html, product.html and olaf-control.html.

SECURITY
- No credentials, account TXT files, .env files or service-role keys are included.
- The private database backup is not included in the host package.
- Product values configured in Admin remain authoritative in Supabase.

LOCAL VERIFICATION
- Phase 5-12 tests: 40 passed.
- Slip/system tests: 20 passed.
- Total: 60 passed, 0 failed.
- Vercel production build: completed successfully before packaging.
