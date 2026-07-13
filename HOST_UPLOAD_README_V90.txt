OLAF SHOP — HOST UPLOAD V90
Date: 2026-07-13

สิ่งที่เพิ่มในรุ่นนี้
- คงโครงสร้างและเนื้อหาเดิมของหน้า Index
- เพิ่ม OLAF Store Discovery ที่ได้แรงบันดาลใจจากรูปแบบ Steam Store
- สินค้าเด่นและแนะนำแบบสไลด์ พร้อมภาพตัวอย่าง แท็ก สต็อก และราคา
- ดีลแนวนอนพร้อมปุ่มเลื่อนบน Desktop และ swipe บน Mobile/Tablet
- แท็บสินค้าขายดี มาใหม่ ลดราคา และพร้อมส่ง
- ช่องค้นหา/เมนูหมวดหมู่เชื่อมกับแค็ตตาล็อกเดิม
- รองรับ Mobile, Tablet และ Desktop พร้อม reduced-motion accessibility

ไฟล์ที่เปลี่ยนจาก V89
- index.html
- app.js
- styles.css

วิธีอัปโหลด
1. สำรองไฟล์บน Host ปัจจุบันก่อน
2. อัปโหลดเนื้อหาทั้งหมดภายในโฟลเดอร์นี้ไปยัง Document Root ของเว็บไซต์
3. เลือก overwrite/replace เมื่อระบบถาม
4. รอ Vercel/Host deploy ให้เสร็จ
5. เปิดหน้าเว็บแบบ Incognito หรือ Hard Refresh เพื่อตรวจ cache version V90

ตรวจหลังอัปโหลด
- หน้า Index เดิมยังอยู่ครบ
- ส่วน OLAF Store Discovery อยู่หลังแถบสถิติ
- กดสินค้าเด่น/ดีล/รายการแล้วเปิด product.html ด้วย Product ID เดิม
- ช่องค้นหาเลื่อนไปยังแค็ตตาล็อกและกรองสินค้าได้
- Mobile สามารถ swipe รายการดีลได้และไม่มี horizontal scroll ทั้งหน้า
- สินค้าหมดสต็อกยังแสดงในแค็ตตาล็อกเดิมตาม logic เดิม

Database / SQL
- รุ่นนี้ไม่ต้องรัน SQL
- ไม่มีการแก้ schema, RPC, order flow, payment flow หรือ stock flow

Security
- ไม่มี credentials หรือ service-role key ในแพ็กเกจ
- UI ใช้เฉพาะข้อมูลสินค้าที่หน้าเว็บโหลดจากระบบ OLAF เดิม
