OLAF SHOP — HOST UPLOAD V92
Date: 2026-07-13

สิ่งที่แก้ในรุ่นนี้
- แก้สินค้าแนะนำใน product.html ที่ถูกบีบเป็นคอลัมน์แคบ
- เปลี่ยนเป็น Flex horizontal scroller ชุดเดียว ป้องกัน CSS Grid เก่าทับซ้อน
- Mobile แสดงการ์ดกว้าง 80–82% พร้อมช่องว่างและเห็นการ์ดถัดไป
- รูปสินค้าแนะนำคงอัตราส่วน 16:9 และข้อความไม่ถูกตัดเป็นแนวตั้ง
- อัปเดต cache stylesheet ของ product.html เป็น V92
- สินค้าเด่นบน Index สุ่มใหม่เมื่อเปิดหน้า และคงลำดับตลอด session
- ปรับ Editorial cards ให้ใช้ธีม OLAF ฟ้า–ม่วง กรอบโค้ง และรูปพอดี
- ขยายราคาและส่วนลดบน Desktop ให้อ่านชัดขึ้น

ไฟล์ที่เปลี่ยน
- index.html
- app.js
- product.html
- styles.css

วิธีอัปโหลด
1. สำรองไฟล์บน Host ปัจจุบัน
2. อัปโหลดไฟล์ทั้งหมดภายในโฟลเดอร์นี้ไปยัง Document Root
3. เลือก overwrite/replace ไฟล์เดิม
4. รอ Deploy เสร็จ
5. เปิด Incognito หรือ Hard Refresh เพื่อตรวจ cache version V92

จุดตรวจหลังอัปโหลด
- หน้า Product บนมือถือแสดงการ์ดแนะนำเป็นแนวนอนขนาดปกติ
- สามารถปัดการ์ดและเห็นขอบการ์ดถัดไป
- รูปและข้อความภายในการ์ดไม่ถูกบีบ
- สินค้าเด่นเปลี่ยนชุดเมื่อ reload หน้าใหม่ แต่ไม่กระโดดระหว่างโหลด
- ราคาในสินค้าเด่นบน Desktop มีขนาดใหญ่ขึ้น
- Editorial บน Index ใช้กรอบและสีธีม OLAF

Database / SQL
- ไม่ต้องรัน SQL
- ไม่มีการแก้ schema, RPC, stock, order หรือ payment flow

Security
- ไม่มี credentials หรือ service-role key ฝังใน Browser bundle
