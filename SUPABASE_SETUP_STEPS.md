# Supabase Setup สำหรับระบบชำระเงิน OLAF SHOP

ให้รัน SQL ใน Supabase SQL Editor ตามลำดับนี้:

1. `supabase-products.sql`
2. `products-seed.sql`
3. `supabase-orders-admin.sql`
4. `supabase-store-payment-slips.sql`
5. `supabase-payment-channels.sql`
6. `supabase-admin-users.sql`
7. `supabase-product-packages.sql`
8. `supabase-offline-stock-items.sql`
9. `supabase-stock-system-fix.sql`
10. `supabase-offline-stock-import.sql`
11. `supabase-extra-products.sql`
12. `supabase-admin-security-hardening.sql`

`supabase-admin-users.sql` adds/updates `public.profiles` and the admin-only RPC functions used by Admin > Users:

- `admin_list_profiles()`
- `admin_save_profile(...)`
- `admin_set_profile_status(...)`

`supabase-admin-security-hardening.sql` à¸•à¹‰à¸­à¸‡à¸£à¸±à¸™à¸«à¸¥à¸±à¸‡à¹„à¸Ÿà¸¥à¹Œà¸£à¸°à¸šà¸šà¸«à¸¥à¸±à¸à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” à¹€à¸žà¸·à¹ˆà¸­à¸¥à¹‡à¸­à¸ admin access à¸”à¹‰à¸§à¸¢ `profiles.role = 'admin'`, à¸›à¸´à¸”à¸ªà¸´à¸—à¸˜à¸´à¹Œ update `role/status` à¸ˆà¸²à¸ frontend, à¹à¸¥à¸° harden RLS à¸‚à¸­à¸‡à¸•à¸²à¸£à¸²à¸‡à¸ªà¸´à¸™à¸„à¹‰à¸² / order / settings / package / offline stock.

ไฟล์ `supabase-payment-channels.sql` จะเพิ่มระบบ Checkout Payment Flow:

- ตาราง `public.payment_channels` สำหรับ PromptPay และ Wallet / TrueMoney QR
- bucket `payment-qr` แบบ private สำหรับรูป QR ที่ admin อัปโหลด
- policy ให้ admin อัปโหลด/แก้ไข/ลบ QR และให้หน้าเว็บอ่าน QR ผ่าน signed URL
- คอลัมน์ order ใหม่: `payment_status`, `expires_at`, `stock_released`
- สถานะใหม่: `awaiting_payment`, `waiting_admin`, `confirmed`, `delivered`, `cancelled`, `expired`
- RPC `create_order()` จะสร้าง order เป็น `awaiting_payment` และจอง stock แบบ atomic
- RPC `attach_payment_slip()` จะเปลี่ยน order เป็น `waiting_admin` หลังลูกค้าแนบสลีป
- RPC `cancel_my_order()` และ `admin_update_order()` จะคืน stock แบบกันคืนซ้ำด้วย `stock_released`

ไฟล์ `supabase-product-packages.sql` จะเพิ่มระบบ Product Packages:

- ตาราง `public.product_packages` สำหรับแพ็คเกจสินค้าแต่ละตัว
- package มี stock แยกจาก `public.products.stock`
- สินค้าที่ไม่มี package ยังซื้อด้วยราคาและ stock จาก `public.products` แบบเดิม
- `public.order_items` เก็บ `package_id`, `package_title`, `package_subtitle`, `package_price` และ `package_snapshot`
- order snapshot ทำให้ order เก่าไม่พัง แม้ admin แก้/ลบ package ภายหลัง
- `create_order(..., p_package_id uuid default null)` รองรับ package แบบ optional และยังเข้ากันได้กับ frontend/RPC call เดิม
- `cancel_my_order()` และ `admin_update_order()` คืน stock ไปที่ package หรือ product ให้ถูกที่ และยังใช้ `stock_released` กันคืน stock ซ้ำ

ไฟล์ `supabase-offline-stock-items.sql` จะเพิ่มระบบ Steam Offline และ Rockstar/FiveM stock รายชิ้น:

