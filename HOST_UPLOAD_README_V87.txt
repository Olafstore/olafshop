OLAF SHOP - Steam Key media and cart icon v87

DATABASE STATUS
- Production migration supabase-steam-key-media-fill.sql was applied successfully.
- Steam Key products: 190.
- Steam Key media backup: 190.
- Product images added: 169.
- Hero images added: 169.
- Missing Product images: 0.
- Missing Hero images: 0.
- Existing non-empty Admin images changed: 0.
- Do not run the migration again for this upload.

CHANGES
- Steam Key product images use a verified Steam 616x353 capsule when available.
- Steam Key Hero images use a verified Steam library hero when available.
- Unavailable Steam media falls back to the existing 1920x1080 gallery.
- Buy button icons use the shopping-cart icon in every product category.

UPLOAD STEPS
1. Extract the ZIP and upload every file/folder to the repository root.
2. Preserve the api/ and assets/ folder structure.
3. Delete api/products-index.json from GitHub if it still exists.
4. Keep api/products-index.js and assets/products-index.json.
5. Commit to main and wait for Vercel to report Ready.

SECURITY AND TESTS
- No credentials, account TXT files, .env files or service-role keys are included.
- Phase 5-12 tests: 40 passed.
- Slip/system tests: 20 passed.
- Local Steam Key detail tests passed for direct Steam media and gallery fallback.
