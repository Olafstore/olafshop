OLAF SHOP - Product recommendations / Steam Key / Point top-up v84

Upload every file and the api folder in this package to the website root.
Keep the folder structure exactly as supplied (api/* must remain inside api/).
Overwrite files with the same names, then redeploy once so Vercel picks up the
new serverless route api/products-index.js and the v84 cache versions.

No SQL migration is required for this package.
No environment variable or credential is included in this package.

After deployment, verify:
1. product.html?id=<product-id> shows its background, cover and recommendations.
2. Steam Key products do not show the extra-details section.
3. point-topup.html shows five wallet amounts and does not keep loading the user.
4. Search can find a product by multiple name words.