- ตาราง `public.offline_stock_items` เก็บข้อมูลสินค้า offline แบบ 1 แถวต่อ 1 ชิ้น
- Admin ใส่ stock ได้จากหน้าแก้สินค้า โดย 1 บรรทัด = 1 ชิ้น
- ลูกค้ากดซื้อแล้วระบบจอง offline item แต่ยังไม่เปิดเผยข้อมูลให้ลูกค้า
- ถ้าลูกค้าหรือ admin ยกเลิกก่อนจัดส่ง ระบบคืน offline item กลับเป็น `available`
- ระบบจะส่งข้อมูลสินค้าให้ลูกค้าเฉพาะตอน admin เปลี่ยน order เป็น `delivered`
- หมวดอื่นยังใช้ `products.stock`/package stock และการจัดส่งด้วย admin แบบเดิม
- หลังรัน migration นี้ ให้เติมรายการจริงให้สินค้า Steam Offline ที่ต้องการเปิดขายทันที เพราะ `offline_stock_items` คือ source of truth ใหม่ ไม่ใช่เลข stock เดิมใน `products.stock`

ไฟล์ `supabase-offline-stock-import.sql` เป็น migration เพิ่มเติมสำหรับ Phase 5:

- รองรับ structured payload ที่รวม Steam/EA/Ubisoft ไว้ใน stock row เดียว และยังอ่าน legacy text ได้
- ใช้ `source + product_id + sequence_number` เป็น idempotency key โดยไม่ลบ reserved/delivered/history
- ล็อก product row และอัปเดต `products.stock` ใน transaction เดียวกับ batch import
- ค่าเริ่มต้นอยู่ที่ `COPIES_PER_VALID_GAME = 100` ใน `tools/generate-offline-stock-import.mjs`
- ห้ามรันไฟล์ generated import ใน Production จนกว่าจะตรวจ dry-run และอนุมัติข้อมูลจริง
- ใช้ `node scripts/import-offline-stock.js` สำหรับ dry-run และใช้ `--apply --confirm-plan "<PLAN_DIGEST>"` เฉพาะเมื่อได้รับอนุญาต
- apply ใช้ environment variable ฝั่ง local/server เท่านั้น และจะสร้าง backup ใน `backups/` ก่อนเรียก write RPC

ไฟล์ `supabase-extra-products.sql` เพิ่มสินค้าเพิ่มเติมให้เป็นข้อมูลจริงใน `public.products`:

- Windows 10/11 Home และ Pro จำนวน 4 รายการ
- Minecraft แบบ Microsoft Account และ Redeem Key
- Rockstar/FiveM แบบสต็อกรายชิ้น
- ใช้ `on conflict do nothing` จึงไม่เขียนทับข้อมูลที่แอดมินแก้ไว้แล้ว
- หลังรัน สินค้าทั้ง 7 รายการจะแสดงใน Admin > Products และ Admin > Stock

หลังรัน SQL:

1. เข้าเว็บด้วยบัญชี admin ที่อยู่ใน `public.admin_users`
2. เปิดหน้า Admin > ตั้งค่าการชำระเงิน
3. อัปโหลด QR PromptPay
4. อัปโหลด QR Wallet / TrueMoney
5. กดบันทึก
6. ทดสอบลูกค้าเปิดหน้ารายละเอียดสินค้า > สั่งซื้อ > ยืนยัน > เห็น QR popup
7. แนบสลีปใน popup หรือในหน้า `profile.html#inventory`
8. เข้า Admin > Orders เพื่อตรวจสลีป แล้วเปลี่ยนสถานะเป็น `confirmed` หรือ `delivered`

## Product Package Testing Checklist

ให้ทดสอบหลังรัน SQL ครบและ deploy frontend ล่าสุด:

### Product Page

- สินค้าที่มี active package แสดงตัวเลือก package
- เลือก package แล้วราคาเปลี่ยนตาม package
- เลือก package แล้ว stock เปลี่ยนตาม package
- package ที่ stock เป็น `0` ถูก disable และซื้อไม่ได้
- สินค้าที่ไม่มี package ยังซื้อได้เหมือนเดิม

