OLAF SHOP — Unified Checkout V98

ไฟล์สำหรับอัปโหลดขึ้นโฮส:
1. product.html
2. product.js
3. styles.css

ขั้นตอน:
1. สำรองไฟล์เดิมบนโฮส
2. อัปโหลดไฟล์ทั้ง 3 ไฟล์ไปยังโฟลเดอร์รากของเว็บไซต์
3. เขียนทับไฟล์ชื่อเดิม
4. ล้าง CDN/Host cache แล้ว Hard Refresh

รายละเอียด:
- หน้าเลือกช่องทางชำระเงินและหน้า QR ใช้ UI checkout ชุดเดียวกัน
- รองรับ desktop, iPad/tablet และ mobile
- QR และข้อมูลบัญชียังคงอ่านจากค่าที่ตั้งในหน้า Admin ตาม logic เดิม
- ระบบสร้างออเดอร์, Point, แนบสลิป และตรวจสลิปยังใช้ logic เดิม
- ปิดผลกระทบจาก UI payment เก่าด้วย namespace olaf-checkout-v98

ชุดนี้ไม่ต้องรัน SQL
