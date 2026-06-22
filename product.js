const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const productId = params.get("id");
let globalPayload = null;
let currentProduct = null;
let detailQuantity = 1;
let currentLang = localStorage.getItem("olafshop_lang") || "th";
let currentQrOrder = null;
let qrSlipInput = null;
let currentProductPackages = [];
let selectedPackageId = null;
let iconRefreshQueued = false;

const productEndpoints = [
  window.OLAF_CONFIG?.productsEndpoint,
  "api/products.json",
  "/api/products.json",
  "./api/products.json"
].filter(Boolean);

const suggestionLimit = 40;

const formatPrice = (v) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(Number(v) || 0);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

const categoryBadgeLabels = {
  "steam-key": "STEAM KEY",
  "steam-account": "ไอดียกเมล",
  offline: "OFFLINE",
  bundle: "แพ็กเกม",
  "minecraft-account": "MICROSOFT ID",
  "minecraft-key": "MINECRAFT KEY",
  rockstar: "ROCKSTAR / FIVEM"
};

const categoryTagFallbacks = {
  "steam-key": ["คีย์แท้", "เปิดใช้งานบน Steam", "พร้อมใช้งาน", "เกมพีซี", "แอ็กชัน"],
  "steam-account": ["ไอดียกเมล", "พร้อมเล่น", "เข้าเล่นได้", "เกมพีซี", "คุ้มค่า"],
  offline: ["ออฟไลน์", "พร้อมใช้งาน", "ติดตั้งง่าย", "เกมพีซี", "เล่นได้ต่อเนื่อง"],
  bundle: ["แพ็กเกม", "หลายรายการ", "คุ้มราคา", "พร้อมใช้งาน", "เกมพีซี"],
  "minecraft-account": ["Minecraft", "Microsoft ID", "Java + Bedrock", "พรีออเดอร์"],
  "minecraft-key": ["Minecraft", "Redeem Key", "Java + Bedrock", "พรีออเดอร์"],
  rockstar: ["Rockstar Games", "FiveM", "บัญชีจากสต็อก", "ไม่รวม GTA V"]
};

const tagTranslations = new Map([
  ["action", "แอ็กชัน"],
  ["adventure", "ผจญภัย"],
  ["rpg", "สวมบทบาท"],
  ["strategy", "วางแผน"],
  ["simulation", "จำลองสถานการณ์"],
  ["sports", "กีฬา"],
  ["racing", "แข่งรถ"],
  ["casual", "เล่นสบาย"],
  ["indie", "อินดี้"],
  ["single-player", "เล่นคนเดียว"],
  ["singleplayer", "เล่นคนเดียว"],
  ["multi-player", "ผู้เล่นหลายคน"],
  ["multiplayer", "ผู้เล่นหลายคน"],
  ["co-op", "ร่วมมือกัน"],
  ["online co-op", "ร่วมมือออนไลน์"],
  ["online co op", "ร่วมมือออนไลน์"],
  ["local co-op", "ร่วมมือในเครื่อง"],
  ["pvp", "แข่งขัน"],
  ["online pvp", "แข่งขันออนไลน์"],
  ["open world", "โลกเปิด"],
  ["story rich", "เนื้อเรื่องเข้มข้น"],
  ["story-driven", "เนื้อเรื่องเด่น"],
  ["souls-like", "โซลส์ไลก์"],
  ["soulslike", "โซลส์ไลก์"],
  ["sandbox", "แซนด์บ็อกซ์"],
  ["survival", "เอาตัวรอด"],
  ["survival horror", "สยองขวัญเอาตัวรอด"],
  ["horror", "สยองขวัญ"],
  ["fps", "ยิงมุมมองบุคคลที่หนึ่ง"],
  ["third-person", "บุคคลที่สาม"],
  ["third person", "บุคคลที่สาม"],
  ["shooter", "ยิง"],
  ["stealth", "ลอบเร้น"],
  ["roguelike", "โร้กไลก์"],
  ["rogue-lite", "โร้กไลต์"],
  ["roguelite", "โร้กไลต์"],
  ["anime", "อนิเมะ"],
  ["fantasy", "แฟนตาซี"],
  ["sci-fi", "ไซไฟ"],
  ["sci fi", "ไซไฟ"],
  ["mmo", "ออนไลน์ขนาดใหญ่"],
  ["building", "สร้างสิ่งปลูกสร้าง"],
  ["crafting", "คราฟต์ของ"],
  ["exploration", "สำรวจ"],
  ["combat", "ต่อสู้"],
  ["turn-based", "เทิร์นเบส"],
  ["turn based", "เทิร์นเบส"],
  ["platformer", "ตะลุยด่าน"],
  ["puzzle", "ปริศนา"],
  ["mystery", "ลึกลับ"],
  ["dating sim", "จำลองความสัมพันธ์"],
  ["visual novel", "วิชวลโนเวล"],
  ["choices matter", "ตัวเลือกมีผล"],
  ["controller", "รองรับจอย"],
  ["controller support", "รองรับจอย"],
  ["full controller support", "รองรับจอยเต็มรูปแบบ"],
  ["partial controller support", "รองรับจอยบางส่วน"],
  ["downloadable content", "เนื้อหาเสริม"],
  ["adjustable text size", "ปรับขนาดข้อความได้"],
  ["camera comfort", "ปรับมุมกล้องเพื่อความสบายได้"],
  ["chat speech-to-text", "แปลงเสียงสนทนาเป็นข้อความ"],
  ["chat text-to-speech", "อ่านข้อความสนทนาเป็นเสียง"],
  ["color alternatives", "ปรับรูปแบบสีได้"],
  ["custom volume controls", "ปรับระดับเสียงแยกได้"],
  ["adjustable difficulty", "ปรับระดับความยากได้"],
  ["playable without timed input", "เล่นได้โดยไม่จำกัดเวลากด"],
  ["stereo sound", "เสียงสเตอริโอ"],
  ["surround sound", "เสียงรอบทิศทาง"],
  ["cross-platform multiplayer", "เล่นข้ามแพลตฟอร์ม"],
  ["shared/split screen", "แบ่งจอร่วมกัน"],
  ["family sharing", "แชร์คลังครอบครัว"],
  ["steam achievements", "มีความสำเร็จ"],
  ["steam cloud", "บันทึกผ่านคลาวด์"]
]);

function fastImg(src, alt = "", options = {}) {
  if (window.OlafImages?.attrs) return window.OlafImages.attrs(src, alt, options);
  const loading = options.priority ? "eager" : "lazy";
  const fetchPriority = options.priority ? "high" : "low";
  const className = options.className ? ` class="${escapeHtml(options.className)}"` : "";
  return `${className} src="${escapeHtml(src || "")}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"`;
}

function fastBg(src) {
  if (window.OlafImages?.bgAttrs) return window.OlafImages.bgAttrs(src);
  return src ? `style="background-image: url('${escapeHtml(src)}');"` : "";
}

function hydrateImages() {
  if (window.OlafImages?.scheduleHydrate) {
    window.OlafImages.scheduleHydrate(document);
    return;
  }
  window.OlafImages?.hydrate?.(document);
}

function withTimeout(promise, ms, fallback) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve) => {
      timer = window.setTimeout(() => resolve(fallback), ms);
    })
  ]).finally(() => window.clearTimeout(timer));
}

function createIconSet() {
  if (iconRefreshQueued) return;
  iconRefreshQueued = true;
  window.requestAnimationFrame(() => {
    iconRefreshQueued = false;
    if (window.OlafIcons?.refresh) {
      window.OlafIcons.refresh();
      return;
    }
    window.lucide?.createIcons?.();
  });
}

function setTextContent(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function formatOrderReference(order) {
  const reference = String(order?.orderNumber || order?.id || "").trim();
  if (!reference) return "-";
  return reference.startsWith("#") ? reference : `#${reference}`;
}

function productImageForCheckout(product) {
  if (!product) return "";
  if (product.image) return product.image;
  if (product.heroImage) return product.heroImage;
  if (Array.isArray(product.gallery) && product.gallery[0]) return product.gallery[0];
  return "";
}

function showToast(message, type = "success", duration = 3500, action = null) {
  const container = document.querySelector("#toast-container");
  if (!container) return;
  const iconMap = {
    success: "check-circle",
    error: "alert-circle",
    info: "info",
    warning: "alert-triangle",
    payment: "credit-card"
  };
  const icon = iconMap[type] || "check-circle";
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const actionHtml = action?.href && action?.label
    ? `<a class="toast-action" href="${escapeHtml(action.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.label)}</a>`
    : "";
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span>${actionHtml}`;
  container.appendChild(toast);
  createIconSet();
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

function applySiteIcon(iconUrl) {
  const url = String(iconUrl || "").trim();
  if (!url) {
    document.querySelector("#dynamic-favicon")?.remove();
    return;
  }
  let link = document.querySelector("#dynamic-favicon");
  if (!link) {
    link = document.createElement("link");
    link.id = "dynamic-favicon";
    link.rel = "icon";
    document.head.append(link);
  }
  link.href = url;
}

function applyBrandIcon(iconUrl) {
  const url = String(iconUrl || "").trim();
  document.querySelectorAll(".brand-mark").forEach((mark) => {
    mark.innerHTML = url ? `<img ${fastImg(url, "OLAF SHOP", { priority: true })} />` : "O";
  });
}

async function loadStore() {
  globalPayload = null;

  try {
    const [payload, storeSettings] = await Promise.all([
      fetchSupabaseProductPayload(),
      fetchOnlineStoreSettings(true)
    ]);
    globalPayload = {
      ...payload,
      store: mergeStoreSettings(payload?.store ?? {}, storeSettings)
    };
  } catch (error) {
    console.warn("Supabase product unavailable; using JSON fallback", error);
    const [payload, storeSettings] = await Promise.all([
      fetchStorePayload(),
      fetchOnlineStoreSettings(true)
    ]);
    const extraProducts = Array.isArray(window.OlafExtraProducts?.products)
      ? window.OlafExtraProducts.products
      : [];
    const productsById = new Map(
      [...(Array.isArray(payload?.products) ? payload.products : []), ...extraProducts]
        .filter((product) => product?.id)
        .map((product) => [product.id, product])
    );
    const products = [...productsById.values()];
    globalPayload = {
      ...payload,
      products,
      categories: deriveCategories(products, payload?.categories),
      store: mergeStoreSettings(payload?.store ?? {}, storeSettings)
    };
  }

  if (globalPayload) {
    applySiteIcon(globalPayload.store?.siteIconUrl);
    applyBrandIcon(globalPayload.store?.siteIconUrl);
  }
}

function mergeStoreSettings(baseStore = {}, onlineSettings = {}) {
  const settings = onlineSettings && typeof onlineSettings === "object" ? { ...onlineSettings } : {};
  delete settings.updatedAt;
  return {
    ...(baseStore ?? {}),
    ...settings,
    support: {
      ...(baseStore?.support ?? {}),
      ...(settings.support ?? {})
    },
    payment: {
      ...(baseStore?.payment ?? {}),
      ...(settings.payment ?? {})
    }
  };
}

async function fetchOnlineStoreSettings(quiet = false) {
  if (!window.OlafStoreSettings?.fetchStoreSettings) return {};
  try {
    return await window.OlafStoreSettings.fetchStoreSettings();
  } catch (error) {
    if (!quiet) console.warn("Store settings unavailable", error);
    return {};
  }
}

async function fetchSupabaseProductPayload() {
  if (!window.OlafProducts?.fetchProductById) {
    throw new Error("Supabase product client is not ready");
  }

  const jsonPayloadPromise = fetchStorePayload(true).catch((error) => {
    console.warn("Product JSON settings unavailable while using Supabase product", error);
    return null;
  });

  if (!productId) {
    const jsonPayload = await jsonPayloadPromise;
    return {
      store: jsonPayload?.store ?? {},
      categories: deriveCategories([], jsonPayload?.categories),
      products: []
    };
  }

  const [jsonPayload, onlineProduct] = await Promise.all([
    jsonPayloadPromise,
    window.OlafProducts.fetchProductById(productId)
  ]);
  const jsonProduct = Array.isArray(jsonPayload?.products)
    ? jsonPayload.products.find((item) => item?.id === productId) || null
    : null;
  const extraFallback = window.OlafExtraProducts?.getProductById?.(productId) || null;
  const product = onlineProduct
    ? { ...(jsonProduct || {}), ...(extraFallback || {}), ...onlineProduct }
    : extraFallback
      ? { ...(jsonProduct || {}), ...extraFallback }
      : jsonProduct;
  if (!product) {
    return {
      store: jsonPayload?.store ?? {},
      categories: deriveCategories([], jsonPayload?.categories),
      products: []
    };
  }

  const activePackages = window.OlafProducts.fetchActiveProductPackages
    ? await window.OlafProducts.fetchActiveProductPackages(product.id).catch((error) => {
        console.warn("Product packages unavailable; falling back to base product pricing", error);
        return [];
      })
    : [];
  const enrichedProduct = { ...product, packages: activePackages };

  const supabaseProducts = await withTimeout(window.OlafProducts.fetchActiveProducts(), 2500, []).catch((error) => {
    console.warn("Supabase product list unavailable for search suggestions", error);
    return [];
  });
  const jsonProducts = Array.isArray(jsonPayload?.products) ? jsonPayload.products : [];
  const extraProducts = Array.isArray(window.OlafExtraProducts?.products)
    ? window.OlafExtraProducts.products
    : [];
  const productsById = new Map();
  jsonProducts.forEach((item) => {
    if (item?.id) productsById.set(item.id, item);
  });
  extraProducts.forEach((item) => {
    if (item?.id) productsById.set(item.id, { ...(productsById.get(item.id) || {}), ...item });
  });
  supabaseProducts.forEach((item) => {
    if (item?.id) productsById.set(item.id, { ...(productsById.get(item.id) || {}), ...item });
  });
  let products = [...productsById.values()];
  if (!products.some((item) => item.id === product.id)) {
    products = [enrichedProduct, ...products];
  } else {
    products = products.map((item) => item.id === product.id ? { ...item, ...enrichedProduct } : item);
  }

  return {
    updatedAt: new Date().toISOString(),
    store: jsonPayload?.store ?? {},
    categories: deriveCategories(products, jsonPayload?.categories),
    products
  };
}

function deriveCategories(products, fallbackCategories = []) {
  const labels = new Map((fallbackCategories || []).map((category) => [category.id, category.label]));
  const defaultLabels = {
    "steam-key": "คีย์ Steam",
    "steam-account": "ไอดียกเมล",
    offline: "Steam Offline",
    bundle: "แพ็กเกม",
    "minecraft-account": "Minecraft — Microsoft ID",
    "minecraft-key": "Minecraft — Key",
    rockstar: "Rockstar / FiveM"
  };
  const categoryIds = [...new Set(products.map((product) => product.category).filter(Boolean))];
  return [
    { id: "all", label: labels.get("all") || "ทั้งหมด" },
    ...categoryIds.map((id) => ({ id, label: labels.get(id) || defaultLabels[id] || id }))
  ];
}

async function fetchStorePayload(quiet = false) {
  let lastError = null;
  for (const endpoint of productEndpoints) {
    try {
      const res = await fetch(endpoint, { cache: "default" });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${endpoint}`);
        continue;
      }
      const payload = await res.json();
      if (Array.isArray(payload?.products)) return payload;
      if (Array.isArray(payload)) return { products: payload };
      lastError = new Error(`Invalid products payload from ${endpoint}`);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError && !quiet) console.error("Products API unavailable", lastError);
  return null;
}

