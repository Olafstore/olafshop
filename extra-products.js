(function () {
  const MINECRAFT_HERO =
    "https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Hero-Image_Vanilla_Deluxe_1200x675.jpg";
  const ROCKSTAR_HERO =
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg";
  const WINDOWS_IMAGE =
    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/windows11/windows11-original.svg";

  const categories = [
    { id: "windows", label: "Key Windows" },
    { id: "minecraft", label: "Minecraft" },
    { id: "rockstar", label: "Rockstar" }
  ];

  const products = [
    {
      id: "windows-10-home",
      name: "Windows 10 Home",
      publisher: "Microsoft",
      category: "windows",
      label: "OEM",
      price: 199,
      compareAt: 4385,
      stock: 0,
      sold: 0,
      rating: "",
      delivery: "สั่งซื้อและรับคีย์ผ่านแอดมินหลังตรวจสอบการชำระเงิน",
      warranty: "รับประกันคีย์ตามเงื่อนไขร้าน",
      image: WINDOWS_IMAGE,
      heroImage: WINDOWS_IMAGE,
      tags: ["ลิขสิทธิ์แท้สำหรับใช้งานส่วนตัว", "License Key Code", "ติดตั้งได้ 1 เครื่อง", "มีแอดมินช่วยแนะนำ"],
      description: "คีย์สำหรับเปิดใช้งาน Windows 10 Home จำนวน 1 เครื่อง สั่งซื้อและรับคีย์ผ่านแอดมิน",
      gallery: [WINDOWS_IMAGE],
      platformLinks: [],
      featureBlocks: [],
      detailSections: [],
      steamRelatedLinks: [],
      systemRequirements: { minimum: ["Windows 10 Home"], recommended: [] },
      isActive: true,
      sortOrder: 8991
    },
    {
      id: "windows-10-pro",
      name: "Windows 10 Pro",
      publisher: "Microsoft",
      category: "windows",
      label: "Retail",
      price: 199,
      compareAt: 4890,
      stock: 0,
      sold: 0,
      rating: "",
      delivery: "สั่งซื้อและรับคีย์ผ่านแอดมินหลังตรวจสอบการชำระเงิน",
      warranty: "รับประกันคีย์ตามเงื่อนไขร้าน",
      image: WINDOWS_IMAGE,
      heroImage: WINDOWS_IMAGE,
      tags: ["รองรับฟีเจอร์ Pro ครบ", "BitLocker และ Remote Desktop", "ย้ายเครื่องได้", "เหมาะกับสายทำงาน"],
      description: "คีย์สำหรับเปิดใช้งาน Windows 10 Professional พร้อมฟีเจอร์สำหรับการทำงาน",
      gallery: [WINDOWS_IMAGE],
      platformLinks: [],
      featureBlocks: [],
      detailSections: [],
      steamRelatedLinks: [],
      systemRequirements: { minimum: ["Windows 10 Pro"], recommended: [] },
      isActive: true,
      sortOrder: 8992
    },
    {
      id: "windows-11-home",
      name: "Windows 11 Home",
      publisher: "Microsoft",
      category: "windows",
      label: "OEM",
      price: 199,
      compareAt: 4385,
      stock: 0,
      sold: 0,
      rating: "",
      delivery: "สั่งซื้อและรับคีย์ผ่านแอดมินหลังตรวจสอบการชำระเงิน",
      warranty: "รับประกันคีย์ตามเงื่อนไขร้าน",
      image: WINDOWS_IMAGE,
      heroImage: WINDOWS_IMAGE,
      tags: ["รองรับ Windows 11 ล่าสุด", "License Key Code", "ติดตั้งได้ 1 เครื่อง", "เหมาะกับเครื่องใหม่"],
      description: "คีย์สำหรับเปิดใช้งาน Windows 11 Home จำนวน 1 เครื่อง เหมาะสำหรับการใช้งานทั่วไป",
      gallery: [WINDOWS_IMAGE],
      platformLinks: [],
      featureBlocks: [],
      detailSections: [],
      steamRelatedLinks: [],
      systemRequirements: { minimum: ["Windows 11 Home และอุปกรณ์ที่รองรับ"], recommended: [] },
      isActive: true,
      sortOrder: 8993
    },
    {
      id: "windows-11-pro",
      name: "Windows 11 Pro",
      publisher: "Microsoft",
      category: "windows",
      label: "Retail",
      price: 199,
      compareAt: 4850,
      stock: 0,
      sold: 0,
      rating: "",
      delivery: "สั่งซื้อและรับคีย์ผ่านแอดมินหลังตรวจสอบการชำระเงิน",
      warranty: "รับประกันคีย์ตามเงื่อนไขร้าน",
      image: WINDOWS_IMAGE,
      heroImage: WINDOWS_IMAGE,
      tags: ["รองรับฟีเจอร์ Pro ครบ", "Hyper-V และ Windows Sandbox", "ย้ายเครื่องได้", "เหมาะกับสายมืออาชีพ"],
      description: "คีย์สำหรับเปิดใช้งาน Windows 11 Professional พร้อมฟีเจอร์สำหรับผู้ใช้ระดับมืออาชีพ",
      gallery: [WINDOWS_IMAGE],
      platformLinks: [],
      featureBlocks: [],
      detailSections: [],
      steamRelatedLinks: [],
      systemRequirements: { minimum: ["Windows 11 Pro และอุปกรณ์ที่รองรับ"], recommended: [] },
      isActive: true,
      sortOrder: 8994
    },
    {
      id: "minecraft-microsoft-account",
      name: "Minecraft: Java & Bedrock Edition — Microsoft Account",
      publisher: "Minecraft / Microsoft",
      category: "minecraft-account",
      label: "PRE-ORDER",
      price: 699,
      compareAt: 999,
      // Fallback content is display-only. Supabase must provide real orderable stock.
      stock: 0,
      sold: 0,
      rating: "",
      delivery: "สินค้าแบบพรีออเดอร์ แอดมินตรวจสอบและจัดส่งบัญชี Microsoft ให้ด้วยตนเอง",
      warranty: "รับประกันการเข้าใช้งานตามเงื่อนไขร้าน กรุณาเปลี่ยนข้อมูลหลังได้รับสินค้า",
      image: MINECRAFT_HERO,
      heroImage: MINECRAFT_HERO,
      tags: ["Minecraft", "Microsoft Account", "Java Edition", "Bedrock Edition", "พรีออเดอร์"],
      description:
        "รับบัญชี Microsoft ที่มี Minecraft: Java & Bedrock Edition สำหรับ PC พร้อมใช้งาน เหมาะสำหรับผู้ที่ต้องการเริ่มเล่นทั้งสอง Edition ผ่าน Minecraft Launcher\n\nสินค้าเป็นประเภทพรีออเดอร์ หลังชำระเงินและแนบสลิป แอดมินจะตรวจสอบออเดอร์และจัดส่งข้อมูลบัญชีให้ด้วยตนเอง กรุณาเปลี่ยนอีเมลสำรอง รหัสผ่าน และข้อมูลความปลอดภัยทันทีหลังได้รับสินค้า",
      gallery: [MINECRAFT_HERO],
      platformLinks: [
        {
          label: "Minecraft Official",
          url: "https://www.minecraft.net/en-us/store/minecraft-deluxe-collection-pc",
          icon: "external-link"
        }
      ],
      featureBlocks: [
        { icon: "box", title: "Java + Bedrock", text: "เล่นได้ครบ 2 Edition บน PC" },
        { icon: "user-round-check", title: "Microsoft ID", text: "รับบัญชีพร้อมสิทธิ์เกม" },
        { icon: "clock-3", title: "พรีออเดอร์", text: "แอดมินจัดส่งด้วยตนเอง" },
        { icon: "shield-check", title: "ดูแลหลังขาย", text: "ช่วยตรวจสอบการเข้าใช้งาน" }
      ],
      detailSections: [
        {
          title: "สิ่งที่จะได้รับ",
          body:
            "บัญชี Microsoft พร้อมสิทธิ์ Minecraft: Java & Bedrock Edition สำหรับ PC\nใช้งานผ่าน Minecraft Launcher\nรองรับการเล่นออนไลน์ตามสิทธิ์ของบัญชีและเงื่อนไขของ Microsoft"
        },
        {
          title: "ข้อควรทราบก่อนสั่งซื้อ",
          body:
            "สินค้าไม่ใช่คีย์และไม่สามารถนำไปเติมในบัญชี Microsoft เดิมได้\nกรุณาเปลี่ยนข้อมูลบัญชีและเปิดการยืนยันตัวตนหลังได้รับสินค้า\nระยะเวลาจัดส่งขึ้นอยู่กับคิวตรวจสอบของแอดมิน"
        }
      ],
      steamRelatedLinks: [],
      systemRequirements: {
        minimum: ["OS: Windows 10/11", "บัญชี Microsoft", "Minecraft Launcher", "เชื่อมต่ออินเทอร์เน็ตสำหรับติดตั้งและยืนยันสิทธิ์"],
        recommended: []
      },
      isActive: true,
      sortOrder: 9001
    },
    {
      id: "minecraft-java-bedrock-key",
      name: "Minecraft: Java & Bedrock Edition — Redeem Key",
      publisher: "Minecraft / Microsoft",
      category: "minecraft-key",
      label: "PRE-ORDER KEY",
      price: 899,
      compareAt: 1190,
      // Fallback content is display-only. Supabase must provide real orderable stock.
      stock: 0,
      sold: 0,
      rating: "",
      delivery: "สินค้าแบบพรีออเดอร์ แอดมินจัดส่งคีย์หลังตรวจสอบการชำระเงิน",
      warranty: "รับประกันคีย์ยังไม่ถูกใช้งานก่อนส่งมอบ",
      image: MINECRAFT_HERO,
      heroImage: MINECRAFT_HERO,
      tags: ["Minecraft Key", "Redeem Code", "Java Edition", "Bedrock Edition", "พรีออเดอร์"],
      description:
        "คีย์สำหรับ Redeem Minecraft: Java & Bedrock Edition for PC เข้าบัญชี Microsoft ของลูกค้าเอง เหมาะสำหรับผู้ที่ต้องการถือสิทธิ์เกมบนบัญชีส่วนตัว\n\nสินค้าเป็นประเภทพรีออเดอร์ แอดมินจะจัดส่งคีย์ให้ด้วยตนเองหลังตรวจสอบสลิป กรุณาตรวจสอบโซนบัญชีและเงื่อนไขคีย์ก่อนยืนยันคำสั่งซื้อ",
      gallery: [MINECRAFT_HERO],
      platformLinks: [
        {
          label: "Minecraft Official",
          url: "https://www.minecraft.net/en-us/store/minecraft-deluxe-collection-pc",
          icon: "external-link"
        }
      ],
      featureBlocks: [
        { icon: "key-round", title: "Redeem Key", text: "เติมเข้าบัญชีของคุณเอง" },
        { icon: "box", title: "Java + Bedrock", text: "สิทธิ์เกมสำหรับ PC" },
        { icon: "clock-3", title: "พรีออเดอร์", text: "แอดมินจัดส่งด้วยตนเอง" },
        { icon: "badge-check", title: "คีย์ใหม่", text: "ตรวจสอบก่อนส่งมอบ" }
      ],
      detailSections: [
        {
          title: "สิ่งที่จะได้รับ",
          body:
            "Minecraft Redeem Key จำนวน 1 คีย์\nใช้เติมเข้าบัญชี Microsoft ของลูกค้า\nได้รับสิทธิ์ Java Edition และ Bedrock Edition สำหรับ PC ตามรายละเอียดสินค้า"
        },
        {
          title: "ข้อควรทราบก่อนสั่งซื้อ",
          body:
            "กรุณาตรวจสอบโซนของคีย์ก่อน Redeem\nคีย์ดิจิทัลที่เปิดดูหรือ Redeem แล้วไม่สามารถคืนหรือเปลี่ยนได้\nระยะเวลาจัดส่งขึ้นอยู่กับคิวตรวจสอบของแอดมิน"
        }
      ],
      steamRelatedLinks: [],
      systemRequirements: {
        minimum: ["OS: Windows 10/11", "บัญชี Microsoft", "Minecraft Launcher", "เชื่อมต่ออินเทอร์เน็ตสำหรับ Redeem"],
        recommended: []
      },
      isActive: true,
      sortOrder: 9002
    },
    {
      id: "rockstar-fivem-account",
      name: "Rockstar Games Account สำหรับเข้า FiveM",
      publisher: "Rockstar Games",
      category: "rockstar",
      label: "FIVEM STOCK",
      price: 129,
      compareAt: 199,
      stock: 0,
      sold: 0,
      rating: "",
      delivery: "จัดส่งบัญชีจากสต็อกหลังแอดมินตรวจสอบสลิป",
      warranty: "รับประกันการเข้าใช้งานครั้งแรก กรุณาเปลี่ยนข้อมูลทันทีหลังได้รับสินค้า",
      image: ROCKSTAR_HERO,
      heroImage: ROCKSTAR_HERO,
      tags: ["Rockstar Games", "FiveM", "Rockstar Account", "Stock"],
      description:
        "บัญชี Rockstar Games สำหรับใช้ล็อกอินเพื่อเข้า FiveM เท่านั้น สินค้านี้ไม่รวมเกม GTA V ลูกค้าต้องมีตัวเกม GTA V ที่รองรับอยู่แล้ว และต้องใช้บัญชี Steam ใหม่ที่ไม่เคยเข้า FiveM มาก่อนตามขั้นตอนของร้าน\n\nระบบจะจองบัญชีจากสต็อกจริงเมื่อสร้างคำสั่งซื้อ และแอดมินจะส่งข้อมูลบัญชีให้หลังตรวจสอบการชำระเงิน",
      gallery: [ROCKSTAR_HERO],
      platformLinks: [
        {
          label: "Rockstar Games",
          url: "https://www.rockstargames.com/gta-v",
          icon: "external-link"
        }
      ],
      featureBlocks: [
        { icon: "package-check", title: "สต็อกจริง", text: "จองบัญชีให้กับออเดอร์" },
        { icon: "gamepad-2", title: "สำหรับ FiveM", text: "ใช้เข้า FiveM เท่านั้น" },
        { icon: "triangle-alert", title: "ไม่รวม GTA V", text: "ต้องมีตัวเกมก่อนใช้งาน" },
        { icon: "shield-check", title: "เปลี่ยนข้อมูล", text: "เปลี่ยนทันทีหลังได้รับ" }
      ],
      detailSections: [
        {
          title: "เงื่อนไขสำคัญ",
          body:
            "บัญชีนี้ใช้สำหรับเข้า FiveM เท่านั้น\nสินค้าไม่รวมตัวเกม GTA V\nต้องใช้บัญชี Steam ใหม่ที่ไม่เคยเข้า FiveM มาก่อน\nกรุณาเปลี่ยนข้อมูลบัญชี Rockstar ให้เรียบร้อยทันทีหลังได้รับสินค้า"
        }
      ],
      steamRelatedLinks: [],
      systemRequirements: {
        minimum: ["มี GTA V ที่รองรับ FiveM", "ติดตั้ง Rockstar Games Launcher", "ติดตั้ง Steam", "ติดตั้ง FiveM"],
        recommended: []
      },
      isActive: true,
      sortOrder: 9010
    }
  ];

  function isExtraCategory(category) {
    return ["windows", "minecraft-account", "minecraft-key", "rockstar"].includes(
      String(category || "").trim().toLowerCase()
    );
  }

  function getProductById(productId) {
    return products.find((product) => product.id === productId) || null;
  }

  function mergeProducts(onlineProducts = []) {
    const byId = new Map(products.map((product) => [product.id, { ...product }]));
    (Array.isArray(onlineProducts) ? onlineProducts : []).forEach((product) => {
      if (!product?.id || !isExtraCategory(product.category)) return;
      byId.set(product.id, { ...(byId.get(product.id) || {}), ...product });
    });
    return [...byId.values()].filter((product) => product.isActive !== false);
  }

  window.OlafExtraProducts = {
    categories,
    products,
    isExtraCategory,
    getProductById,
    mergeProducts
  };
})();