### Checkout / Payment

- กดซื้อ package แล้ว RPC `create_order` ได้รับ `packageId`
- QR payment แสดงยอดเงินของ package ที่เลือก
- upload slip ได้
- order เริ่มเป็น `awaiting_payment` และหลังแนบสลิปเปลี่ยนเป็น `waiting_admin`

### Orders

- ลูกค้าเห็นชื่อ package และสถานะล่าสุดใน `profile.html#inventory` และประวัติใน `profile.html#orders`
- แอดมินเห็นชื่อ package ใน Admin > Orders
- order เก่าที่ไม่มี package ยังแสดงได้และไม่ error

### Stock

- สั่งซื้อ package แล้ว `product_packages.stock` ลด
- ลูกค้า cancel แล้วคืน `product_packages.stock`
- admin cancel แล้วคืน stock ถูก package
- ไม่คืน stock ซ้ำ เพราะ `orders.stock_released` ถูก set หลังคืน stock แล้ว
- สินค้าที่ไม่มี package ยังลด/คืน `products.stock` แบบเดิม

### Admin

- เพิ่ม package ได้
- แก้ชื่อ/คำอธิบาย/ราคา/compareAt/stock/status/sort order ได้
- ลบ package ได้โดย order เก่ายังอ่านจาก snapshot
- เปิด/ปิด package ได้
- reload admin แล้ว package ที่บันทึกไว้ยังโหลดกลับมาได้
- desktop layout ไม่เสีย
- mobile ไม่ล้นจอ

### Responsive

ตรวจ viewport:

- `360x800`
- `390x844`
- `412x915`
- `430x932`
- `768x1024`
- desktop `1440px`

## Google OAuth Redirect URLs

ถ้าเปิด Google Login/Register แล้วถูกพาไป `localhost` หรือขึ้น `ERR_CONNECTION_REFUSED` ให้ตรวจ Supabase Dashboard:

1. ไปที่ `Authentication > URL Configuration`
2. ตั้ง `Site URL` เป็นโดเมน production ของ Vercel เช่น `https://your-project.vercel.app`
3. เพิ่ม `Redirect URLs` อย่างน้อย:

```text
http://localhost:4173/login.html
https://your-project.vercel.app/login.html
```

OAuth ในโปรเจคนี้ส่ง `redirectTo` กลับมาที่ `login.html` แบบ path ตรง ๆ และเก็บหน้าที่ต้องกลับไปต่อไว้ใน browser session ดังนั้นให้ allow `login.html` เป็นหลัก ถ้าใช้ Vercel Preview หลาย URL ให้เพิ่ม pattern ของ preview domain ตามที่ Supabase รองรับ เช่น:

```text
http://localhost:4173/**
https://*-your-team.vercel.app/**
```

ข้อสำคัญ:

- ห้ามเปิด bucket `payment-slips` เป็น public
- bucket `payment-qr` ยังเป็น private bucket mode ถึงแม้จะมี policy ให้อ่านไฟล์ QR ได้
- ห้ามเก็บ QR หรือสลีปเป็น Base64/localStorage
- ถ้ายังไม่ได้รัน `supabase-payment-channels.sql` การอัปโหลด QR และสถานะ `awaiting_payment` จะยังไม่ทำงาน
- ถ้ายังไม่ได้รัน `supabase-product-packages.sql` หน้า package editor และการซื้อแบบ package จะยังไม่ทำงาน แต่สินค้าที่ไม่มี package ยัง fallback ใช้ระบบเดิมได้
- ถ้ายังไม่ได้รัน `supabase-offline-stock-items.sql` เวอร์ชันล่าสุด ช่อง stock รายชิ้นของ Steam Offline และ Rockstar/FiveM ใน admin จะยังไม่บันทึกลง Supabase
- ระบบยังไม่มี auto-expire/cron คืน stock อัตโนมัติ ต้อง cancel ผ่านลูกค้าหรือ admin ก่อน