function getStockState(stock) {
  if (stock > 10) return { label: "มีสินค้า", className: "in-stock" };
  if (stock > 0) return { label: `เหลือ ${stock} ชิ้น`, className: "low-stock" };
  return { label: "สินค้าหมด", className: "out-stock" };
}

function isMinecraftProduct(product = currentProduct) {
  return String(product?.category || "").startsWith("minecraft-");
}

function isRockstarProduct(product = currentProduct) {
  return String(product?.category || "") === "rockstar";
}

function purchaseButtonCopy(product, canBuy) {
  if (!canBuy) return "สินค้าหมด";
  if (isMinecraftProduct(product)) return "สั่งซื้อแบบพรีออเดอร์";
  if (isRockstarProduct(product)) return "สั่งซื้อจากสต็อก";
  return "ซื้อเลยตอนนี้";
}

function getDiscount(p) {
  if (!p.compareAt || p.price >= p.compareAt) return 0;
  return Math.round(((p.compareAt - p.price) / p.compareAt) * 100);
}

function getDiscountForValues(price, compareAt) {
  const currentPrice = Number(price || 0);
  const currentCompare = Number(compareAt || 0);
  if (!currentCompare || currentPrice >= currentCompare) return 0;
  return Math.round(((currentCompare - currentPrice) / currentCompare) * 100);
}

function normalizeProductPackage(pkg, index = 0) {
  if (!pkg || typeof pkg !== "object") return null;
  const title = cleanDisplayText(pkg.title || pkg.name || "");
  if (!title) return null;
  return {
    id: String(pkg.id || `package-${index}`).trim(),
    title,
    subtitle: cleanDisplayText(pkg.subtitle || ""),
    description: cleanDisplayText(pkg.description || ""),
    price: Number(pkg.price || 0),
    compareAt: pkg.compareAt == null ? null : Number(pkg.compareAt),
    stock: Number(pkg.stock || 0),
    sold: Number(pkg.sold || 0),
    status: pkg.status || "active",
    sortOrder: Number(pkg.sortOrder || index),
    badge: String(pkg.badge || "").trim(),
    metadata: pkg.metadata && typeof pkg.metadata === "object" ? pkg.metadata : {}
  };
}

