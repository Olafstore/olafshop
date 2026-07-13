OLAF SHOP — ADMIN PRO V95
วันที่: 13 กรกฎาคม 2026

ไฟล์ที่ต้องอัปโหลดไปยังโฟลเดอร์รากของเว็บไซต์:
1. admin.css
2. admin.js
3. olaf-control.html

ขั้นตอน:
1. สำรองไฟล์เดิมทั้ง 3 ไฟล์บน Host
2. อัปโหลดไฟล์ในโฟลเดอร์นี้และเลือกเขียนทับไฟล์เดิม
3. ไม่ต้องรัน SQL และไม่ต้องแก้ Environment Variables
4. เปิด /olaf-control.html แล้วรีเฟรชแบบไม่ใช้แคช (Ctrl+F5)
5. ตรวจ Dashboard, เมนูมือถือ และ Popup แก้ไขสินค้า

หมายเหตุ:
- ไม่แก้ schema, RPC, RLS, order flow, payment flow หรือ stock flow
- Logic บันทึกสินค้าและสิทธิ์ Admin ใช้ของเดิมทั้งหมด