function activePackagesForProduct(product) {
  const packages = Array.isArray(product?.packages)
    ? product.packages
    : Array.isArray(product?.productPackages)
      ? product.productPackages
      : [];
  return packages
    .map(normalizeProductPackage)
    .filter((pkg) => pkg && pkg.status === "active")
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

function selectedPackage() {
  if (!selectedPackageId) return null;
  return currentProductPackages.find((pkg) => pkg.id === selectedPackageId) || null;
}

function getPurchaseOption(product = currentProduct) {
  const pkg = selectedPackage();
  const source = pkg || product || {};
  return {
    packageId: pkg?.id || "",
    packageTitle: pkg?.title || "",
    packageSubtitle: pkg?.subtitle || "",
    price: Number(source.price || 0),
    compareAt: source.compareAt == null ? null : Number(source.compareAt),
    stock: Number(source.stock || 0),
    hasPackage: Boolean(pkg)
  };
}

function renderPriceCompare(compareAt, price) {
  return compareAt && Number(price || 0) < Number(compareAt)
    ? `<span class="pd-price-compare" data-purchase-compare>${formatPrice(compareAt)}</span>`
    : `<span class="pd-price-compare" data-purchase-compare hidden></span>`;
}

function renderDiscountBadge(price, compareAt) {
  const discount = getDiscountForValues(price, compareAt);
  return discount
    ? `<span class="pd-price-discount" data-purchase-discount>-${discount}%</span>`
    : `<span class="pd-price-discount" data-purchase-discount hidden></span>`;
}

function renderStockDisplay(stockValue) {
  const stock = getStockState(stockValue);
  return stockValue > 0
    ? `<span class="stock-pill ${stock.className}">${stock.label}</span>`
    : `<span class="pd-out-badge"><i data-lucide="package-x"></i>${stock.label}</span>`;
}

function updatePurchaseDom() {
  if (!currentProduct) return;
  const purchase = getPurchaseOption(currentProduct);
  const canBuy = purchase.stock > 0;
  const compareEl = $("[data-purchase-compare]");
  const discountEl = $("[data-purchase-discount]");
  const buyBtn = $("#btn-buy");
  const stockEl = $("[data-purchase-stock]");

  setTextContent("[data-purchase-price]", formatPrice(purchase.price));
  if (compareEl) {
    if (purchase.compareAt && purchase.price < purchase.compareAt) {
      compareEl.hidden = false;
      compareEl.textContent = formatPrice(purchase.compareAt);
    } else {
      compareEl.hidden = true;
      compareEl.textContent = "";
    }
  }

  if (discountEl) {
    const discount = getDiscountForValues(purchase.price, purchase.compareAt);
    if (discount) {
      discountEl.hidden = false;
      discountEl.textContent = `-${discount}%`;
    } else {
      discountEl.hidden = true;
      discountEl.textContent = "";
    }
  }

  if (stockEl) stockEl.innerHTML = renderStockDisplay(purchase.stock);
  if (buyBtn) {
    buyBtn.disabled = !canBuy;
    buyBtn.innerHTML = `<i data-lucide="${isMinecraftProduct() ? "clock-3" : "shopping-cart"}"></i>${purchaseButtonCopy(currentProduct, canBuy)}`;
  }

  document.querySelectorAll("[data-package-option]").forEach((card) => {
    const isSelected = card.dataset.packageOption === purchase.packageId;
    card.classList.toggle("is-selected", isSelected);
    const input = card.querySelector('input[type="radio"]');
    if (input) input.checked = isSelected;
  });

  createIconSet();
}

async function refreshCurrentProduct() {
  if (!currentProduct?.id) return null;
  const productPromise = window.OlafProducts?.fetchProductById
    ? window.OlafProducts.fetchProductById(currentProduct.id).catch(() => null)
    : Promise.resolve(null);
  const packagesPromise = window.OlafProducts?.fetchActiveProductPackages
    ? window.OlafProducts.fetchActiveProductPackages(currentProduct.id).catch(() => currentProductPackages)
    : Promise.resolve(currentProductPackages);
  const [freshProduct, freshPackages] = await Promise.all([
    productPromise,
    packagesPromise
  ]);
  const extraFallback = window.OlafExtraProducts?.getProductById?.(currentProduct.id) || {};
  const nextProduct = freshProduct ? { ...extraFallback, ...freshProduct, packages: freshPackages || [] } : {
    ...currentProduct,
    packages: freshPackages || currentProductPackages
  };
  currentProduct = nextProduct;
  currentProductPackages = activePackagesForProduct(nextProduct);
  if (currentProductPackages.length && !currentProductPackages.some((pkg) => pkg.id === selectedPackageId)) {
    selectedPackageId = currentProductPackages[0].id;
  } else if (!currentProductPackages.length) {
    selectedPackageId = null;
  }
  if (globalPayload?.products) {
    globalPayload.products = globalPayload.products.map((item) => item.id === nextProduct.id ? nextProduct : item);
  }
  return nextProduct;
}

function getCategoryLabel(categoryId) {
  return cleanDisplayText(
    globalPayload?.categories?.find((category) => category.id === categoryId)?.label ||
    {
      "steam-key": "คีย์ Steam",
      "steam-account": "ไอดียกเมล",
      offline: "Steam Offline",
      bundle: "แพ็กเกม",
      "minecraft-account": "Minecraft — Microsoft ID",
      "minecraft-key": "Minecraft — Key",
      rockstar: "Rockstar / FiveM"
    }[categoryId] ||
    categoryId ||
    "สินค้า"
  );
}

function getProductBadgeLabel(categoryId, fallbackLabel = "") {
  return categoryBadgeLabels[categoryId] || cleanDisplayText(fallbackLabel || "STEAM") || "STEAM";
}

function getProductBadgeClass(categoryId) {
  return {
    "steam-key": "pd-badge-key",
    "steam-account": "pd-badge-account",
    offline: "pd-badge-offline",
    bundle: "pd-badge-bundle",
    "minecraft-account": "pd-badge-minecraft",
    "minecraft-key": "pd-badge-minecraft",
    rockstar: "pd-badge-rockstar"
  }[categoryId] || "pd-badge-steam";
}

function getDisplayProductName(product) {
  const name = cleanDisplayText(product?.name || "");
  if (!name) return "";
  if (String(product?.category || "").toLowerCase() !== "offline") return name;
  return /\[offline\]\s*$/i.test(name) ? name : `${name} [OFFLINE]`;
}

function translateTagToThai(tag) {
  const cleanTag = cleanDisplayText(tag);
  if (!cleanTag) return "";
  if (/[\u0E00-\u0E7F]/.test(cleanTag)) return cleanTag;
  return tagTranslations.get(cleanTag.toLowerCase()) || "";
}

function getDisplayTags(product, limit = 5) {
  const translated = (product?.tags || [])
    .map(translateTagToThai)
    .filter(Boolean);
  const fallback = categoryTagFallbacks[product?.category] || [];
  return [...new Set([...translated, ...fallback])].slice(0, limit);
}

function getSidebarDisplayTags(product) {
  if (String(product?.category || "").toLowerCase() !== "offline") {
    return getDisplayTags(product, 5);
  }

  const thaiTags = getDisplayTags(product, 6);
  if (!thaiTags.length) return [];

  const longestTag = Math.max(...thaiTags.map((tag) => tag.length));
  const maxItems = longestTag > 28 ? 3 : longestTag > 18 ? 4 : 6;
  const characterBudget = longestTag > 28 ? 52 : longestTag > 18 ? 60 : 68;
  const selected = [];
  let usedCharacters = 0;

  for (const tag of thaiTags) {
    const nextCost = tag.length + (selected.length ? 3 : 0);
    if (selected.length >= maxItems) break;
    if (selected.length > 1 && usedCharacters + nextCost > characterBudget) break;
    selected.push(tag);
    usedCharacters += nextCost;
  }

  return selected;
}

function cleanDisplayText(value = "") {
  const replacements = [
    ["à¹à¸‡à¹ˆà¸šà¸§à¸à¹€à¸›à¹‡à¸™à¸­à¸¢à¹ˆà¸²à¸‡à¸¡à¸²à¸", "แง่บวกเป็นอย่างมาก"],
    ["à¹à¸‡à¹ˆà¸šà¸§à¸à¹€à¸›à¹‡à¸™à¸ªà¹ˆà¸§à¸™à¸¡à¸²à¸", "แง่บวกเป็นส่วนมาก"],
    ["à¸œà¸ªà¸¡à¸à¸±à¸™", "ผสมกัน"],
    ["à¸£à¸µà¸§à¸´à¸§", "รีวิว"],
    ["Â®", "®"],
    ["Â©", "©"],
    ["Â", ""],
    ["â„¢", "™"],
    ["â€¢", "•"],
    ["â€“", "–"],
    ["â€”", "—"],
    ["â€¦", "..."],
    ["â€˜", "‘"],
    ["â€™", "’"],
    ["â€œ", "“"],
    ["â€", "”"],
    ["ã€€", " "],
    ["\u00a0", " "]
  ];
  let next = String(value || "");
  const mojibakePattern = /(?:à¸|à¹|Ã.|Â.|â€|â„¢|ã€€|ï¿½|�)/g;
  const mojibakeScore = (text) => (String(text || "").match(mojibakePattern) || []).length;
  const windows1252Bytes = new Map([
    [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
    [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
    [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
    [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
    [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
    [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
    [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f]
  ]);
  const toLegacyBytes = (text) => {
    const bytes = [];
    for (const char of Array.from(text)) {
      const code = char.charCodeAt(0);
      if (code <= 0xff) {
        bytes.push(code);
      } else if (windows1252Bytes.has(code)) {
        bytes.push(windows1252Bytes.get(code));
      } else {
        return null;
      }
    }
    return Uint8Array.from(bytes);
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const currentScore = mojibakeScore(next);
    if (!currentScore || /[\u0E00-\u0E7F]/.test(next)) break;

    let decoded = next;
    try {
      const bytes = toLegacyBytes(next);
      if (!bytes) break;
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (error) {
      try {
        decoded = decodeURIComponent(escape(next));
      } catch (decodeError) {
        break;
      }
    }

    if (!decoded || decoded === next || mojibakeScore(decoded) >= currentScore) break;
    next = decoded;
  }

  replacements.forEach(([from, to]) => {
    next = next.split(from).join(to);
  });
  return next
    .replace(/\uFFFD/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

window.OlafText = {
  ...(window.OlafText || {}),
  clean: cleanDisplayText
};

function translateRequirementLabel(label) {
  const normalized = cleanDisplayText(label).replace(/^[•●▪⬢■◆◇◦◉\s]+/, "").replace(/:$/, "").trim().toLowerCase();
  return (
    {
      os: "ระบบปฏิบัติการ",
      processor: "หน่วยประมวลผล",
      memory: "หน่วยความจำ",
      graphics: "การ์ดจอ",
      directx: "DirectX",
      network: "เครือข่าย",
      storage: "พื้นที่ว่าง",
      "sound card": "การ์ดเสียง",
      "additional notes": "หมายเหตุเพิ่มเติม"
    }[normalized] || cleanDisplayText(label).replace(/:$/, "").trim()
  );
}

function localizeRequirementLine(line) {
  const cleaned = cleanDisplayText(line);
  if (!cleaned) return "";
  if (currentLang !== "th") return cleaned;

  const withoutBullet = cleaned.replace(/^[•●▪⬢■◆◇◦◉\s]+/, "");
  const lower = withoutBullet.toLowerCase();
  if (lower === "requires a 64-bit processor and operating system") {
    return "ต้องใช้ระบบปฏิบัติการและหน่วยประมวลผลแบบ 64 บิต";
  }

  const colonIdx = withoutBullet.indexOf(":");
  if (colonIdx > 0) {
    const rawLabel = withoutBullet.slice(0, colonIdx).trim();
    const rawValue = cleanDisplayText(withoutBullet.slice(colonIdx + 1)).trim();
    return `${translateRequirementLabel(rawLabel)}: ${rawValue}`;
  }

  return withoutBullet;
}

function buildSteamInfoSection(product) {
  const tags = getDisplayTags(product, 5);
  const rows = [
    product?.publisher ? `ผู้จัดจำหน่าย: ${cleanDisplayText(product.publisher)}` : "",
    `หมวดสินค้า: ${getCategoryLabel(product?.category)}`,
    tags.length ? `แท็กเด่นบน STEAM: ${tags.join(", ")}` : "",
    product?.rating ? `รีวิวโดยรวม: ${getLocalizedRating(product.rating)}` : ""
  ].filter(Boolean);
  return rows.join("\n");
}

function getLocalizedDelivery(product) {
  if (currentLang !== "th") return cleanDisplayText(product?.delivery || "");
  if (String(product?.category || "").startsWith("minecraft-")) {
    return "พรีออเดอร์ — แอดมินตรวจสอบและจัดส่งสินค้าให้ด้วยตนเอง";
  }
  if (product?.category === "rockstar") {
    return "จัดส่งบัญชีจากสต็อกจริงหลังแอดมินตรวจสอบสลิป";
  }
  return "รับข้อมูลสินค้าหลังแอดมินตรวจสอบสลิปเรียบร้อย";
}

function getLocalizedWarranty(product) {
  if (currentLang !== "th") return cleanDisplayText(product?.warranty || "");
  if (product?.category === "steam-account") return "รับประกันการเข้าใช้งาน 30 วัน";
  if (String(product?.category || "").startsWith("minecraft-")) {
    return cleanDisplayText(product?.warranty || "") || "รับประกันตามเงื่อนไขสินค้าพรีออเดอร์";
  }
  if (product?.category === "rockstar") {
    return cleanDisplayText(product?.warranty || "") || "รับประกันการเข้าใช้งานครั้งแรก";
  }
  if (product?.category === "offline" || product?.category === "steam-key") {
    return "รับประกันการเข้าใช้งานตลอดชีพ";
  }
  return cleanDisplayText(product?.warranty || "") || "สอบถามเงื่อนไขการรับประกันกับแอดมิน";
}

function getLocalizedRating(rating) {
  const cleaned = cleanDisplayText(rating);
  if (!cleaned) return "อ้างอิงรีวิวจาก STEAM";
  if (currentLang !== "th" || /[\u0E00-\u0E7F]/.test(cleaned)) return cleaned;
  const reviewCount = cleaned.match(/[\d,]+\s*(?:reviews?|รีวิว)?/i)?.[0] || "";
  return reviewCount ? `อ้างอิงจาก STEAM | ${reviewCount}` : "อ้างอิงรีวิวจาก STEAM";
}

function getLocalizedPlatformLabel(link = {}) {
  const icon = String(link.icon || "").toLowerCase();
  const url = String(link.url || "").toLowerCase();
  if (currentLang === "th") {
    if (icon.includes("book") || url.includes("gitbook")) return "คู่มือ";
    if (icon.includes("store") || url.includes("facebook")) return "ติดต่อร้าน";
  }
  return cleanDisplayText(link.label || "เปิดลิงก์");
}

function localizeSectionBody(body, product = null, title = "") {
  const cleaned = cleanDisplayText(body);
  if (currentLang !== "th") return cleaned;
  if (product && /steam/i.test(title)) {
    return buildSteamInfoSection(product);
  }

  return cleaned
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx < 0) return trimmed;

      const rawLabel = trimmed.slice(0, colonIdx).trim();
      const rawValue = trimmed.slice(colonIdx + 1).trim();

      if (rawLabel === "แนวเกม" || rawLabel === "แท็กหลักบน STEAM") {
        const translated = rawValue
          .split(",")
          .map((item) => translateTagToThai(item) || cleanDisplayText(item).trim())
          .filter(Boolean)
          .slice(0, 5)
          .join(", ");
        return `${rawLabel}: ${translated}`;
      }

      return `${cleanDisplayText(rawLabel)}: ${cleanDisplayText(rawValue)}`;
    })
    .join("\n");
}

function localizeSectionTitle(title = "") {
  const cleaned = cleanDisplayText(title);
  if (currentLang !== "th") return cleaned;
  if (/steam/i.test(cleaned)) return "ข้อมูลจาก STEAM";
  return cleaned || "ข้อมูลสินค้า";
}

function isSteamInfoDetailSection(section) {
  return localizeSectionTitle(section?.title || "") === "ข้อมูลจาก STEAM";
}

function buildThaiDescription(product) {
  const tags = getDisplayTags(product, 5);
  const categoryLabel = getCategoryLabel(product?.category);
  const lines = [
    `${product?.name || "สินค้านี้"} อยู่ในหมวด ${categoryLabel} และอ้างอิงข้อมูลจากแพลตฟอร์ม Steam เหมาะสำหรับลูกค้าที่ต้องการดูข้อมูลสรุปก่อนสั่งซื้อแบบอ่านง่าย`,
    product?.publisher ? `ผู้จัดจำหน่าย: ${cleanDisplayText(product.publisher)}` : "",
    tags.length ? `แท็กเด่น: ${tags.join(", ")}` : "",
    product?.rating ? `รีวิวโดยรวม: ${getLocalizedRating(product.rating)}` : "",
    `การจัดส่ง: ${getLocalizedDelivery(product)}`,
    `การรับประกัน: ${getLocalizedWarranty(product)}`,
    "สามารถเลื่อนลงไปดูรูปตัวอย่าง ความต้องการระบบ และข้อมูลเพิ่มเติมของสินค้าได้ด้านล่าง"
  ].filter(Boolean);
  return lines.join("\n\n");
}

function getAdminProductDescription(product) {
  const cleaned = cleanDisplayText(product?.description || "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const lines = cleaned.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 8) return cleaned;
  return `${lines.slice(0, 8).join("\n")}\n…`;
}

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function searchProducts(query) {
  const keyword = normalizeSearchText(query);
  if (!keyword || !Array.isArray(globalPayload?.products)) return [];

  return globalPayload.products
    .map((product) => {
      const categoryLabel = getCategoryLabel(product.category);
      const searchable = [
        product.name,
        product.publisher,
        product.id,
        product.category,
        categoryLabel,
        product.label,
        product.rating,
        ...(product.tags || []),
        ...getDisplayTags(product, 5)
      ]
        .map(normalizeSearchText)
        .join(" ");
      const name = normalizeSearchText(product.name);
      const startsWithName = name.startsWith(keyword);
      const exactName = name === keyword;
      const includes = searchable.includes(keyword);

      if (!includes) return null;

      return {
        product,
        categoryLabel,
        score: (exactName ? 100 : 0) + (startsWithName ? 40 : 0) + Number(product.sold || 0) / 10000
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, suggestionLimit);
}

function highlightMatch(text, query) {
  const source = String(text || "");
  const keyword = String(query || "").trim();
  if (!keyword) return escapeHtml(source);

  const index = source.toLowerCase().indexOf(keyword.toLowerCase());
  if (index < 0) return escapeHtml(source);

  return `${escapeHtml(source.slice(0, index))}<mark>${escapeHtml(source.slice(index, index + keyword.length))}</mark>${escapeHtml(source.slice(index + keyword.length))}`;
}

function groupedSuggestions(results) {
  return results.reduce((groups, result) => {
    const key = result.product.category || "other";
    if (!groups.has(key)) {
      groups.set(key, {
        label: result.categoryLabel,
        items: []
      });
    }
    groups.get(key).items.push(result.product);
    return groups;
  }, new Map());
}

function hideSearchSuggestions() {
  const panel = $("#search-suggestions-list");
  if (!panel) return;
  panel.hidden = true;
  panel.innerHTML = "";
}

function renderSearchSuggestions(query) {
  const panel = $("#search-suggestions-list");
  if (!panel) return;

  const keyword = query.trim();
  if (!keyword) {
    hideSearchSuggestions();
    return;
  }

  const results = searchProducts(keyword);
  if (!results.length) {
    panel.innerHTML = `<div class="search-suggestions-empty">ไม่พบสินค้าที่ตรงกับ "${escapeHtml(keyword)}"</div>`;
    panel.hidden = false;
    return;
  }

  const groups = groupedSuggestions(results);
  panel.innerHTML = [...groups.values()]
    .map(
      (group) => `
        <div class="search-suggestion-header">${escapeHtml(group.label)}</div>
        ${group.items
          .map(
            (product) => `
              <a class="search-suggestion-item" href="product.html?id=${encodeURIComponent(product.id)}" role="option">
                <img ${fastImg(product.image || product.heroImage, getDisplayProductName(product), { className: "suggestion-img" })} />
                <span class="suggestion-info">
                  <span class="suggestion-name">${highlightMatch(getDisplayProductName(product), keyword)}</span>
                  <span class="suggestion-meta">${escapeHtml(cleanDisplayText(product.publisher || getCategoryLabel(product.category)))}</span>
                </span>
                <strong class="suggestion-price">${formatPrice(product.price)}</strong>
              </a>
            `
          )
          .join("")}
      `
    )
    .join("");
  panel.hidden = false;
}

function submitTopbarSearch() {
  const input = $("#topbar-search-input");
  const query = input?.value.trim() || "";
  if (!query) return;

  const firstResult = searchProducts(query)[0]?.product;
  if (firstResult) {
    window.location.href = `product.html?id=${encodeURIComponent(firstResult.id)}`;
  } else {
    window.location.href = `index.html?search=${encodeURIComponent(query)}`;
  }
}

function steamAppIdFromUrl(value) {
  const text = typeof value === "string" ? value : value?.url;
  const match = String(text || "").match(/store\.steampowered\.com\/app\/(\d+)/i);
  return match ? match[1] : "";
}

function steamRelatedItems(product) {
  return (Array.isArray(product?.steamRelatedLinks) ? product.steamRelatedLinks : [])
    .map((item) => {
      const url = typeof item === "string" ? item.trim() : String(item?.url || "").trim();
      const appId = steamAppIdFromUrl(url);
      if (!url || !appId) return null;
      return {
        appId,
        url,
        title: typeof item === "object" ? String(item.title || item.name || "") : "",
        image: typeof item === "object" ? String(item.image || item.headerImage || "") : "",
        type: typeof item === "object" ? String(item.type || "") : ""
      };
    })
    .filter(Boolean);
}

function steamImageCandidates(appId, preferred = "") {
  return [...new Set([
    String(preferred || "").trim(),
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`
  ].filter(Boolean))];
}

function steamRelatedImageMarkup(item) {
  const candidates = steamImageCandidates(item.appId, item.image);
  return `<img src="${escapeHtml(candidates[0])}" data-image-fallbacks="${escapeHtml(JSON.stringify(candidates.slice(1)))}" alt="${escapeHtml(cleanDisplayText(item.title || "เนื้อหาเสริมบน Steam"))}" loading="eager" decoding="async" fetchpriority="low" width="616" height="353" data-steam-related-image />`;
}

function steamRelatedSection(product) {
  const items = steamRelatedItems(product);
  if (!items.length) return "";
  return `
    <details class="pd-arrow-accordion pd-steam-related" open data-smooth-details>
      <summary>
        <span class="pd-arrow-summary-title">
          <span class="pd-section-icon-box"><i data-lucide="layers-3"></i></span>
          เนื้อหาเกมเพิ่มเติม / DLC ที่รวมในสินค้า
        </span>
        <span class="pd-arrow-summary-meta">${items.length.toLocaleString("th-TH")} รายการ <i data-lucide="chevron-down"></i></span>
      </summary>
      <div class="pd-arrow-accordion-body">
        <p class="pd-steam-related-note">ข้อมูลเนื้อหาเสริมภายในไอดี</p>
        <div class="pd-steam-related-grid">
          ${items.map((item) => `
            <a class="pd-steam-related-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" data-steam-related-card data-appid="${escapeHtml(item.appId)}">
              ${steamRelatedImageMarkup(item)}
              <span>
                <small data-steam-related-type>${escapeHtml(cleanDisplayText(item.type || "เนื้อหาบน Steam"))}</small>
                <strong data-steam-related-title>${escapeHtml(cleanDisplayText(item.title || `กำลังโหลดข้อมูล Steam #${item.appId}`))}</strong>
                <em>ดูบน Steam <i data-lucide="external-link"></i></em>
              </span>
            </a>
          `).join("")}
        </div>
      </div>
    </details>
  `;
}

async function hydrateSteamRelatedMetadata() {
  const cards = [...document.querySelectorAll("[data-steam-related-card]")];
  await Promise.all(cards.map(async (card) => {
    const appId = card.dataset.appid;
    if (!appId) return;
    try {
      const response = await fetch(`/api/steam-app?appid=${encodeURIComponent(appId)}`, { cache: "force-cache" });
      if (!response.ok) return;
      const data = await response.json();
      const title = card.querySelector("[data-steam-related-title]");
      const type = card.querySelector("[data-steam-related-type]");
      const image = card.querySelector("[data-steam-related-image]");
      if (title && data.name) title.textContent = data.name;
      if (type) type.textContent = data.type === "dlc" ? "DLC / ส่วนเสริม" : data.type === "game" ? "ตัวเกม" : "เนื้อหาบน Steam";
      if (image && data.headerImage) {
        const candidates = steamImageCandidates(appId, data.headerImage);
        image.dataset.fallbackIndex = "0";
        image.dataset.imageFallbacks = JSON.stringify(candidates.slice(1));
        delete image.dataset.fallbackApplied;
        image.src = candidates[0];
      }
    } catch (error) {
      console.warn(`Steam metadata unavailable for ${appId}`, error);
    }
  }));
}

function setupSmoothDetails(root = document) {
  root.querySelectorAll("[data-smooth-details]").forEach((details) => {
    if (details.dataset.smoothReady === "true") return;
    const summary = details.querySelector(":scope > summary");
    const content = details.querySelector(":scope > .pd-arrow-accordion-body, :scope > div");
    if (!summary || !content) return;
    details.dataset.smoothReady = "true";

    summary.addEventListener("click", (event) => {
      event.preventDefault();
      if (details._smoothAnimation) details._smoothAnimation.cancel();

      const opening = !details.open;
      const startHeight = details.getBoundingClientRect().height;
      if (opening) details.open = true;
      const endHeight = opening
        ? summary.getBoundingClientRect().height + content.scrollHeight
        : summary.getBoundingClientRect().height;

      details.style.height = `${startHeight}px`;
      details.style.overflow = "hidden";
      details.dataset.animating = "true";

      const contentAnimation = content.animate(
        opening
          ? [{ opacity: 0, transform: "translateY(-7px)" }, { opacity: 1, transform: "translateY(0)" }]
          : [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-7px)" }],
        { duration: opening ? 300 : 240, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" }
      );

      const animation = details.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: opening ? 340 : 280, easing: "cubic-bezier(.22, 1, .36, 1)" }
      );
      details._smoothAnimation = animation;

      animation.onfinish = () => {
        if (!opening) details.open = false;
        contentAnimation.cancel();
        details.style.removeProperty("height");
        details.style.removeProperty("overflow");
        delete details.dataset.animating;
        details._smoothAnimation = null;
      };
      animation.oncancel = () => {
        contentAnimation.cancel();
        details.style.removeProperty("height");
        details.style.removeProperty("overflow");
        delete details.dataset.animating;
        details._smoothAnimation = null;
      };
    });
  });
}

function brandedProductHero(product) {
  if (isMinecraftProduct(product)) {
    return `
      <section class="pd-brand-hero pd-brand-hero-minecraft">
        <span class="pd-brand-kicker">Minecraft for PC</span>
        <h2>BUILD. EXPLORE. SURVIVE.</h2>
        <p>Java &amp; Bedrock Edition พร้อมสั่งซื้อแบบพรีออเดอร์ และจัดส่งโดยแอดมิน</p>
      </section>
    `;
  }
  if (isRockstarProduct(product)) {
    return `
      <section class="pd-brand-hero pd-brand-hero-rockstar">
        <span class="pd-rockstar-logo">R★</span>
        <div>
          <span class="pd-brand-kicker">Rockstar Games / FiveM</span>
          <h2>ACCOUNT ACCESS FOR FIVEM</h2>
          <p>บัญชีจากสต็อกจริง ใช้เข้า FiveM เท่านั้น และไม่รวมตัวเกม GTA V</p>
        </div>
      </section>
    `;
  }
  return "";
}

const STEAM_OFFLINE_GUIDE_URL = "https://olaf-shop.gitbook.io/manual-olaf-shop";
const STEAM_OFFLINE_CONDITIONS_URL = "https://olaf-shop.gitbook.io/manual-olaf-shop/undefined/undefined";
const STEAM_KEY_GUIDE_URL = "https://olaf-shop.gitbook.io/manual-olaf-shop/undefined/key-steam";
const OFFLINE_SUPPORT_PAGE_URL = "https://www.facebook.com/byOlafshop";

function rockstarUsageAccordion(product) {
  if (!isRockstarProduct(product)) return "";
  return `
    <details class="pd-arrow-accordion pd-rockstar-steps" data-smooth-details>
      <summary>
        <span class="pd-arrow-summary-title">
          <span class="pd-section-icon-box"><i data-lucide="list-checks"></i></span>
          ขั้นตอนการใช้งาน Rockstar สำหรับ FiveM
        </span>
        <span class="pd-arrow-summary-meta">เปิดดูขั้นตอน <i data-lucide="chevron-down"></i></span>
      </summary>
      <div class="pd-arrow-accordion-body">
        <ol class="pd-usage-steps">
          <li><span>1</span><div><strong>เปลี่ยนข้อมูลบัญชี</strong><p>หลังได้รับสินค้า กรุณาเปลี่ยนข้อมูลบัญชีให้เรียบร้อย</p></div></li>
          <li><span>2</span><div><strong>Login Rockstar</strong><p>Login Rockstar ให้เรียบร้อย โดยต้องมีตัวเกม GTA V ก่อน</p></div></li>
          <li><span>3</span><div><strong>Login Steam บัญชีใหม่</strong><p>ใช้บัญชี Steam ใหม่ที่ไม่เคยเข้า FiveM มาก่อน บัญชีไม่จำเป็นต้องมีตัวเกม</p></div></li>
          <li><span>4</span><div><strong>เข้า FiveM</strong><p>เปิด FiveM และเริ่มเล่นได้เลย</p></div></li>
        </ol>
      </div>
    </details>
  `;
}

function categoryGuideAccordion(product) {
  const category = String(product?.category || "").toLowerCase();

  if (category === "offline") {
    return `
      <details class="pd-arrow-accordion pd-category-guide pd-category-guide-offline" data-smooth-details>
        <summary>
          <span class="pd-arrow-summary-title">
            <span class="pd-section-icon-box"><i data-lucide="circle-help"></i></span>
            เงื่อนไข/คู่มือ
          </span>
          <span class="pd-arrow-summary-meta" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
        </summary>
        <div class="pd-arrow-accordion-body">
          <div class="pd-offline-guide-list">
            <details open data-smooth-details>
              <summary>เงื่อนไขบัญชีออฟไลน์ <i data-lucide="chevron-down"></i></summary>
              <div>
                <p>ได้รับ ID และรหัสผ่าน Steam ของทางร้าน ไม่สามารถเปลี่ยนข้อมูลหรือรหัสผ่านได้ และรองรับการใช้งานบนคอมพิวเตอร์หรือโน้ตบุ๊กเท่านั้น</p>
                <p>สินค้าใช้สำหรับเล่นแบบออฟไลน์ ไม่รองรับโหมดออนไลน์ ตัวเกมเป็นของแท้ อัปเดตและลง MOD ได้ตามปกติ</p>
              </div>
            </details>
            <details data-smooth-details>
              <summary>ข้อควรรู้ก่อนสั่งซื้อ <i data-lucide="chevron-down"></i></summary>
              <div>
                <p>การสั่งซื้อถือว่ายอมรับเงื่อนไขของร้าน กรุณาตรวจสอบสเปกเครื่องก่อนซื้อ และสินค้าที่ชำระเงินแล้วไม่สามารถเปลี่ยนเกมหรือขอคืนเงินได้</p>
                <a href="${STEAM_OFFLINE_CONDITIONS_URL}" target="_blank" rel="noopener noreferrer">อ่านเงื่อนไขฉบับเต็ม <i data-lucide="arrow-up-right"></i></a>
              </div>
            </details>
            <details data-smooth-details>
              <summary>คู่มือการเข้าใช้งาน <i data-lucide="chevron-down"></i></summary>
              <div>
                <p>อ่านคู่มือและทำตามขั้นตอน Offline / PIN ก่อนเข้าเกมทุกครั้ง หากระบบขอรหัส 2FA หรือมีขั้นตอนที่ไม่ตรงกับคู่มือ ให้หยุดดำเนินการและติดต่อร้าน</p>
                <a href="${STEAM_OFFLINE_GUIDE_URL}" target="_blank" rel="noopener noreferrer">เปิดคู่มือ OLAF SHOP <i data-lucide="arrow-up-right"></i></a>
              </div>
            </details>
          </div>
        </div>
      </details>
    `;
  }

  if (category === "steam-key") {
    return `
      <details class="pd-arrow-accordion pd-category-guide pd-category-guide-key" data-smooth-details>
        <summary>
          <span class="pd-arrow-summary-title">
            <span class="pd-section-icon-box"><i data-lucide="key-round"></i></span>
            คู่มือการเปิดใช้งาน KEY STEAM
          </span>
          <span class="pd-arrow-summary-meta">เปิดดูรายละเอียด <i data-lucide="chevron-down"></i></span>
        </summary>
        <div class="pd-arrow-accordion-body">
          <ol class="pd-usage-steps pd-guide-steps">
            <li><span>1</span><div><strong>เปิดเมนู Activate a Product</strong><p>เข้าสู่ Steam แล้วไปที่เมนู Games หรือ Add a Game จากนั้นเลือก Activate a Product on Steam</p></div></li>
            <li><span>2</span><div><strong>กรอก KEY ที่ได้รับ</strong><p>ใส่โค้ด Steam Key จากสินค้าที่ได้รับ ตรวจสอบตัวอักษรและเครื่องหมายให้ครบถ้วนก่อนกดยืนยัน</p></div></li>
            <li><span>3</span><div><strong>ยืนยันและติดตั้งเกม</strong><p>เมื่อระบบเปิดใช้งานสำเร็จ เกมหรือ DLC จะถูกเพิ่มเข้า Library ของคุณทันทีและพร้อมติดตั้งต่อได้เลย</p></div></li>
          </ol>
          <div class="pd-guide-actions">
            <a class="pd-guide-button" href="${STEAM_KEY_GUIDE_URL}" target="_blank" rel="noopener noreferrer">
              <i data-lucide="external-link"></i>
              เปิดคู่มือ Steam Key
            </a>
          </div>
        </div>
      </details>
    `;
  }

  return "";
}

function renderProduct() {
  const container = $("#product-page");
  if (!globalPayload || !globalPayload.products) {
    container.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>เกิดข้อผิดพลาด</h3><p>ไม่สามารถโหลดข้อมูลสินค้าได้</p></div>`;
    createIconSet();
    return;
  }

  currentProduct = globalPayload.products.find((p) => p.id === productId);

  if (!currentProduct) {
    container.innerHTML = `<div class="empty-state"><i data-lucide="package-x"></i><h3>ไม่พบสินค้า</h3><a href="index.html" class="primary-button" style="margin-top: 16px;">กลับหน้าแรก</a></div>`;
    createIconSet();
    return;
  }

  const p = currentProduct;
  document.body.classList.toggle("product-theme-minecraft", isMinecraftProduct(p));
  document.body.classList.toggle("product-theme-rockstar", isRockstarProduct(p));
  currentProductPackages = activePackagesForProduct(p);
  if (currentProductPackages.length && !currentProductPackages.some((pkg) => pkg.id === selectedPackageId)) {
    selectedPackageId = currentProductPackages[0].id;
  }
  if (!currentProductPackages.length) selectedPackageId = null;

  const purchase = getPurchaseOption(p);
  const canAdd = purchase.stock > 0;
  detailQuantity = canAdd ? 1 : 0;

  const catId = (p.category || "").toLowerCase();
  const badgeClass = getProductBadgeClass(p.category);
  const badgeLabel = getProductBadgeLabel(p.category, p.label);
  const labelText = cleanDisplayText(p.label || "");
  const hasOfflineBadge = badgeLabel === "OFFLINE" || catId.includes("offline");
  const hasPremiumBadge = /premium|deluxe/i.test(labelText);
  const showSecondaryBadge = Boolean(
    labelText &&
    !/^steam$/i.test(labelText) &&
    labelText.toUpperCase() !== badgeLabel.toUpperCase() &&
    !hasOfflineBadge
  );
  const showOfflineSteamBadge = catId === "offline";
  const displayProductName = getDisplayProductName(p);

  const genreTags = getSidebarDisplayTags(p)
    .map((t) => `<span class="pd-genre-tag">${escapeHtml(t)}</span>`)
    .join("");

  // Gallery images from admin gallery field (left column main image)
  // Left hero = gallery[0] → fallback heroImage → fallback image
  // Sidebar cover = heroImage → fallback image
  const galleryArr = Array.isArray(p.gallery) && p.gallery.length > 0
    ? p.gallery
    : [];

  // Use ONLY gallery images as requested by the user
  const screenshotSrcs = [...new Set(galleryArr.filter(Boolean))].slice(0, 6);

  // Main displayed image on left = first gallery image
  const leftMainImg = screenshotSrcs[0] || "";
  // Sidebar cover = heroImage or image fallback if gallery is empty
  const sidebarCoverImg = p.heroImage || p.image || leftMainImg || "";

  const screenshotThumbs = screenshotSrcs
    .map((src, i) => `
      <div class="pd-thumb${src === leftMainImg ? " is-active" : ""}" data-src="${escapeHtml(src)}" role="button" tabindex="0" aria-label="ภาพตัวอย่าง ${i + 1}">
        <img ${fastImg(src, `ภาพตัวอย่าง ${i + 1}`)} />
      </div>
    `)
    .join("");

  const gallerySection = screenshotSrcs.length > 0 ? `
    <div class="pd-hero-img" id="pd-hero-img">
      <img id="pd-hero-main" ${fastImg(leftMainImg, displayProductName, { priority: true })} />
    </div>
    ${screenshotSrcs.length > 1 ? `
    <div class="pd-gallery-label" style="margin-top: 16px;">
      <i data-lucide="monitor"></i>
      ภาพตัวอย่างในเกม
    </div>
    <div class="pd-screenshots" id="pd-screenshots">
      ${screenshotThumbs}
    </div>
    ` : ""}
  ` : "";

  // System requirements sections
  const sysReq = p.systemRequirements || {};
  const minList = Array.isArray(sysReq.minimum) ? sysReq.minimum : (Array.isArray(sysReq) ? sysReq : []);
  const recList = Array.isArray(sysReq.recommended) ? sysReq.recommended : [];
  const hasSysReq = minList.length > 0 || recList.length > 0;

  function renderReqList(items) {
    return items.map(item => {
      const localized = localizeRequirementLine(item);
      if (!localized) return "";
      // Bold the key label before colon, e.g. "OS: Windows" → "<strong>OS:</strong> Windows"
      const colonIdx = localized.indexOf(':');
      if (colonIdx > 0) {
        const label = escapeHtml(localized.slice(0, colonIdx + 1));
        const value = escapeHtml(localized.slice(colonIdx + 1));
        return `<li><strong>${label}</strong>${value}</li>`;
      }
      return `<li>${escapeHtml(localized)}</li>`;
    }).join("");
  }

  const sysReqSection = hasSysReq ? `
    <div class="pd-section">
      <h3 class="pd-section-title">
        <span class="pd-section-icon-box"><i data-lucide="cpu"></i></span>
        ความต้องการระบบ
      </h3>
      <div class="pd-sysreq-grid">
        ${minList.length > 0 ? `
        <div class="pd-sysreq-panel">
          <h4>ขั้นต่ำ (Minimum)</h4>
          <p class="pd-sysreq-sub">ขั้นต่ำ:</p>
          <ul class="pd-sysreq-list">${renderReqList(minList)}</ul>
        </div>` : ""}
        ${recList.length > 0 ? `
        <div class="pd-sysreq-panel pd-sysreq-panel-rec">
          <h4>แนะนำ (Recommended)</h4>
          <p class="pd-sysreq-sub">แนะนำ:</p>
          <ul class="pd-sysreq-list">${renderReqList(recList)}</ul>
        </div>` : ""}
      </div>
    </div>
  ` : "";

  // Languages section
  const langList = Array.isArray(p.languages) ? p.languages : [];
  const langSection = langList.length > 0 ? `
    <div class="pd-section">
      <h3 class="pd-section-title">
        <span class="pd-section-icon-box"><i data-lucide="globe"></i></span>
        ภาษาที่รองรับ
      </h3>
      <div class="pd-lang-chips">
        ${langList.map(lang => {
          const hasAudio = lang.startsWith('🔊');
          const name = cleanDisplayText(lang.replace(/^🔊\s*/, ''));
          return `<span class="pd-lang-chip${hasAudio ? ' has-audio' : ''}">${hasAudio ? '<span class="pd-lang-audio">🔊</span>' : ''}<span>${escapeHtml(name)}</span></span>`;
        }).join("")}
      </div>
      <p class="pd-lang-note"><span class="pd-lang-audio">🔊</span> ภาษาที่มีการรองรับเสียงพากย์</p>
    </div>
  ` : "";

  const extraProduct = isMinecraftProduct(p) || isRockstarProduct(p);
  const relatedPool = (globalPayload.products || []).filter((rp) => {
    if (rp.id === p.id) return false;
    if (!extraProduct) return !window.OlafExtraProducts?.isExtraCategory?.(rp.category);
    return window.OlafExtraProducts?.isExtraCategory?.(rp.category);
  });
  const sameCategoryProducts = relatedPool
    .filter((rp) => rp.category === p.category)
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0));
  const samePublisherProducts = relatedPool
    .filter((rp) => rp.category !== p.category && rp.publisher && rp.publisher === p.publisher)
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0));
  const fallbackProducts = relatedPool
    .filter((rp) => rp.category !== p.category && rp.publisher !== p.publisher)
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0));

  const relatedProducts = [...sameCategoryProducts, ...samePublisherProducts, ...fallbackProducts]
    .filter((rp, index, arr) => arr.findIndex((item) => item.id === rp.id) === index)
    .slice(0, 6);

  const relatedCards = relatedProducts.map((rp) => {
    const rpStock = getStockState(rp.stock);
    const rpDiscount = getDiscount(rp);
    return `
      <a class="pd-related-card" href="product.html?id=${encodeURIComponent(rp.id)}">
        <div class="pd-related-img">
          <img ${fastImg(rp.image || rp.heroImage, getDisplayProductName(rp))} />
          ${rpDiscount ? `<span class="pd-related-discount">-${rpDiscount}%</span>` : ""}
        </div>
        <div class="pd-related-body">
          <p class="pd-related-name">${escapeHtml(getDisplayProductName(rp))}</p>
          <p class="pd-related-publisher">${escapeHtml(cleanDisplayText(rp.publisher || ""))}</p>
          <div class="pd-related-footer">
            <strong class="pd-related-price">${formatPrice(rp.price)}</strong>
            <span class="stock-pill ${rpStock.className}" style="font-size:0.65rem;padding:2px 7px;">${rpStock.label}</span>
          </div>
        </div>
      </a>
    `;
  }).join("");

  const relatedSection = relatedProducts.length > 0 ? `
    <div class="pd-section pd-related-section">
      <h3 class="pd-section-title">
        <span class="pd-section-icon-box"><i data-lucide="thumbs-up"></i></span>
        สินค้าแนะนำในหมวดหมู่เดียวกัน
      </h3>
      <div class="pd-related-grid">
        ${relatedCards}
      </div>
    </div>
  ` : "";

  const packageSection = currentProductPackages.length ? `
    <div class="pd-package-section" aria-label="เลือกแพ็คเกจ">
      <div class="pd-package-head">
        <strong>เลือกแพ็คเกจ</strong>
        <span>${currentProductPackages.length.toLocaleString("th-TH")} ตัวเลือก</span>
      </div>
      <div class="pd-package-options">
        ${currentProductPackages.map((pkg) => {
          const pkgStock = getStockState(pkg.stock);
          const selected = pkg.id === selectedPackageId;
          const disabled = pkg.stock <= 0;
          return `
            <label class="pd-package-option${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}" data-package-option="${escapeHtml(pkg.id)}" tabindex="${disabled ? "-1" : "0"}">
              <input type="radio" name="productPackage" value="${escapeHtml(pkg.id)}" ${selected ? "checked" : ""} ${disabled ? "disabled" : ""} />
              <span class="pd-package-radio" aria-hidden="true"><i data-lucide="check"></i></span>
              <span class="pd-package-copy">
                <strong>${escapeHtml(pkg.title)}</strong>
                ${pkg.subtitle ? `<small>${escapeHtml(pkg.subtitle)}</small>` : ""}
                ${pkg.description ? `<em>${escapeHtml(pkg.description)}</em>` : ""}
              </span>
              <span class="pd-package-meta">
                ${pkg.badge ? `<span class="pd-package-badge">${escapeHtml(pkg.badge)}</span>` : ""}
                <b>${formatPrice(pkg.price)}</b>
                <small class="${pkgStock.className}">${pkgStock.label}</small>
              </span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  ` : "";

  // Stock display
  const stockDisplay = renderStockDisplay(purchase.stock);

  // Discount badge
  const discountBadge = renderDiscountBadge(purchase.price, purchase.compareAt);

  const compareEl = renderPriceCompare(purchase.compareAt, purchase.price);
  const adminDescription = getAdminProductDescription(p);
  const extrasReturnHash = isRockstarProduct(p) ? "#rockstar-products" : "#minecraft-products";
  const returnHref = extraProduct ? `more-products.html${extrasReturnHash}` : "index.html";
  const returnLabel = extraProduct ? "กลับไปหน้าสินค้าเพิ่มเติม" : "กลับไปหน้าร้านค้า";
  const buyButtonText = purchaseButtonCopy(p, canAdd);

  container.innerHTML = `
    <div class="pd-bg-backdrop fade-in" ${fastBg(p.heroImage || p.image || leftMainImg)}></div>
    <a class="pd-breadcrumb" href="${returnHref}" style="position:relative;z-index:10;">
      <i data-lucide="arrow-left"></i>
      ${returnLabel}
    </a>

    ${brandedProductHero(p)}

    <div class="pd-layout fade-in">

      <!-- ══ LEFT COLUMN ══ -->
      <div class="pd-left">

        ${gallerySection}

        <!-- Description -->
        <div class="pd-section">
          <h3 class="pd-section-title">
            <span class="pd-section-icon-box"><i data-lucide="file-text"></i></span>
            รายละเอียดสินค้า
          </h3>
          <div class="pd-description is-clamped" data-admin-product-description>${escapeHtml(adminDescription || "ยังไม่มีรายละเอียดสินค้า").replace(/\n/g, "<br>")}</div>
        </div>

        <!-- Dynamic Detail Sections from Admin -->
        ${Array.isArray(p.detailSections) && p.detailSections.length > 0 ? p.detailSections
          .filter((section) => !isSteamInfoDetailSection(section))
          .map(s => `
        <div class="pd-section">
          <h3 class="pd-section-title">
            <span class="pd-section-icon-box"><i data-lucide="info"></i></span>
            ${escapeHtml(localizeSectionTitle(s.title))}
          </h3>
          <div class="pd-description">${escapeHtml(localizeSectionBody(s.body, p, s.title)).replace(/\n/g, "<br>")}</div>
        </div>
        `).join("") : ""}

        ${rockstarUsageAccordion(p)}
        ${categoryGuideAccordion(p)}
        ${steamRelatedSection(p)}

        <!-- Product info rows -->
        <div class="pd-section">
          <h3 class="pd-section-title">
            <span class="pd-section-icon-box"><i data-lucide="info"></i></span>
            ข้อมูลสินค้า
          </h3>
          <div class="pd-info-rows pd-info-card">
            ${p.delivery ? `
            <div class="pd-info-row">
              <span><i data-lucide="zap" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--brand)"></i>การจัดส่ง</span>
              <strong>${escapeHtml(getLocalizedDelivery(p))}</strong>
            </div>` : ""}
            ${p.warranty ? `
            <div class="pd-info-row">
              <span><i data-lucide="shield-check" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--success)"></i>รับประกัน</span>
              <strong>${escapeHtml(getLocalizedWarranty(p))}</strong>
            </div>` : ""}
            ${p.rating ? `
            <div class="pd-info-row">
              <span><i data-lucide="star" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--gold)"></i>คะแนนรีวิว</span>
              <strong>${escapeHtml(getLocalizedRating(p.rating))}</strong>
            </div>` : ""}
            <div class="pd-info-row">
              <span><i data-lucide="layers" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--accent)"></i>หมวดหมู่</span>
              <strong>${escapeHtml(getCategoryLabel(p.category))}</strong>
            </div>
            <div class="pd-info-row">
              <span><i data-lucide="package" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--muted)"></i>สถานะสต็อก</span>
              <strong data-purchase-stock>${stockDisplay}</strong>
            </div>
          </div>
        </div>

        ${sysReqSection}

        ${langSection}

      </div><!-- end .pd-left -->

      <!-- ══ RIGHT SIDEBAR ══ -->
      <div class="pd-sidebar">
        <div class="pd-sidebar-card">

          <!-- Cover art -->
          <div class="pd-sidebar-cover">
            <img ${fastImg(sidebarCoverImg, displayProductName, { priority: true })} />
          </div>

          <div class="pd-sidebar-body">

            <!-- Platform badges -->
            <div class="pd-badges">
              ${showOfflineSteamBadge
                ? `<span class="pd-badge pd-badge-steam">STEAM</span><span class="pd-badge pd-badge-offline">OFFLINE</span>`
                : `<span class="pd-badge ${badgeClass}">${badgeLabel}</span>`}
              ${!showOfflineSteamBadge && showSecondaryBadge ? `<span class="pd-badge ${hasPremiumBadge ? "pd-badge-premium" : "pd-badge-steam"}">${escapeHtml(labelText)}</span>` : ""}
            </div>

            <!-- Title & publisher -->
            <h1 class="pd-sidebar-title">${escapeHtml(displayProductName)}</h1>
            ${p.publisher ? `<p class="pd-sidebar-publisher">${escapeHtml(cleanDisplayText(p.publisher))}</p>` : ""}

            <!-- Genre tags -->
            ${genreTags ? `<div class="pd-genre-tags">${genreTags}</div>` : ""}

            <div class="pd-separator"></div>

            ${packageSection}

            <!-- Price -->
            <p class="pd-price-label">${isMinecraftProduct(p) ? "ราคาพรีออเดอร์" : "ราคาสินค้า"}</p>
            <div class="pd-price-row">
              <strong class="pd-price-main" data-purchase-price>${formatPrice(purchase.price)}</strong>
              ${compareEl}
            </div>
            ${discountBadge}

            <!-- Quantity (Removed as requested) -->

            <!-- Buy button -->
            <button class="pd-buy-btn" type="button" id="btn-buy" ${!canAdd ? "disabled" : ""}>
              <i data-lucide="${isMinecraftProduct(p) ? "clock-3" : "shopping-cart"}"></i>
              ${buyButtonText}
            </button>

            <!-- Feature info row -->
            <div class="pd-features-row">
              ${Array.isArray(p.featureBlocks) && p.featureBlocks.length > 0 ? p.featureBlocks.map(f => `
              <div class="pd-feature-item">
                <div class="pd-feature-icon">
                  <i data-lucide="${escapeHtml(f.icon)}"></i>
                </div>
                <div class="pd-feature-text">
                  <strong>${escapeHtml(cleanDisplayText(f.title))}</strong>
                  <span>${escapeHtml(cleanDisplayText(f.text))}</span>
                </div>
              </div>
              `).join("") : hasOfflineBadge ? `
              <div class="pd-feature-item">
                <div class="pd-feature-icon offline-icon">
                  <i data-lucide="wifi-off"></i>
                </div>
                <div class="pd-feature-text">
                  <strong>เล่นออฟไลน์</strong>
                  <span>เล่นได้เฉพาะโหมดออฟไลน์</span>
                </div>
              </div>
              <div class="pd-feature-item">
                <div class="pd-feature-icon cloud-icon">
                  <i data-lucide="cloud-off"></i>
                </div>
                <div class="pd-feature-text">
                  <strong>เล่นเกมผ่านคลาวด์</strong>
                  <span>ไม่สามารถใช้งานได้</span>
                </div>
              </div>
              ` : `
              <div class="pd-feature-item">
                <div class="pd-feature-icon online-icon">
                  <i data-lucide="globe"></i>
                </div>
                <div class="pd-feature-text">
                  <strong>เล่นออนไลน์</strong>
                  <span>รองรับโหมดเล่นออนไลน์</span>
                </div>
              </div>
              <div class="pd-feature-item">
                <div class="pd-feature-icon cloud-save-icon">
                  <i data-lucide="cloud"></i>
                </div>
                <div class="pd-feature-text">
                  <strong>บันทึกบนคลาวด์</strong>
                  <span>บันทึกข้อมูลลงคลาวด์ได้</span>
                </div>
              </div>
              `}
            </div>

            <!-- Platform links -->
            ${Array.isArray(p.platformLinks) && p.platformLinks.length > 0 ? `
            <div class="pd-platform-links">
              ${p.platformLinks.map(l => `
              <a href="${escapeHtml(l.url)}" target="_blank" rel="noreferrer" class="pd-platform-link">
                <i data-lucide="${escapeHtml(l.icon)}"></i>
                <span>${escapeHtml(getLocalizedPlatformLabel(l))}</span>
              </a>
              `).join("")}
            </div>
            ` : ""}

          </div><!-- end .pd-sidebar-body -->
        </div><!-- end .pd-sidebar-card -->
      </div><!-- end .pd-sidebar -->

    </div><!-- end .pd-layout -->

    ${relatedSection}
  `;

  createIconSet();
  hydrateImages();
  setupSmoothDetails(container);
  hydrateSteamRelatedMetadata();

  let galleryTimeout;
  document.querySelectorAll(".pd-thumb").forEach((thumb) => {
    const activate = () => {
      if (thumb.classList.contains("is-active")) return;
      document.querySelectorAll(".pd-thumb").forEach((t) => t.classList.remove("is-active"));
      thumb.classList.add("is-active");
      const heroImg = $("#pd-hero-main");
      if (heroImg) {
        clearTimeout(galleryTimeout);
        heroImg.style.opacity = "0";
        // removed heroImg.style.transition overwrite so CSS transition applies
        galleryTimeout = setTimeout(() => {
          heroImg.src = thumb.dataset.src;
          heroImg.onload = () => { heroImg.style.opacity = "1"; };
          setTimeout(() => { heroImg.style.opacity = "1"; }, 50); // Fallback if cached
        }, 200);
      }
    };
    thumb.addEventListener("click", activate);
    thumb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
  });

  document.querySelectorAll("[data-package-option]").forEach((card) => {
    card.addEventListener("click", () => {
      const input = card.querySelector('input[type="radio"]');
      if (!input || input.disabled) return;
      selectedPackageId = input.value;
      updatePurchaseDom();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const input = card.querySelector('input[type="radio"]');
      if (!input || input.disabled) return;
      selectedPackageId = input.value;
      updatePurchaseDom();
    });
  });

  $("#btn-buy")?.addEventListener("click", () => {
    const user = window.OlafStore.currentUser();
    if (!user) {
      showToast("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ", "info");
      setTimeout(() => {
        window.location.href = "login.html?return=" + encodeURIComponent(window.location.href);
      }, 1500);
      return;
    }
    const purchase = getPurchaseOption(currentProduct);
    const subtotal = purchase.price * detailQuantity;
    const fee = 0;
    const total = subtotal + fee;
    openOrderConfirmDialog(subtotal, total);
  });
}


function openOrderForm() {
  const p = currentProduct;
  const purchase = getPurchaseOption(p);
  const subtotal = purchase.price * detailQuantity;
  const fee = 0;
  const total = subtotal + fee;
  const user = window.OlafStore.currentUser();
  const dialog = $("#order-dialog");
  const form = $("#checkout-form");
  if (!dialog || !form) {
    showToast("ไม่พบฟอร์มยืนยันคำสั่งซื้อ กรุณารีเฟรชหน้าเว็บ", "error");
    return;
  }

  const customerNameInput = form.querySelector("[data-checkout-customer-name]");
  const contactInput = form.querySelector("[data-checkout-contact]");
  if (customerNameInput) customerNameInput.value = user?.displayName || user?.username || "";
  if (contactInput) contactInput.value = user?.email || "";

  const image = form.querySelector("[data-checkout-product-image]");
  const imageUrl = productImageForCheckout(p);
  if (image) {
    image.src = imageUrl;
    image.alt = getDisplayProductName(p) || "สินค้า";
    image.loading = "lazy";
    image.decoding = "async";
  }
  hydrateImages();

  const categoryLabel = purchase.hasPackage
    ? `แพ็คเกจ: ${purchase.packageTitle}`
    : p.label || getCategoryLabel(p.category);
  setTextContent("[data-checkout-product-name]", getDisplayProductName(p));
  setTextContent("[data-checkout-product-label]", purchase.hasPackage ? categoryLabel : categoryLabel ? `ประเภท: ${cleanDisplayText(categoryLabel)}` : "ประเภท: -");
  setTextContent("[data-checkout-product-qty]", `จำนวน: ${detailQuantity}`);
  setTextContent("[data-checkout-product-price]", formatPrice(purchase.price));
  setTextContent("[data-checkout-price-subtotal]", formatPrice(subtotal));
  setTextContent("[data-checkout-fee]", formatPrice(fee));
  setTextContent("[data-checkout-total]", formatPrice(total));

  const orderNumberWrap = $("[data-checkout-order-container]");
  if (orderNumberWrap) orderNumberWrap.hidden = true;
  setTextContent("[data-checkout-order-number]", "#ORDER_NUMBER");

  const promptpayInput = form.querySelector('input[name="paymentMethod"][value="promptpay"]');
  if (promptpayInput) promptpayInput.checked = true;

  if (!form.dataset.checkoutBound) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitOrder(new FormData(e.currentTarget));
    });
    form.dataset.checkoutBound = "true";
  }

  if (!dialog.open) dialog.showModal();
  createIconSet();
}

function openOrderConfirmDialog(subtotal, total) {
  const dialog = $("#order-confirm-dialog");
  const checkbox = $("#order-confirm-accept");
  const submitBtn = $("#order-confirm-submit-btn");
  const submitLabel = $("#order-confirm-submit-label");
  const priceProduct = $("#order-confirm-price-product");
  const priceTotal = $("#order-confirm-price-total");
  if (!dialog) return;

  // Reset state every open
  checkbox.checked = false;
  submitBtn.disabled = true;

  // Populate prices
  priceProduct.textContent = formatPrice(subtotal);
  priceTotal.textContent = formatPrice(total);
  submitLabel.textContent = `ยืนยันการสั่งซื้อ ${formatPrice(total)}`;

  // Toggle submit button based on checkbox
  function onCheckboxChange() {
    submitBtn.disabled = !checkbox.checked;
  }
  // Remove old listener by cloning
  const newCheckbox = checkbox.cloneNode(true);
  checkbox.parentNode.replaceChild(newCheckbox, checkbox);
  newCheckbox.addEventListener("change", () => {
    const activeSubmitButton = $("#order-confirm-submit-btn");
    if (activeSubmitButton) activeSubmitButton.disabled = !newCheckbox.checked;
  });

  // Confirm button — actually place the order
  const newSubmitBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
  // Re-fetch label span inside cloned button
  const newLabel = newSubmitBtn.querySelector("#order-confirm-submit-label");
  if (newLabel) newLabel.textContent = `ยืนยันการสั่งซื้อ ${formatPrice(total)}`;
  newSubmitBtn.disabled = !newCheckbox.checked;
  newSubmitBtn.addEventListener("click", () => {
    if (!newCheckbox.checked) return;
    dialog.close();
    openOrderForm();
  });

  // Cancel button
  const cancelBtn = $("#order-confirm-cancel-btn");
  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  newCancelBtn.addEventListener("click", () => dialog.close());

  // Close X button
  const closeBtn = $("#close-order-confirm");
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener("click", () => dialog.close());

  createIconSet();
  dialog.showModal();
}

function orderErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("INSUFFICIENT_STOCK")) return "สินค้านี้มีจำนวนไม่เพียงพอ กรุณาเลือกจำนวนใหม่";
  if (message.includes("PACKAGE_NOT_FOUND")) return "ไม่พบแพ็คเกจที่เลือก กรุณารีเฟรชหน้าเว็บแล้วลองใหม่";
  if (message.includes("PACKAGE_NOT_ACTIVE")) return "แพ็คเกจนี้ปิดขายชั่วคราว กรุณาเลือกแพ็คเกจอื่น";
  if (message.includes("AUTH_REQUIRED")) return "กรุณาเข้าสู่ระบบก่อนสั่งซื้อ";
  if (message.includes("PRODUCT_NOT_FOUND")) return "ไม่พบสินค้านี้หรือสินค้าถูกปิดชั่วคราว";
  if (message.includes("INVALID_QUANTITY")) return "จำนวนสินค้าไม่ถูกต้อง";
  return "ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง";
}

async function submitOrder(formData) {
  const p = currentProduct;
  const purchase = getPurchaseOption(p);
  const submitButton = $("#submit-order");
  const originalHtml = submitButton?.innerHTML || "";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<i data-lucide="loader-circle"></i> กำลังสร้างออเดอร์...';
    createIconSet();
  }

  try {
    if (!window.OlafOrders?.createOrder) throw new Error("Supabase order client is not ready");
    const savedOrder = await window.OlafOrders.createOrder({
      productId: p.id,
      quantity: detailQuantity,
      paymentMethod: normalizePaymentMethod(formData.get("paymentMethod")),
      customerName: formData.get("customerName") || window.OlafStore.currentUser()?.displayName || window.OlafStore.currentUser()?.username || "",
      packageId: purchase.packageId || null
    });

    await refreshCurrentProduct();
    setTextContent("[data-checkout-order-number]", formatOrderReference(savedOrder));
    const orderNumberWrap = $("[data-checkout-order-container]");
    if (orderNumberWrap) orderNumberWrap.hidden = false;
    $("#order-dialog")?.close();
    showPaymentResult(savedOrder);
    showToast("สร้างคำสั่งซื้อแล้ว กรุณาชำระเงินและแนบสลิป", "payment", 5000);
    return;
  } catch (error) {
    showToast(orderErrorMessage(error), "error", 5000);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalHtml;
      createIconSet();
    }
  }
}

function createPromptPayUrl(amount) {
  const promptPayId = globalPayload?.store?.promptPayId || "0812345678";
  const value = Math.max(1, Number(amount || 0)).toFixed(2);
  return `https://promptpay.io/${encodeURIComponent(promptPayId)}/${value}.png`;
}

function normalizePaymentMethod(method) {
  const value = String(method || "").trim().toLowerCase();
  if (["wallet", "wallet-api", "truemoney", "true_money"].includes(value)) return "wallet";
  return "promptpay";
}

function paymentChannelForMethod(method) {
  const normalizedMethod = normalizePaymentMethod(method);
  const channels = Array.isArray(globalPayload?.store?.paymentChannels)
    ? globalPayload.store.paymentChannels
    : [];
  return channels.find((channel) => normalizePaymentMethod(channel.method || channel.id) === normalizedMethod) || null;
}

function paymentQrForOrder(order) {
  const method = normalizePaymentMethod(order.paymentMethod);
  const channel = paymentChannelForMethod(method);
  const paymentInfo = globalPayload?.store?.payment ?? {};
  if (channel?.qrUrl) return channel.qrUrl;
  if (method === "wallet") return paymentInfo.trueMoneyQrUrl || "";
  return paymentInfo.manualQrUrl || "";
}

function showPaymentResult(order) {
  const method = normalizePaymentMethod(order.paymentMethod);
  const methodLabel = { promptpay: "QR พร้อมเพย์", wallet: "TrueMoney Wallet" }[method] || "QR พร้อมเพย์";
  const methodIcon = method === "wallet" ? "wallet" : "qr-code";
  const paymentInfo = globalPayload?.store?.payment ?? {};
  const qrUrl = paymentQrForOrder(order);

  const dialog = $("#qr-dialog");
  if (!dialog) {
    showToast("ไม่พบหน้าต่างชำระเงินด้วย QR กรุณารีเฟรชหน้าเว็บ", "error");
    return;
  }

  currentQrOrder = order;

  const methodBadge = $("[data-qr-method-badge]");
  if (methodBadge) {
    methodBadge.innerHTML = `<i data-lucide="${methodIcon}"></i> ${escapeHtml(methodLabel)}`;
  }

  setTextContent("[data-qr-order-id]", formatOrderReference(order));
  setTextContent("[data-qr-total]", formatPrice(order.total));

  const note = $("[data-qr-note]");
  if (note) {
    let html = "";
    if (paymentInfo.paymentNote) {
      html += `<div class="qr-note-alert"><i data-lucide="info" style="width:16px;height:16px;"></i> ${escapeHtml(cleanDisplayText(paymentInfo.paymentNote))}</div>`;
    }
    let accountBoxesHtml = "";
    if (paymentInfo.bankName && paymentInfo.bankAccountNumber) {
      accountBoxesHtml += `
        <div class="qr-account-box">
          <span class="bank-name">ธนาคาร${escapeHtml(cleanDisplayText(paymentInfo.bankName))}</span>
          <span class="acc-number">${escapeHtml(paymentInfo.bankAccountNumber)}</span>
          ${paymentInfo.bankAccountName ? `<span class="acc-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">ชื่อ: ${escapeHtml(cleanDisplayText(paymentInfo.bankAccountName))}</span>` : ""}
        </div>
      `;
    }
    if (method === "wallet" && paymentInfo.walletName) {
      accountBoxesHtml += `
        <div class="qr-account-box">
          <span class="bank-name">ทรูมันนี่วอลเล็ท</span>
          <span class="acc-number">${escapeHtml(cleanDisplayText(paymentInfo.walletName))}</span>
        </div>
      `;
    }
    
    if (accountBoxesHtml) {
      html += `
        <details class="qr-manual-transfer">
          <summary>สแกน QR ไม่ได้ใช่หรือไม่? กดเพื่อโอนเงินบัญชี</summary>
          <div class="qr-manual-transfer-body">
            <div class="qr-accounts-container">${accountBoxesHtml}</div>
          </div>
        </details>
      `;
    }
    
    note.innerHTML = html;
    note.hidden = html === "";
  }

  const loading = $("[data-qr-loading]");
  const image = $("[data-qr-image]");
  const unavailable = $("[data-qr-unavailable]");
  if (loading) loading.hidden = !qrUrl;
  if (unavailable) unavailable.hidden = true;
  if (image) {
    image.hidden = true;
    image.removeAttribute("src");
    if (qrUrl) {
      image.onload = () => {
        if (loading) loading.hidden = true;
        image.hidden = false;
      };
      image.onerror = () => {
        if (loading) loading.hidden = true;
        image.hidden = true;
        if (unavailable) unavailable.hidden = false;
      };
      image.loading = "eager";
      image.decoding = "async";
      image.fetchPriority = "high";
      image.src = qrUrl;
      if (image.complete && image.naturalWidth > 0) {
        if (loading) loading.hidden = true;
        image.hidden = false;
      }
    } else if (unavailable) {
      unavailable.hidden = false;
    }
  } else if (loading) {
    loading.hidden = true;
  }

  if (!dialog.open) dialog.showModal();
  createIconSet();
  hydrateImages();
}

function paymentSlipErrorMessage(error) {
  const code = String(error?.code || error?.message || "");
  if (code === "PAYMENT_AMOUNT_INSUFFICIENT") {
    return error?.orderCancelled
      ? "ออเดอร์ถูกยกเลิกและคืนสต็อกแล้ว จำนวนเงินไม่เพียงพอ โปรดกดปุ่มติดต่อ"
      : "จำนวนเงินไม่เพียงพอ โปรดกดปุ่มติดต่อ";
  }
  const messages = {
    SLIP_QR_SCANNER_NOT_READY: "ระบบอ่าน QR ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่",
    SLIP_QR_NOT_FOUND: "ไม่พบ QR ในรูป กรุณาใช้ภาพสลิปต้นฉบับที่เห็น QR ชัดเจน",
    INVALID_SLIP_QR: "QR ในรูปไม่ใช่ QR ตรวจสอบสลิปที่รองรับ",
    PAYMENT_METHOD_MISMATCH: "สลิปไม่ตรงกับช่องทางชำระเงินที่เลือก",
    PAYMENT_AMOUNT_MISMATCH: "ยอดเงินในสลิปไม่ตรงกับยอดออเดอร์",
    PAYMENT_TIME_MISMATCH: "เวลาชำระเงินในสลิปไม่ตรงกับช่วงเวลาของออเดอร์",
    RECEIVER_MISMATCH: "ข้อมูลผู้รับเงินในสลิปไม่ตรงกับบัญชีของร้าน",
    DUPLICATE_SLIP: "สลิปนี้ถูกใช้กับออเดอร์อื่นแล้ว",
    RDCW_QUOTA_EXCEEDED: "โควต้าตรวจสลิปหมดหรือแพ็กเกจหมดอายุ กรุณาติดต่อแอดมิน",
    RDCW_IP_NOT_ALLOWED: "ระบบตรวจสลิปยังไม่ได้อนุญาต IP ของเซิร์ฟเวอร์",
    RDCW_TEMPORARY_ERROR: "ระบบตรวจสลิปขัดข้องชั่วคราว สลิปถูกเก็บไว้ให้แอดมินตรวจสอบ",
    PAYMENT_VERIFY_API_UNREACHABLE: "เชื่อมต่อระบบตรวจสลิปไม่ได้ชั่วคราว สลิปถูกเก็บไว้ให้แอดมินตรวจสอบ"
  };
  return messages[code] || error?.message || "ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่";
}

function showPaymentSlipError(error) {
  const isUnderpaid = String(error?.code || "") === "PAYMENT_AMOUNT_INSUFFICIENT";
  showToast(
    paymentSlipErrorMessage(error),
    "error",
    isUnderpaid ? 15000 : 6000,
    isUnderpaid
      ? {
          label: "ติดต่อ",
          href: OFFLINE_SUPPORT_PAGE_URL
        }
      : null
  );
}

function paymentSlipSuccessMessage(order) {
  if (order?.verificationPending) {
    return "แนบสลิปแล้ว แต่ API ขัดข้องชั่วคราว แอดมินสามารถตรวจสอบต่อได้";
  }
  if (order?.status === "delivered") {
    return "ตรวจสลิปแล้ว และจัดส่งบัญชี Offline เรียบร้อย";
  }
  if (order?.paymentStatus === "verified" || order?.status === "confirmed") {
    return "ตรวจสลิปแล้ว รอแอดมินจัดส่งสินค้า";
  }
  return "แนบสลิปแล้ว กำลังตรวจสอบการชำระเงิน";
}

function bindPlatformSlipForm(order) {
  $("#platform-slip-file")?.addEventListener("change", (event) => {
    const fileName = event.target.files?.[0]?.name || "แนบสลิปการชำระเงิน";
    const label = $("#platform-slip-file-label");
    if (label) label.textContent = fileName;
  });

  $("#platform-slip-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = $("#platform-slip-file")?.files?.[0];
    if (!file) {
      showToast("กรุณาเลือกรูปสลิปการชำระเงินก่อน", "warning");
      return;
    }

    const button = event.currentTarget.querySelector('button[type="submit"]');
    const originalHtml = button?.innerHTML || "";
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i data-lucide="loader-circle"></i> กำลังตรวจสลิป...';
      createIconSet();
    }

    try {
      if (!window.OlafOrders?.uploadPaymentSlip) throw new Error("Slip upload client is not ready");
      window.OlafOrderActivity?.showSlipCheck();
      const verifiedOrder = await window.OlafOrders.uploadPaymentSlip({ orderId: order.id, file });
      if (verifiedOrder?.verificationPending) {
        window.OlafOrderActivity?.error(
          "กำลังรอการตรวจสอบ",
          "ระบบตรวจสลิปขัดข้องชั่วคราว สลิปถูกเก็บไว้ให้แอดมินตรวจสอบ"
        );
      } else {
        window.OlafOrderActivity?.success(
          "ตรวจสลิปเรียบร้อย",
          verifiedOrder?.status === "delivered"
            ? "ยืนยันออเดอร์และจัดส่งสินค้า Offline แล้ว"
            : "ยืนยันการชำระเงินแล้ว กำลังอัปเดตประวัติคำสั่งซื้อ",
          700
        );
      }
      showToast(paymentSlipSuccessMessage(verifiedOrder), "payment", 5500);
      await new Promise((resolve) => window.setTimeout(resolve, 760));
      window.location.href = `profile.html?order=${encodeURIComponent(order.id)}#inventory`;
    } catch (error) {
      console.error("Payment slip upload failed", error);
      window.OlafOrderActivity?.error(
        "ตรวจสลิปไม่สำเร็จ",
        paymentSlipErrorMessage(error)
      );
      showPaymentSlipError(error);
      if (error?.orderCancelled) {
        $("#platform-dialog")?.close();
        await refreshCurrentProduct().catch(() => null);
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = originalHtml;
        createIconSet();
      }
    }
  });
}

function ensureQrSlipInput() {
  if (qrSlipInput) return qrSlipInput;
  qrSlipInput = document.createElement("input");
  qrSlipInput.type = "file";
  qrSlipInput.accept = "image/png,image/jpeg,image/webp";
  qrSlipInput.hidden = true;
  qrSlipInput.dataset.qrSlipInput = "true";
  qrSlipInput.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) await uploadCurrentQrSlip(file);
  });
  document.body.append(qrSlipInput);
  return qrSlipInput;
}

async function uploadCurrentQrSlip(file) {
  const order = currentQrOrder;
  if (!order?.id) {
    showToast("ไม่พบออเดอร์สำหรับแนบสลิป", "error");
    return;
  }

  const qrDialog = $("#qr-dialog");
  if (qrDialog?.open) qrDialog.close();
  window.OlafOrderActivity?.showSlipCheck();

  const button = $("[data-qr-upload-slip-btn]");
  const originalHtml = button?.innerHTML || "";
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle"></i><span>กำลังตรวจสลิป...</span>';
    createIconSet();
  }

  try {
    if (!window.OlafOrders?.uploadPaymentSlip) throw new Error("Slip upload client is not ready");
    const verifiedOrder = await window.OlafOrders.uploadPaymentSlip({ orderId: order.id, file });
    if (verifiedOrder?.verificationPending) {
      window.OlafOrderActivity?.error(
        "กำลังรอการตรวจสอบ",
        "ระบบตรวจสลิปขัดข้องชั่วคราว สลิปถูกเก็บไว้ให้แอดมินตรวจสอบ"
      );
    } else {
      window.OlafOrderActivity?.success(
        "ตรวจสลิปเรียบร้อย",
        verifiedOrder?.status === "delivered"
          ? "ยืนยันออเดอร์และจัดส่งสินค้า Offline แล้ว"
          : "ยืนยันการชำระเงินแล้ว กำลังอัปเดตประวัติคำสั่งซื้อ",
        700
      );
    }
    showToast(paymentSlipSuccessMessage(verifiedOrder), "payment", 5500);
    await new Promise((resolve) => window.setTimeout(resolve, 760));
    window.location.href = `profile.html?order=${encodeURIComponent(order.id)}#inventory`;
  } catch (error) {
    console.error("QR slip upload failed", error);
    window.OlafOrderActivity?.error(
      "ตรวจสลิปไม่สำเร็จ",
      paymentSlipErrorMessage(error)
    );
    showPaymentSlipError(error);
    if (error?.orderCancelled) {
      currentQrOrder = null;
      $("#qr-dialog")?.close();
      await refreshCurrentProduct().catch(() => null);
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
      createIconSet();
    }
  }
}

function openQrSlipPicker() {
  if (!currentQrOrder?.id) {
    showToast("กรุณาสร้างคำสั่งซื้อก่อนแนบสลิป", "warning");
    return;
  }
  ensureQrSlipInput().click();
}

function viewCurrentQrOrder() {
  if (!currentQrOrder?.id) {
    showToast("ไม่พบออเดอร์ล่าสุด", "warning");
    return;
  }
  window.location.href = `profile.html?order=${encodeURIComponent(currentQrOrder.id)}#inventory`;
}

function showCancelConfirm() {
  return new Promise((resolve) => {
    const dialog = $("#cancel-confirm-dialog");
    const yesBtn = $("#cancel-confirm-yes-btn");
    const noBtn = $("#cancel-confirm-no-btn");
    
    if (!dialog) {
      resolve(confirm("ยืนยันยกเลิกรายการนี้?"));
      return;
    }
    
    const handleYes = () => { cleanup(); resolve(true); };
    const handleNo = () => { cleanup(); resolve(false); };
    
    function cleanup() {
      yesBtn.removeEventListener("click", handleYes);
      noBtn.removeEventListener("click", handleNo);
      dialog.close();
    }
    
    yesBtn.addEventListener("click", handleYes);
    noBtn.addEventListener("click", handleNo);
    
    dialog.showModal();
    if (window.lucide) window.lucide.createIcons();
  });
}

async function cancelCurrentQrOrder() {
  const order = currentQrOrder;
  if (!order?.id) {
    showToast("ไม่พบออเดอร์สำหรับยกเลิก", "error");
    return;
  }
  const confirmed = await showCancelConfirm();
  if (!confirmed) return;

  const button = $("[data-qr-cancel-btn]");
  const originalText = button?.textContent || "";
  if (button) {
    button.disabled = true;
    button.textContent = "กำลังยกเลิก...";
  }

  try {
    if (!window.OlafOrders?.cancelMyOrder) throw new Error("Order cancel client is not ready");
    window.OlafOrderActivity?.showCancel();
    await window.OlafOrders.cancelMyOrder(order.id);
    currentQrOrder = null;
    $("#qr-dialog")?.close();
    const freshProduct = await refreshCurrentProduct();
    if (freshProduct) {
      renderProduct();
    }
    window.OlafOrderActivity?.success(
      "ยกเลิกออเดอร์แล้ว",
      "คืนสต็อกและอัปเดตคำสั่งซื้อเรียบร้อยแล้ว"
    );
    showToast("ยกเลิกรายการแล้ว", "info", 4000);
  } catch (error) {
    console.error("Cancel order failed", error);
    window.OlafOrderActivity?.error(
      "ยกเลิกออเดอร์ไม่สำเร็จ",
      "กรุณาลองใหม่อีกครั้ง"
    );
    showToast("ยกเลิกรายการไม่สำเร็จ กรุณาลองใหม่", "error", 5000);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function closeLanguageMenu() {
  const popover = $("#language-popover");
  const toggle = $("#lang-toggle");
  if (popover) popover.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

function toggleLanguageMenu() {
  const popover = $("#language-popover");
  const toggle = $("#lang-toggle");
  if (!popover || !toggle) return;
  const nextOpen = popover.hidden;
  if (nextOpen) closeNotificationMenu();
  popover.hidden = !nextOpen;
  toggle.setAttribute("aria-expanded", String(nextOpen));
}

function selectLanguage(lang) {
  if (!["th", "en"].includes(lang)) return;
  currentLang = lang;
  localStorage.setItem("olafshop_lang", currentLang);
  document.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.langOption === currentLang);
  });
  closeLanguageMenu();
}

function closeNotificationMenu() {
  const popover = $("#notification-popover");
  const toggle = $("#open-notifications");
  if (popover) popover.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

function closeUserPopover() {
  const popover = document.querySelector("#user-popover");
  if (popover) popover.hidden = true;
  document.querySelector("#open-auth")?.classList.remove("is-active");
}

function toggleNotificationMenu() {
  const popover = $("#notification-popover");
  const toggle = $("#open-notifications");
  if (!popover || !toggle) return;
  const nextOpen = popover.hidden;
  closeLanguageMenu();
  closeUserPopover();
  popover.hidden = !nextOpen;
  toggle.setAttribute("aria-expanded", String(nextOpen));
}

function renderUserPopover() {
  const popover = document.querySelector("#user-popover");
  const user = window.OlafStore.currentUser();
  if (!popover || !user) return;
  
  const displayName = cleanDisplayText(user.displayName || user.username || "ผู้ใช้");
  const email = cleanDisplayText(user.email || "");
  popover.innerHTML = `
    <div class="user-popover-header">
      <div class="user-popover-avatar">${escapeHtml((displayName || "ผ").slice(0, 1).toUpperCase())}</div>
      <div class="user-popover-info">
        <strong>${escapeHtml(displayName)}</strong>
        <span>${escapeHtml(email)}</span>
      </div>
    </div>
    <div class="user-popover-menu">
      ${user.role === "admin" ? '<a href="olaf-control.html"><i data-lucide="shield"></i>หลังบ้าน (Admin)</a>' : ""}
      <a href="profile.html"><i data-lucide="user"></i>ข้อมูลส่วนตัว</a>
      <a href="profile.html#inventory"><i data-lucide="package"></i>คลังสินค้า (ID/Pass)</a>
      <a href="profile.html#orders"><i data-lucide="receipt-text"></i>ประวัติคำสั่งซื้อ</a>
      <div class="user-popover-divider"></div>
      <button type="button" class="danger-item" id="logout-button"><i data-lucide="log-out"></i>ออกจากระบบ</button>
    </div>
  `;
  createIconSet();
  
  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    await window.OlafStore.logout();
    document.querySelector("#user-popover").hidden = true;
    document.querySelector("#open-auth").classList.remove("is-active");
    $("#account-label").textContent = "เข้าสู่ระบบ";
    showToast("ออกจากระบบแล้ว", "info");
    setTimeout(() => { window.location.reload(); }, 800);
  });
}

function updateAccountChrome() {
  const user = window.OlafStore?.currentUser?.() || null;
  const accountLabelEl = $("#account-label");
  if (accountLabelEl) {
    accountLabelEl.textContent = user ? cleanDisplayText(user.displayName || user.username) : "เข้าสู่ระบบ";
  }
  if (user) {
    renderUserPopover();
  }
  const registerBtn = document.querySelector(".register-button");
  if (registerBtn) registerBtn.style.display = user ? "none" : "";
  const authIcon = document.querySelector("#open-auth")?.querySelector("svg, i");
  if (authIcon) {
    const newIcon = user ? "user" : "log-in";
    if (authIcon.tagName.toLowerCase() === "svg") {
      const newI = document.createElement("i");
      newI.setAttribute("data-lucide", newIcon);
      authIcon.replaceWith(newI);
    } else {
      authIcon.setAttribute("data-lucide", newIcon);
    }
  }
  createIconSet();
}

document.addEventListener("DOMContentLoaded", async () => {
  const authReady = window.OlafStore?.ready?.catch((error) => {
    console.warn("Auth initialization delayed", error);
    return null;
  });

  await loadStore();
  updateAccountChrome();
  renderProduct();

  document.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.langOption === currentLang);
  });

  $("#lang-toggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLanguageMenu();
  });

  $("#language-popover")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const button = event.target.closest("[data-lang-option]");
    if (button) selectLanguage(button.dataset.langOption);
  });

  $("#open-notifications")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNotificationMenu();
  });

  $("#topbar-search-input")?.addEventListener("input", (event) => {
    renderSearchSuggestions(event.currentTarget.value);
  });

  $("#topbar-search-input")?.addEventListener("focus", (event) => {
    renderSearchSuggestions(event.currentTarget.value);
  });

  $("#topbar-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitTopbarSearch();
  });

  $("#topbar-search-toggle")?.addEventListener("click", () => {
    const input = $("#topbar-search-input");
    if (!input) return;
    if (document.activeElement !== input) {
      input.focus();
      renderSearchSuggestions(input.value);
      return;
    }
    submitTopbarSearch();
  });

  $("#close-order")?.addEventListener("click", () => $("#order-dialog")?.close());
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });
  $("[data-qr-close-btn]")?.addEventListener("click", () => $("#qr-dialog")?.close());
  $("[data-qr-upload-slip-btn]")?.addEventListener("click", openQrSlipPicker);
  $("[data-qr-view-order-btn]")?.addEventListener("click", viewCurrentQrOrder);
  $("[data-qr-cancel-btn]")?.addEventListener("click", cancelCurrentQrOrder);
  $("#close-platform")?.addEventListener("click", () => $("#platform-dialog")?.close());
  $("#close-contact")?.addEventListener("click", () => $("#contact-dialog").close());
  $("#open-contact")?.addEventListener("click", (e) => { e.preventDefault(); $("#contact-dialog").showModal(); createIconSet(); });
  
  $("#open-auth")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeLanguageMenu();
    closeNotificationMenu();
    if (window.OlafStore.currentUser()) {
      const popover = document.querySelector("#user-popover");
      if (popover) {
        popover.hidden = !popover.hidden;
        document.querySelector("#open-auth").classList.toggle("is-active", !popover.hidden);
      }
    } else {
      window.location.href = "login.html?return=" + encodeURIComponent(window.location.href);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#topbar-search-wrap")) {
      hideSearchSuggestions();
    }

    if (!event.target.closest(".language-switcher")) {
      closeLanguageMenu();
    }

    if (!event.target.closest(".notification-wrap")) {
      closeNotificationMenu();
    }

    if (!event.target.closest(".user-popover-wrap")) {
      closeUserPopover();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLanguageMenu();
      closeNotificationMenu();
      closeUserPopover();
    }
  });

  await authReady;
  updateAccountChrome();
});
