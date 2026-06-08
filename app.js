const fallbackPayload = {
  store: {
    name: "OLAF SHOP",
    siteIconUrl: "",
    promptPayId: "0812345678",
    paymentEndpoint: "",
    support: {
      line: "@olafshop",
      facebook: "OLAF SHOP",
      hours: "12:00 - 00:00"
    }
  },
  categories: [
    { id: "all", label: "ทั้งหมด" },
    { id: "steam-key", label: "คีย์ Steam" },
    { id: "steam-account", label: "ไอดียกเมล" },
    { id: "offline", label: "Steam Offline" },
    { id: "bundle", label: "แพ็กเกม" }
  ],
  products: [
    {
      id: "elden-ring",
      name: "ELDEN RING",
      publisher: "FromSoftware, Inc.",
      category: "steam-account",
      label: "ขายดี",
      price: 890,
      compareAt: 1790,
      stock: 8,
      sold: 4373,
      rating: "แง่บวกเป็นส่วนมาก",
      delivery: "รับไอดีพร้อมอีเมลทันทีหลังชำระเงิน",
      warranty: "รับประกันเข้าใช้งาน 7 วัน",
      image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
      heroImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_hero.jpg",
      tags: ["โซลส์ไลค์", "ท่องโลกกว้าง", "ดาร์กแฟนตาซี", "เกมสวมบทบาท"],
      description: "ไอดี Steam พร้อมเกม ELDEN RING สำหรับเล่นได้ทันที เหมาะสำหรับผู้เล่นที่ต้องการเริ่มไวและประหยัดงบ"
    },
    {
      id: "monster-hunter-wilds",
      name: "Monster Hunter Wilds",
      publisher: "CAPCOM Co., Ltd.",
      category: "steam-key",
      label: "มาแรง",
      price: 990,
      compareAt: 1990,
      stock: 12,
      sold: 2108,
      rating: "แง่บวกเป็นอย่างมาก",
      delivery: "ส่งคีย์ Steam อัตโนมัติ",
      warranty: "รับประกันคีย์ใช้งานได้ 100%",
      image: "https://cdn.cloudflare.steamstatic.com/steam/apps/2246340/header.jpg",
      heroImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2246340/library_hero.jpg",
      tags: ["แอ็กชัน", "ล่าแย้", "เล่นร่วมกัน", "ผจญภัย"],
      description: "คีย์เกมแท้สำหรับบัญชี Steam โซนไทย พร้อมตรวจสอบสต็อกก่อนสั่งซื้อ"
    },
    {
      id: "helldivers-2",
      name: "HELLDIVERS 2",
      publisher: "Arrowhead Game Studios",
      category: "offline",
      label: "ทีมเพลย์",
      price: 899,
      compareAt: 1290,
      stock: 5,
      sold: 1698,
      rating: "แง่บวกเป็นอย่างมาก",
      delivery: "รับข้อมูล Steam Offline พร้อมคู่มือเข้าเล่น",
      warranty: "ดูแลหลังการขาย 3 วัน",
      image: "https://cdn.cloudflare.steamstatic.com/steam/apps/553850/header.jpg",
      heroImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/553850/library_hero.jpg",
      tags: ["ยิง", "ร่วมมือกัน", "ไซไฟ", "ออนไลน์"],
      description: "แพ็ก Steam Offline สำหรับเล่นบนเครื่องส่วนตัว พร้อมขั้นตอนติดตั้งชัดเจน"
    }
  ]
};

const appConfig = {
  productsEndpoint: "api/products.json",
  paymentEndpoint: "",
  serviceFee: 0,
  promptPayId: "0812345678",
  manualQrUrl: "",
  promoVideos: [
    { id: "v1", title: "OLAF Preview 1", src: "https://www.dropbox.com/scl/fi/idgcgiqrbih50o03c9b9m/v1.mp4?rlkey=t0gq6vjnd7qb51yfb72z0p7cr&st=drz2u4vg&raw=1" },
    { id: "v2", title: "OLAF Preview 2", src: "https://www.dropbox.com/scl/fi/dhes6hlspj4gswchqfrx1/v2.mp4?rlkey=l11noosi6stdnasayr4a4amf5&st=ljrxzysk&raw=1" },
    { id: "v3", title: "OLAF Preview 3", src: "https://www.dropbox.com/scl/fi/2ozz4ckxeszlgykdt9b4j/v3.mp4?rlkey=3k0zekfmpgowj5n08jsoox18e&st=qmybsxn1&raw=1" }
  ],
  ...window.OLAF_CONFIG
};

const storageKeys = {
  lang: "olafshop_lang"
};

const i18n = {
  th: {
    navOrders: "คำสั่งซื้อ",
    heroEyebrow: "Steam Blue Luxury Store",
    heroTitle: "ไอดีเกม Steam คีย์เกม และ Steam Offline พร้อมสต็อกจริง",
    safeOrder: "สั่งซื้อแบบปลอดภัย",
    safeOrderText: "ระบบจะเปิดชำระเงินเฉพาะเมื่อกดสั่งซื้อจากหน้ารายละเอียดสินค้า",
    details: "ดูรายละเอียด",
    orderNow: "สั่งซื้อ",
    account: "เข้าสู่ระบบ"
  },
  en: {
    navOrders: "Orders",
    heroEyebrow: "Steam Blue Luxury Store",
    heroTitle: "Steam accounts, game keys, and offline games with live stock",
    safeOrder: "Secure checkout",
    safeOrderText: "Payment appears only after you order from a product detail page.",
    details: "Details",
    orderNow: "Order",
    account: "Sign in"
  }
};

const state = {
  store: fallbackPayload.store,
  categories: fallbackPayload.categories,
  products: [],
  selectedCategory: "all",
  query: "",
  stockOnly: true,
  priceFilter: "all",
  sortBy: "default",
  currentPage: 1,
  itemsPerPage: 52,
  cart: new Map(),
  detailQuantity: 1,
  currentUser: null,
  orders: [],
  recentPurchases: [],
  recentPurchasesLoading: true,
  recentPurchasesError: ""
};

let currentLang = localStorage.getItem(storageKeys.lang) || "th";
let promoVideoIndex = 0;
let promoVideoBound = false;
const promoVideoFailures = new Set();

const selectors = {
  apiStatus: "#api-status",
  accountLabel: "#account-label",
  authDialog: "#auth-dialog",
  authMessage: "#auth-message",
  cartCount: "#cart-count",
  cartDialog: "#cart-dialog",
  cartItems: "#cart-items",
  categoryList: "#category-list",
  categoryTabs: "#category-tabs",
  checkoutForm: "#checkout-form",
  closeCart: "#close-cart",
  closeAuth: "#close-auth",
  closeDashboard: "#close-dashboard",
  closePayment: "#close-payment",
  closeProduct: "#close-product",
  dashboardDialog: "#dashboard-dialog",
  emptyState: "#empty-state",
  featuredGrid: "#featured-grid",
  heroDeal: "#hero-deal",
  heroFeatured: "#hero-featured",
  openCart: "#open-cart",
  openCheckout: "#open-checkout",
  openAuth: "#open-auth",
  openDashboard: "#open-dashboard",
  paymentDialog: "#payment-dialog",
  paymentResult: "#payment-result",
  productDetail: "#product-detail",
  productDialog: "#product-dialog",
  productGrid: "#product-grid",
  promoVideoPlayer: "#promo-video-player",
  promoVideoPlaylist: "#promo-video-playlist",
  promoVideoStatus: "#promo-video-status",
  promoVideoTitle: "#promo-video-title",
  paginationControls: "#pagination-controls",
  priceFilter: "#price-filter",
  sortSelect: "#sort-select",
  searchInput: "#search-input",
  stockMeterFill: "#stock-meter-fill",
  stockMeterText: "#stock-meter-text",
  stockOnly: "#stock-only",
  recentPurchasesList: "#recent-purchases-list",
  recentPurchasesStatus: "#recent-purchases-status",
  summaryFee: "#summary-fee",
  summarySubtotal: "#summary-subtotal",
  summaryTotal: "#summary-total"
};

const $ = (selector) => document.querySelector(selector);
let iconRefreshQueued = false;
const formatPrice = (value) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(value);

function ratingValue(value) {
  return Math.max(0, Math.min(5, Number(value) || 0));
}

function ratingStars(value) {
  const rating = ratingValue(value);
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[char];
  });
}

function fastImg(src, alt = "", options = {}) {
  if (window.OlafImages?.attrs) return window.OlafImages.attrs(src, alt, options);
  const loading = options.priority ? "eager" : "lazy";
  const fetchPriority = options.priority ? "high" : "low";
  const className = options.className ? ` class="${escapeHtml(options.className)}"` : "";
  return `${className} src="${escapeHtml(src || "")}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"`;
}

function hydrateImages() {
  if (window.OlafImages?.scheduleHydrate) {
    window.OlafImages.scheduleHydrate(document);
    return;
  }
  window.OlafImages?.hydrate?.(document);
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

function t(key) {
  return i18n[currentLang]?.[key] || i18n.th[key] || key;
}

function getCatalogItemsPerPage() {
  const isIpadViewport =
    window.matchMedia("(min-width: 768px) and (max-width: 1180px) and (min-height: 700px)").matches ||
    window.matchMedia("(min-width: 1024px) and (max-width: 1366px) and (orientation: landscape) and (min-height: 700px)").matches;
  return isIpadViewport ? 51 : state.itemsPerPage;
}

function applyLanguage() {
  document.documentElement.lang = currentLang === "en" ? "en" : "th";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.langOption === currentLang);
  });
}

function closeLanguageMenu() {
  const popover = document.querySelector("#language-popover");
  const toggle = document.querySelector("#lang-toggle");
  if (popover) popover.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

function toggleLanguageMenu() {
  const popover = document.querySelector("#language-popover");
  const toggle = document.querySelector("#lang-toggle");
  if (!popover || !toggle) return;
  const nextOpen = popover.hidden;
  if (nextOpen) closeNotificationMenu();
  popover.hidden = !nextOpen;
  toggle.setAttribute("aria-expanded", String(nextOpen));
}

function closeNotificationMenu() {
  const popover = document.querySelector("#notification-popover");
  const toggle = document.querySelector("#open-notifications");
  if (popover) popover.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

function toggleNotificationMenu() {
  const popover = document.querySelector("#notification-popover");
  const toggle = document.querySelector("#open-notifications");
  if (!popover || !toggle) return;
  const nextOpen = popover.hidden;
  closeLanguageMenu();
  closeUserPopover();
  popover.hidden = !nextOpen;
  toggle.setAttribute("aria-expanded", String(nextOpen));
}

function selectLanguage(lang) {
  if (!["th", "en"].includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(storageKeys.lang, currentLang);
  closeLanguageMenu();
  renderAll();
}

function persistCurrentPayload() {
  // Legacy localStorage data remains for non-migrated modules only.
  // Product catalog source of truth is now Supabase; JSON is fallback during migration testing.
}

function refreshAccountState() {
  state.currentUser = window.OlafStore?.currentUser() ?? null;
  state.orders = [];
}

function productById(id) {
  return state.products.find((product) => product.id === id);
}

function getDiscount(product) {
  if (!product.compareAt || product.compareAt <= product.price) return 0;
  return Math.round(((product.compareAt - product.price) / product.compareAt) * 100);
}

function getStockState(stock) {
  if (stock <= 0) return { className: "out-stock", label: "สินค้าหมด" };
  if (stock <= 5) return { className: "low-stock", label: `เหลือ ${stock} ชิ้น` };
  return { className: "in-stock", label: `พร้อมส่ง ${stock} ชิ้น` };
}

function getCategoryLabel(categoryId) {
  return state.categories.find((category) => category.id === categoryId)?.label ?? categoryId;
}

function filteredProducts() {
  const query = state.query.trim().toLowerCase();
  let result = state.products.filter((product) => {
    const matchesCategory =
      state.selectedCategory === "all" || product.category === state.selectedCategory;
    const matchesStock = !state.stockOnly || product.stock > 0;

    let matchesPrice = true;
    if (state.priceFilter === "under50") matchesPrice = product.price < 50;
    else if (state.priceFilter === "50to100") matchesPrice = product.price >= 50 && product.price <= 100;
    else if (state.priceFilter === "over100") matchesPrice = product.price > 100;

    const searchable = [
      product.name,
      product.publisher,
      product.category,
      product.label,
      product.rating,
      ...(product.tags ?? [])
    ]
      .join(" ")
      .toLowerCase();
    return matchesCategory && matchesStock && matchesPrice && searchable.includes(query);
  });

  if (state.sortBy === "priceAsc") {
    result.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === "priceDesc") {
    result.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === "nameAsc") {
    result.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  } else if (state.sortBy === "nameDesc") {
    result.sort((a, b) => b.name.localeCompare(a.name, 'th'));
  }

  return result;
}

async function loadProducts() {
  setApiStatus("กำลังโหลดสินค้า...");

  try {
    const jsonPayloadPromise = fetchJsonProductsPayload().catch((error) => {
      console.warn("Product JSON settings unavailable while using Supabase products", error);
      return null;
    });
    const storeSettingsPromise = fetchOnlineStoreSettings(true);
    const products = await fetchSupabaseProducts();
    const [jsonPayload, storeSettings] = await Promise.all([jsonPayloadPromise, storeSettingsPromise]);
    applyPayload({
      updatedAt: new Date().toISOString(),
      store: mergeStoreSettings(jsonPayload?.store ?? fallbackPayload.store, storeSettings),
      categories: deriveCategories(products, jsonPayload?.categories),
      products
    });
    setApiStatus("อัพเดทข้อมูลสินค้าล่าสุดแล้ว");
  } catch (error) {
    console.warn("Supabase products unavailable; using JSON fallback", error);
    try {
      const [payload, storeSettings] = await Promise.all([
        fetchJsonProductsPayload(),
        fetchOnlineStoreSettings(true)
      ]);
      applyPayload({
        ...payload,
        store: mergeStoreSettings(payload.store ?? fallbackPayload.store, storeSettings)
      });
      setApiStatus("ใช้ JSON fallback ระหว่างทดสอบ Supabase");
    } catch (fallbackError) {
      console.warn("Products JSON fallback unavailable; using inline fallback", fallbackError);
      const storeSettings = await fetchOnlineStoreSettings(true);
      applyPayload({
        ...fallbackPayload,
        store: mergeStoreSettings(fallbackPayload.store, storeSettings)
      });
      setApiStatus("ใช้ข้อมูลสำรองในหน้าเว็บ");
    }
  }
}

async function fetchSupabaseProducts() {
  if (!window.OlafProducts?.fetchActiveProducts) {
    throw new Error("Supabase product client is not ready");
  }
  const products = await window.OlafProducts.fetchActiveProducts();
  if (!products.length) {
    throw new Error("Supabase returned no active products");
  }
  return products;
}

async function fetchJsonProductsPayload() {
  const response = await fetch(appConfig.productsEndpoint, { cache: "default" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (Array.isArray(payload?.products)) return payload;
  if (Array.isArray(payload)) return { products: payload };
  throw new Error("Invalid products JSON payload");
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

async function loadRecentPurchases() {
  state.recentPurchasesLoading = true;
  state.recentPurchasesError = "";
  renderRecentPurchases();

  try {
    if (!window.OlafOrders?.fetchRecentPublicPurchases) {
      throw new Error("Recent purchase client is not ready");
    }
    state.recentPurchases = await window.OlafOrders.fetchRecentPublicPurchases(10);
  } catch (error) {
    console.warn("Recent public purchases unavailable", error);
    state.recentPurchases = [];
    state.recentPurchasesError = "รัน supabase-public-recent-purchases.sql เพื่อเปิดรายการซื้อล่าสุด";
  } finally {
    state.recentPurchasesLoading = false;
    renderRecentPurchases();
  }
}

function formatRelativePurchaseTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่ทราบเวลา";
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return "เมื่อสักครู่";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function formatPurchaseClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderRecentPurchases() {
  const list = $(selectors.recentPurchasesList);
  const status = $(selectors.recentPurchasesStatus);
  if (!list) return;

  if (state.recentPurchasesLoading) {
    if (status) status.textContent = "กำลังโหลด";
    list.innerHTML = Array.from({ length: 5 })
      .map(
        () => `
          <div class="recent-purchase-row is-loading">
            <span class="recent-purchase-icon"></span>
            <div><b></b><small></small></div>
            <time></time>
          </div>
        `
      )
      .join("");
    return;
  }

  if (state.recentPurchasesError) {
    if (status) status.textContent = "ยังไม่พร้อม";
    list.innerHTML = `
      <div class="recent-purchase-empty">
        <i data-lucide="database-zap"></i>
        <span>${escapeHtml(state.recentPurchasesError)}</span>
      </div>
    `;
    createIconSet();
    return;
  }

  if (!state.recentPurchases.length) {
    if (status) status.textContent = "รอออเดอร์";
    list.innerHTML = `
      <div class="recent-purchase-empty">
        <i data-lucide="receipt-text"></i>
        <span>ยังไม่มีรายการซื้อที่แสดงได้</span>
      </div>
    `;
    createIconSet();
    return;
  }

  if (status) status.textContent = `${state.recentPurchases.length} รายการล่าสุด`;
  list.innerHTML = state.recentPurchases
    .map((purchase) => {
      const relativeTime = formatRelativePurchaseTime(purchase.createdAt);
      const clock = formatPurchaseClock(purchase.createdAt);
      const thumb = purchase.productImageUrl
        ? `<img ${fastImg(purchase.productImageUrl, purchase.productName, { className: "recent-purchase-thumb" })} />`
        : `<span class="recent-purchase-icon"><i data-lucide="shopping-bag"></i></span>`;
      return `
        <article class="recent-purchase-row">
          ${thumb}
          <div class="recent-purchase-main">
            <strong>${escapeHtml(purchase.productName || "สินค้า OLAF SHOP")}</strong>
            <small>${escapeHtml(purchase.buyerNameMasked || "ลูกค้าxxx")} · ${Number(purchase.quantity || 1).toLocaleString("th-TH")} ชิ้น</small>
          </div>
          <time datetime="${escapeHtml(purchase.createdAt || "")}">
            <b>${escapeHtml(relativeTime)}</b>
            <span>${escapeHtml(clock)}</span>
          </time>
        </article>
      `;
    })
    .join("");
  createIconSet();
  hydrateImages();
}

function promoVideos() {
  return (Array.isArray(appConfig.promoVideos) ? appConfig.promoVideos : [])
    .map((video, index) => ({
      id: String(video.id || `v${index + 1}`),
      title: String(video.title || `OLAF Preview ${index + 1}`),
      src: String(video.src || `assets/videos/v${index + 1}.mp4`)
    }))
    .filter((video) => video.src);
}

function updatePromoPlaylistState() {
  document.querySelectorAll("[data-promo-video]").forEach((button) => {
    const index = Number(button.dataset.promoVideo || 0);
    const isActive = index === promoVideoIndex;
    const video = promoVideos()[index];
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-missing", Boolean(video && promoVideoFailures.has(video.id)));
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function setPromoVideo(index, { play = true } = {}) {
  const videos = promoVideos();
  const player = $(selectors.promoVideoPlayer);
  const title = $(selectors.promoVideoTitle);
  const status = $(selectors.promoVideoStatus);
  if (!player || !videos.length) return;

  promoVideoIndex = ((index % videos.length) + videos.length) % videos.length;
  const video = videos[promoVideoIndex];
  
  updatePromoPlaylistState();
  
  if (player.src) {
    player.style.transition = "opacity 0.3s ease";
    player.style.opacity = 0;
  }

  setTimeout(() => {
    player.dataset.videoId = video.id;
    player.src = video.src;
    player.load();
    if (title) title.textContent = video.title;
    if (status) status.textContent = `กำลังเล่น ${video.id}.mp4`;

    if (play) {
      player.muted = true;
      const playPromise = player.play?.();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          if (status) status.textContent = "แตะคลิปเพื่อเริ่มเล่น";
        });
      }
    }
    
    player.onloadeddata = () => {
      player.style.opacity = 1;
      player.onloadeddata = null;
    };
  }, player.src ? 300 : 0);
}

function playNextPromoVideo() {
  const videos = promoVideos();
  if (!videos.length) return;
  if (promoVideoFailures.size >= videos.length) {
    const status = $(selectors.promoVideoStatus);
    if (status) status.textContent = "ยังไม่พบไฟล์วิดีโอ v1.mp4, v2.mp4, v3.mp4";
    return;
  }

  let nextIndex = promoVideoIndex;
  for (let step = 0; step < videos.length; step += 1) {
    nextIndex = (nextIndex + 1) % videos.length;
    if (!promoVideoFailures.has(videos[nextIndex].id)) {
      setPromoVideo(nextIndex);
      return;
    }
  }
}

function bindPromoVideoPlayer() {
  if (promoVideoBound) return;
  const player = $(selectors.promoVideoPlayer);
  if (!player) return;
  promoVideoBound = true;

  player.addEventListener("ended", playNextPromoVideo);
  player.addEventListener("error", () => {
    const videos = promoVideos();
    const failedId = player.dataset.videoId;
    if (failedId) promoVideoFailures.add(failedId);
    updatePromoPlaylistState();
    if (promoVideoFailures.size >= videos.length) {
      const status = $(selectors.promoVideoStatus);
      if (status) status.textContent = "ยังไม่พบไฟล์วิดีโอ กรุณาใส่ v1.mp4, v2.mp4, v3.mp4 ใน assets/videos";
      return;
    }
    window.setTimeout(playNextPromoVideo, 300);
  });
  player.addEventListener("click", () => {
    if (player.paused) {
      player.play?.().catch(() => { });
    } else {
      player.pause();
    }
  });

  const muteBtn = document.getElementById("promo-mute-btn");
  if (muteBtn) {
    const updateMuteIcon = () => {
      const icon = player.muted || player.volume === 0 ? "volume-x" : "volume-2";
      muteBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: muteBtn });
    };
    muteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      player.muted = !player.muted;
      if (!player.muted && player.paused) {
        player.play?.().catch(() => { });
      }
      updateMuteIcon();
    });
    player.addEventListener("volumechange", updateMuteIcon);
    player.addEventListener("play", updateMuteIcon);
  }
}

function renderPromoVideos() {
  const playlist = $(selectors.promoVideoPlaylist);
  const player = $(selectors.promoVideoPlayer);
  const videos = promoVideos();
  if (!playlist || !player || !videos.length) return;

  playlist.innerHTML = videos
    .map(
      (video, index) => `
        <button class="promo-video-item" type="button" role="tab" data-promo-video="${index}" aria-selected="${index === promoVideoIndex ? "true" : "false"}">
          <span class="promo-video-number">${index + 1}</span>
          <span>
            <strong>${escapeHtml(video.title)}</strong>
            <small>${escapeHtml(video.id)}.mp4</small>
          </span>
          <i data-lucide="play"></i>
        </button>
      `
    )
    .join("");

  bindPromoVideoPlayer();
  updatePromoPlaylistState();
  if (!player.dataset.videoId) setPromoVideo(promoVideoIndex, { play: true });
  createIconSet();
}

function deriveCategories(products, fallbackCategories = fallbackPayload.categories) {
  const labels = new Map((fallbackCategories || []).map((category) => [category.id, category.label]));
  const categoryIds = [...new Set(products.map((product) => product.category).filter(Boolean))];
  return [
    { id: "all", label: labels.get("all") || "ทั้งหมด" },
    ...categoryIds.map((id) => ({ id, label: labels.get(id) || id }))
  ];
}

function applyPayload(payload) {
  const payloadStore = payload.store ?? {};
  state.store = {
    ...fallbackPayload.store,
    ...payloadStore,
    support: {
      ...fallbackPayload.store.support,
      ...(payloadStore.support ?? {})
    },
    payment: {
      ...(payloadStore.payment ?? {})
    }
  };
  state.categories = Array.isArray(payload.categories) ? payload.categories : fallbackPayload.categories;
  state.products = (Array.isArray(payload.products) ? payload.products : fallbackPayload.products).map((product) => ({
    ...product,
    price: Number(product.price) || 0,
    compareAt: Number(product.compareAt) || 0,
    stock: Number(product.stock) || 0,
    sold: Number(product.sold) || 0
  }));
  appConfig.paymentEndpoint =
    window.OLAF_CONFIG?.paymentEndpoint ??
    state.store.paymentEndpoint ??
    state.store.payment?.paymentEndpoint ??
    "";
  appConfig.promptPayId =
    window.OLAF_CONFIG?.promptPayId ??
    state.store.promptPayId ??
    state.store.payment?.promptPayId ??
    appConfig.promptPayId;
  appConfig.serviceFee = Number(
    window.OLAF_CONFIG?.serviceFee ??
    state.store.serviceFee ??
    state.store.payment?.serviceFee ??
    appConfig.serviceFee ??
    0
  );
  appConfig.manualQrUrl = state.store.payment?.manualQrUrl || "";
}

function setApiStatus(message) {
  const status = $(selectors.apiStatus);
  if (status) status.textContent = message;
}

function renderAll() {
  refreshAccountState();
  applySiteIcon(state.store.siteIconUrl);
  applyBrandIcon(state.store.siteIconUrl);
  applyLanguage();
  renderAccount();
  renderHeroDeal();
  renderStats();
  renderRecentPurchases();
  renderPromoVideos();
  renderCategories();
  renderShowcaseCategoryState();
  renderProducts();
  renderCart();
  renderWidgets();
}

function renderAccount() {
  const label = state.currentUser ? state.currentUser.displayName || state.currentUser.username : t("account");
  const labelEl = $(selectors.accountLabel);
  if (labelEl) labelEl.textContent = label;

  const openAuthEl = $(selectors.openAuth);
  if (openAuthEl) openAuthEl.classList.toggle("is-signed-in", Boolean(state.currentUser));

  const registerBtn = document.querySelector(".register-button");
  if (registerBtn) {
    registerBtn.style.display = state.currentUser ? "none" : "";
  }

  const authIcon = openAuthEl?.querySelector("svg, i");
  if (authIcon) {
    const newIcon = state.currentUser ? "user" : "log-in";
    if (authIcon.tagName.toLowerCase() === "svg") {
      const newI = document.createElement("i");
      newI.setAttribute("data-lucide", newIcon);
      authIcon.replaceWith(newI);
      if (window.lucide) window.lucide.createIcons();
    } else {
      authIcon.setAttribute("data-lucide", newIcon);
    }
  }
}

function productLink(product) {
  return `product.html?id=${encodeURIComponent(product.id)}`;
}

function productPreviewImages(product) {
  const cover = product.heroImage || product.image;
  const allImages = [...new Set([
    cover,
    ...(product.gallery || []),
    product.heroImage,
    product.image
  ].filter(Boolean))];

  if (allImages.length > 1) {
    return allImages.slice(1, 4); // skip first image (cover), take next 3
  }
  return allImages.slice(0, 3);
}

function widgetMarker(code = "") {
  const match = String(code).match(/data-olaf-widget=["']([^"']+)["']/);
  return match?.[1] || "";
}

function renderSteamShowcaseWidget() {
  const products = [...state.products]
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
    .slice(0, 9);
  if (!products.length) return "";

  const rows = products
    .map((product, index) => {
      const discount = getDiscount(product);
      const images = productPreviewImages(product);
      const tags = (product.tags || []).slice(0, 5);
      return `
        <div class="olaf-steam-row">
          <a class="olaf-steam-item" href="${productLink(product)}">
            <img ${fastImg(product.image || product.heroImage, product.name, { className: "olaf-steam-thumb" })} />
            <div class="olaf-steam-info">
              <strong>${escapeHtml(product.name)}</strong>
              <span>${escapeHtml(tags.join(", ") || product.publisher || "Steam Game")}</span>
            </div>
            <div class="olaf-steam-price">
              ${discount
          ? `<span class="olaf-sale-pct">-${discount}%</span><span class="olaf-sale-price"><del>${formatPrice(product.compareAt)}</del><b>${formatPrice(product.price)}</b></span>`
          : `<b>${formatPrice(product.price)}</b>`
        }
            </div>
          </a>
          <aside class="olaf-steam-preview ${index === 0 ? "is-default" : ""}">
            <h3>${escapeHtml(product.name)}</h3>
            <p>รีวิวโดยรวม <span>${escapeHtml(product.rating || "แนะนำ")}</span> · ขายแล้ว ${Number(product.sold || 0).toLocaleString("th-TH")}</p>
            <div class="olaf-preview-tags">
              ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            <div class="olaf-preview-images">
              ${images.map((image) => `<img ${fastImg(image, `${product.name} preview`)} />`).join("")}
            </div>
          </aside>
        </div>
      `;
    })
    .join("");

  return `
    <section class="olaf-steam-widget">
      <div class="olaf-widget-head">
        <div>
          <p class="eyebrow">Steam Platform Widget</p>
          <h2>เกมยอดนิยมแบบ Steam Preview</h2>
        </div>
        ${renderShowcaseCategoryTabs()}
      </div>
      <div class="olaf-steam-body">
        <div class="olaf-steam-list">${rows}</div>
        <div class="olaf-steam-preview-space" aria-hidden="true"></div>
      </div>
    </section>
  `;
}

function renderShowcaseCategoryTabs() {
  const tabs = state.categories;
  return `
    <div class="olaf-widget-tabs" role="tablist" aria-label="หมวดสินค้าแนะนำ">
      ${tabs
      .map((category) => {
        const categoryId = category.id;
        const label = category.label;
        const isActive = state.selectedCategory === categoryId;
        return `
            <button
              class="olaf-widget-tab ${isActive ? "is-active" : ""}"
              type="button"
              role="tab"
              aria-selected="${isActive ? "true" : "false"}"
              data-showcase-category="${escapeHtml(categoryId)}"
            >${escapeHtml(label)}</button>
          `;
      })
      .join("")}
    </div>
  `;
}

function renderTrustCardsWidget() {
  const cards = [
    ["send", "จัดส่งหลังแอดมินยืนยัน", "แนบสลิปแล้วรอตรวจสอบ อัปเดตออเดอร์และข้อมูลจัดส่งจากหลังบ้าน"],
    ["shield-check", "ปลอดภัยและตรวจสอบได้", "เก็บสถานะออเดอร์และรีวิวไว้ในระบบร้าน"],
    ["qr-code", "ชำระเงินสะดวก", "รองรับ QR PromptPay / Wallet / โอนธนาคาร และตั้งค่า QR เองได้"]
  ];
  return `
    <section class="olaf-trust-widget">
      ${cards
      .map(
        ([icon, title, text], index) => `
            <article class="olaf-trust-card">
              <span class="olaf-trust-icon tone-${index + 1}"><i data-lucide="${icon}"></i></span>
              <h3>${title}</h3>
              <p>${text}</p>
            </article>
          `
      )
      .join("")}
    </section>
  `;
}

function renderSocialStripWidget() {
  return ``;
}

function renderLicenseCardsWidget() {
  const cards = [
    ["Windows 10 Home", "OEM", "-95%", "฿199", "฿4,385"],
    ["Windows 10 Pro", "RETAIL", "-95%", "฿199", "฿4,890"],
    ["Windows 11 Home", "OEM", "-95%", "฿199", "฿4,385"],
    ["Windows 11 Pro", "RETAIL", "-95%", "฿199", "฿4,850"]
  ];
  return `
    <section class="olaf-license-widget">
      <div class="olaf-widget-head">
        <div>
          <p class="eyebrow">License Widget</p>
          <h2>คีย์ Windows แท้ ราคาคุ้มค่า</h2>
        </div>
      </div>
      <div class="olaf-license-grid">
        ${cards
      .map(
        ([name, type, discount, price, oldPrice]) => `
              <article class="olaf-license-card">
                <div class="license-badges"><span>${discount}</span><b>${type}</b></div>
                <h3>${name}</h3>
                <p>คีย์แท้ Activate ได้จริง รับประกันและดูแลหลังการขาย</p>
                <div class="license-price"><strong>${price}</strong><del>${oldPrice}</del></div>
                <ul>
                  <li><i data-lucide="check"></i>เปิดใช้งานถาวร</li>
                  <li><i data-lucide="check"></i>1 คีย์ / 1 เครื่อง</li>
                  <li><i data-lucide="check"></i>พร้อมส่งหลังยืนยันออเดอร์</li>
                </ul>
                <a href="#catalog">ดูสินค้า</a>
              </article>
            `
      )
      .join("")}
      </div>
    </section>
  `;
}

function renderWidgetContent(widget) {
  const marker = widgetMarker(widget.code);
  if (marker === "steam-showcase") return renderSteamShowcaseWidget();
  if (marker === "trust-cards") return renderTrustCardsWidget();
  if (marker === "social-strip") return renderSocialStripWidget();
  return widget.code;
}

function renderWidgetArticle(widget) {
  const content = renderWidgetContent(widget);
  if (!content || content.trim() === "") return "";
  return `
    <article class="store-widget ${widgetMarker(widget.code) ? "is-built-in-widget" : ""}">
      <div class="widget-title">${escapeHtml(widget.title)}</div>
      <div class="widget-code">${content}</div>
    </article>
  `;
}

function renderWidgetList(zone, widgets) {
  if (!zone) return;
  const html = widgets.map(renderWidgetArticle).join("");
  zone.hidden = html.trim() === "";
  zone.innerHTML = html;
}

function renderWidgets() {
  const zone = document.querySelector("#widget-zone");
  const steamZone = document.querySelector("#steam-preview-zone");
  if ((!zone && !steamZone) || !window.OlafStore) return;
  const widgets = window.OlafStore
    .getWidgets()
    .filter((widget) => widget.status === "active" && widget.placement === "home");

  renderWidgetList(steamZone, widgets.filter((widget) => widgetMarker(widget.code) === "steam-showcase"));
  renderWidgetList(zone, widgets.filter((widget) => widgetMarker(widget.code) !== "steam-showcase"));
  createIconSet();
  hydrateImages();
}

function renderHeroDeal() {
  const deal = [...state.products]
    .filter((product) => product.stock > 0)
    .sort((a, b) => getDiscount(b) - getDiscount(a))[0];

  if (!deal) return;

  const stock = getStockState(deal.stock);
  $(selectors.heroDeal).innerHTML = `
    <article class="deal-card">
      <img ${fastImg(deal.image || deal.heroImage, deal.name, { priority: true })} />
      <div class="deal-card-body">
        <span class="label-pill">${escapeHtml(deal.label)}</span>
        <h2>${escapeHtml(deal.name)}</h2>
        <div class="product-meta">
          <span class="stock-pill ${stock.className}">${stock.label}</span>
          <span class="discount-pill">-${getDiscount(deal)}%</span>
        </div>
        <div class="price-row">
          <strong class="price">${formatPrice(deal.price)}</strong>
          <span class="compare-price">${formatPrice(deal.compareAt)}</span>
        </div>
        <a class="primary-button" href="product.html?id=${encodeURIComponent(deal.id)}">
          <i data-lucide="shopping-bag"></i>
          ${t("orderNow")}
        </a>
      </div>
    </article>
  `;
}

function renderStats() {
  const totalStock = state.products.reduce((sum, product) => sum + product.stock, 0);
  const totalSold = state.products.reduce((sum, product) => sum + product.sold, 0);
  const accountStock = state.products
    .filter((product) => product.category === "steam-account")
    .reduce((sum, product) => sum + product.stock, 0);

  $("#stat-products").textContent = state.products.length.toLocaleString("th-TH");
  $("#stat-stock").textContent = totalStock.toLocaleString("th-TH");
  $("#stat-sold").textContent = totalSold.toLocaleString("th-TH");
  $("#stat-accounts").textContent = accountStock.toLocaleString("th-TH");

  const capacity = Math.max(totalStock + totalSold * 0.02, totalStock, 1);
  const stockPercent = Math.min(100, Math.round((totalStock / capacity) * 100));
  $(selectors.stockMeterFill).style.width = `${stockPercent}%`;
  $(selectors.stockMeterText).textContent = `${totalStock.toLocaleString("th-TH")} ชิ้นพร้อมส่งจาก ${state.products.length} รายการ`;
}

function renderCategories() {
  $(selectors.categoryTabs).innerHTML = state.categories
    .map(
      (category) => `
        <button
          class="tab-button ${state.selectedCategory === category.id ? "is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${state.selectedCategory === category.id}"
          data-category="${escapeHtml(category.id)}"
        >
          ${escapeHtml(category.label)}
        </button>
      `
    )
    .join("");

  const categoryRows = state.categories
    .filter((category) => category.id !== "all")
    .map((category) => {
      const stockCount = state.products
        .filter((product) => product.category === category.id)
        .reduce((sum, product) => sum + product.stock, 0);
      return `<li><span>${escapeHtml(category.label)}</span><strong>${stockCount.toLocaleString("th-TH")}</strong></li>`;
    })
    .join("");

  $(selectors.categoryList).innerHTML = categoryRows;
}

function renderShowcaseCategoryState() {
  document.querySelectorAll("[data-showcase-category]").forEach((button) => {
    const isActive = button.dataset.showcaseCategory === state.selectedCategory;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function selectCatalogCategory(categoryId, options = {}) {
  if (!state.categories.some((category) => category.id === categoryId)) return;
  state.selectedCategory = categoryId;
  state.currentPage = 1;
  renderCategories();
  renderShowcaseCategoryState();
  renderProducts();

  if (options.scrollToCatalog || options.scrollToProducts) {
    const target = options.scrollToProducts ? document.querySelector(".products-wrap") : $("#catalog");
    if (target) {
      window.scrollTo({
        top: Math.max(target.offsetTop - 84, 0),
        behavior: "smooth"
      });
    }
  }
}

function renderProducts() {
  const products = filteredProducts();
  const itemsPerPage = getCatalogItemsPerPage();
  const featured = [...products]
    .filter((product) => product.stock > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 3);

  const totalPages = Math.ceil(products.length / itemsPerPage) || 1;
  const startIndex = (state.currentPage - 1) * itemsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

  $(selectors.featuredGrid).innerHTML = state.currentPage === 1 ? featured.map(renderFeatureCard).join("") : "";
  $(selectors.productGrid).innerHTML = paginatedProducts.map(renderProductCard).join("");
  const emptyState = $(selectors.emptyState);
  if (emptyState) emptyState.hidden = true;

  renderPagination(totalPages);
  createIconSet();
  hydrateImages();
}

function renderPagination(totalPages) {
  const container = $(selectors.paginationControls);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `<div class="pagination">`;

  if (state.currentPage > 1) {
    html += `<button class="pagination-btn" type="button" data-page="${state.currentPage - 1}"><i data-lucide="chevron-left"></i> ย้อนกลับ</button>`;
  }

  html += `<span class="pagination-info">หน้า ${state.currentPage} จาก ${totalPages}</span>`;

  if (state.currentPage < totalPages) {
    html += `<button class="pagination-btn" type="button" data-page="${state.currentPage + 1}">ถัดไป <i data-lucide="chevron-right"></i></button>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}


function showAuthPanel(panelName) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authTab === panelName);
  });
  document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.authPanel === panelName);
  });
  $(selectors.authMessage).textContent = "";
}

function openAuth(panelName = "login") {
  showAuthPanel(panelName);
  $(selectors.authDialog).showModal();
  createIconSet();
}

function renderMemberDashboard() {
  refreshAccountState();
  const user = state.currentUser;
  if (!user) {
    openAuth("login");
    return;
  }

  const userOrders = state.orders.filter((order) => order.userId === user.id).slice(0, 8);
  const userReviews = state.reviews.filter((review) => review.userId === user.id).slice(0, 8);
  const orderRows = userOrders.length
    ? userOrders
      .map(
        (order) => `
            <div class="dashboard-row">
              <div>
                <strong>${escapeHtml(order.id)}</strong>
                <span>${new Date(order.createdAt).toLocaleString("th-TH")} · ${order.items.length} รายการ</span>
              </div>
              <b>${formatPrice(order.total)}</b>
            </div>
          `
      )
      .join("")
    : `<div class="dashboard-row"><span>ยังไม่มีคำสั่งซื้อ</span></div>`;
  const reviewRows = userReviews.length
    ? userReviews
      .map(
        (review) => `
            <div class="dashboard-row">
              <div>
                <strong>${"★".repeat(review.rating)} ${escapeHtml(review.productName)}</strong>
                <span>${escapeHtml(review.title || review.body)}</span>
              </div>
              <span class="stock-pill ${review.status === "published" ? "in-stock" : "low-stock"}">${escapeHtml(review.status)}</span>
            </div>
          `
      )
      .join("")
    : `<div class="dashboard-row"><span>ยังไม่มีรีวิว</span></div>`;

  $("#member-dashboard").innerHTML = `
    <section class="dashboard-hero">
      <div class="member-avatar">${escapeHtml((user.displayName || user.username || "U").slice(0, 1).toUpperCase())}</div>
      <div>
        <p class="eyebrow">Member Dashboard</p>
        <h2>${escapeHtml(user.displayName || user.username)}</h2>
        <p>${escapeHtml(user.email)} · ${escapeHtml(user.role)} · ${escapeHtml(user.position)}</p>
      </div>
      <button class="secondary-button" type="button" data-logout>
        <i data-lucide="log-out"></i>
        ออกจากระบบ
      </button>
    </section>
    <div class="dashboard-grid">
      <form class="checkout-form" id="profile-form">
        <h3>โปรไฟล์</h3>
        <label>
          ชื่อผู้ใช้
          <input name="username" type="text" value="${escapeHtml(user.username)}" required />
        </label>
        <label>
          ชื่อแสดงผล
          <input name="displayName" type="text" value="${escapeHtml(user.displayName)}" required />
        </label>
        <label>
          รหัสผ่าน
          <a class="secondary-button" href="profile.html#password">เปลี่ยนรหัสผ่าน</a>
        </label>
        <button class="primary-button" type="submit">
          <i data-lucide="save"></i>
          บันทึกโปรไฟล์
        </button>
      </form>
      <section class="dashboard-panel">
        <h3>คำสั่งซื้อของฉัน</h3>
        ${orderRows}
      </section>
      <section class="dashboard-panel">
        <h3>รีวิวของฉัน</h3>
        ${reviewRows}
      </section>
    </div>
  `;
  $(selectors.dashboardDialog).showModal();
  createIconSet();
}

function showToast(message, type = "success", duration = 3500) {
  const container = document.querySelector("#toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  const iconMap = {
    success: "check-circle",
    error: "alert-circle",
    info: "info",
    warning: "alert-triangle",
    payment: "credit-card",
    order: "package",
    shipping: "truck",
    cancel: "x-circle"
  };
  const icon = iconMap[type] || "check-circle";
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  createIconSet();
  setTimeout(() => { toast.classList.add("is-leaving"); setTimeout(() => toast.remove(), 350); }, duration);
  return toast;
}

function renderUserPopover() {
  const popover = document.querySelector("#user-popover");
  if (!popover) return;
  refreshAccountState();
  const user = state.currentUser;
  if (!user) return;

  popover.innerHTML = `
    <div class="user-profile-card">
      <div class="user-popover-header">
        <div class="user-popover-avatar">${escapeHtml((user.displayName || user.username || "U").slice(0, 1).toUpperCase())}</div>
        <div class="user-popover-info">
          <strong>${escapeHtml(user.displayName || user.username)}</strong>
          <span>${escapeHtml(user.email)}</span>
        </div>
      </div>
      <div class="user-popover-badge-row">
        <span class="user-badge-role">${escapeHtml(user.role || 'Member')}</span>
        <span class="user-badge-points">0 Points</span>
      </div>
    </div>
    <div class="user-popover-menu">
      <div class="user-popover-menu-title">หน้าหลัก</div>
      <a href="profile.html"><i data-lucide="user"></i>ข้อมูลส่วนตัว</a>
      <a href="profile.html#inventory"><i data-lucide="package"></i>คลังสินค้า (ID/Pass)</a>
      <a href="orders.html"><i data-lucide="list"></i>ออเดอร์ของฉัน</a>
      <a href="#"><i data-lucide="ticket"></i>โค้ดส่วนลด</a>
      
      <div class="user-popover-divider"></div>
      
      <button type="button" class="danger-item" id="logout-button" data-user-logout><i data-lucide="log-out"></i>ออกจากระบบ</button>
    </div>
  `;
  popover.hidden = false;
  createIconSet();
}

function showUserPopoverSection(section) {
  const panel = document.querySelector("#user-popover-panel");
  if (!panel) return;
  const user = state.currentUser;

  if (section === "info") {
    panel.innerHTML = `
      <div class="password-change-section">
        <label>ชื่อผู้ใช้<input type="text" value="${escapeHtml(user.username)}" readonly /></label>
        <label>ชื่อแสดงผล<input type="text" value="${escapeHtml(user.displayName)}" readonly /></label>
        <label>อีเมล<input type="text" value="${escapeHtml(user.email)}" readonly /></label>
        <label>สถานะ<input type="text" value="${escapeHtml(user.role)} · ${escapeHtml(user.position)}" readonly /></label>
      </div>
    `;
  } else if (section === "inventory") {
    panel.innerHTML = `
      <div class="password-change-section">
        <a class="primary-button" href="profile.html#inventory">
          <i data-lucide="package"></i>
          เปิดคลังสินค้า (ID/Pass)
        </a>
      </div>
    `;
    createIconSet();
  } else if (section === "password") {
    panel.innerHTML = `
      <div class="password-change-section">
        <a class="primary-button" href="profile.html#password">
          <i data-lucide="key-round"></i>
          เปลี่ยนรหัสผ่าน
        </a>
      </div>
    `;
    createIconSet();
  } else {
    panel.innerHTML = "";
  }
}

function closeUserPopover() {
  const popover = document.querySelector("#user-popover");
  if (popover) popover.hidden = true;
}

function renderMemberDashboard() {
  refreshAccountState();
  if (!state.currentUser) {
    openAuth("login");
    return;
  }
  renderUserPopover();
}

function renderFeatureCard(product) {
  const stock = getStockState(product.stock);
  return `
    <article class="feature-card">
      <img ${fastImg(product.image || product.heroImage, product.name, { priority: true })} />
      <div class="feature-body">
        <span class="stock-pill ${stock.className}">${stock.label}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <a class="mini-button" href="product.html?id=${encodeURIComponent(product.id)}">
          <i data-lucide="eye"></i>
          ${t("details")}
        </a>
      </div>
    </article>
  `;
}

function renderProductCard(product) {
  const stock = getStockState(product.stock);
  const discount = getDiscount(product);
  const disabled = product.stock <= 0 ? "disabled" : "";
  const tags = (product.tags ?? [])
    .slice(0, 3)
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  return `
    <article class="product-card">
      <div class="product-image">
        <img ${fastImg(product.image || product.heroImage, product.name)} />
        ${discount ? `<span class="discount-pill">-${discount}%</span>` : ""}
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span class="label-pill">${escapeHtml(getCategoryLabel(product.category))}</span>
          <span class="stock-pill ${stock.className}">${stock.label}</span>
        </div>
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p class="publisher">${escapeHtml(product.publisher)}</p>
        </div>
        <div class="tags">${tags}</div>
        <div class="price-row">
          <strong class="price">${formatPrice(product.price)}</strong>
          ${product.compareAt ? `<span class="compare-price">${formatPrice(product.compareAt)}</span>` : ""}
        </div>
        <div class="card-actions single-action">
          <a class="primary-button" href="product.html?id=${encodeURIComponent(product.id)}">
            <i data-lucide="eye"></i>
            ${t("details")}
          </a>
        </div>
      </div>
    </article>
  `;
}

function openProduct(productId) {
  const product = productById(productId);
  if (!product) return;
  state.detailQuantity = product.stock > 0 ? 1 : 0;
  renderProductDetail(product);
  $(selectors.productDialog).showModal();
  createIconSet();
}

function renderProductDetail(product) {
  const stock = getStockState(product.stock);
  const discount = getDiscount(product);
  const tags = (product.tags ?? []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  const canAdd = product.stock > 0;

  $(selectors.productDetail).innerHTML = `
    <div class="detail-media">
      <img ${fastImg(product.heroImage || product.image, product.name, { priority: true })} />
    </div>
    <div class="detail-body">
      <div>
        <span class="label-pill">${escapeHtml(product.label)}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.publisher)}</p>
      </div>
      <div class="tags">${tags}</div>
      <p>${escapeHtml(product.description)}</p>
      <div class="price-row">
        <strong class="price">${formatPrice(product.price)}</strong>
        ${product.compareAt ? `<span class="compare-price">${formatPrice(product.compareAt)}</span>` : ""}
        ${discount ? `<span class="discount-pill">-${discount}%</span>` : ""}
      </div>
      <ul class="detail-list">
        <li><span>สถานะสต็อก</span><strong>${stock.label}</strong></li>
        <li><span>คะแนนรีวิว</span><strong>${escapeHtml(product.rating)}</strong></li>
        <li><span>การจัดส่ง</span><strong>${escapeHtml(product.delivery)}</strong></li>
        <li><span>รับประกัน</span><strong>${escapeHtml(product.warranty)}</strong></li>
      </ul>
      <div class="quantity-row" aria-label="จำนวนสินค้า">
        <button class="quantity-button" type="button" data-qty="decrease" ${!canAdd ? "disabled" : ""}>
          <i data-lucide="minus"></i>
        </button>
        <span class="quantity-value" id="detail-quantity">${state.detailQuantity}</span>
        <button class="quantity-button" type="button" data-qty="increase" ${!canAdd ? "disabled" : ""}>
          <i data-lucide="plus"></i>
        </button>
      </div>
      <button class="primary-button" type="button" data-detail-add="${escapeHtml(product.id)}" ${!canAdd ? "disabled" : ""}>
        <i data-lucide="shopping-cart"></i>
        เพิ่มลงตะกร้า
      </button>
    </div>
  `;
}

function addToCart(productId, quantity = 1) {
  const product = productById(productId);
  if (!product || product.stock <= 0) return;

  const current = state.cart.get(productId) ?? 0;
  const next = Math.min(product.stock, current + quantity);
  state.cart.set(productId, next);
  renderCart();
  showToast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, "success");
}

function updateCartItem(productId, quantity) {
  const product = productById(productId);
  if (!product) return;
  const next = Math.max(0, Math.min(product.stock, quantity));
  if (next === 0) {
    state.cart.delete(productId);
  } else {
    state.cart.set(productId, next);
  }
  renderCart();
}

function cartEntries() {
  return [...state.cart.entries()]
    .map(([id, quantity]) => ({ product: productById(id), quantity }))
    .filter((entry) => entry.product);
}

function cartSubtotal() {
  return cartEntries().reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = cartSubtotal();
  const fee = subtotal > 0 ? appConfig.serviceFee : 0;
  const total = subtotal + fee;

  $(selectors.cartCount).textContent = count;
  $(selectors.summarySubtotal).textContent = formatPrice(subtotal);
  $(selectors.summaryFee).textContent = formatPrice(fee);
  $(selectors.summaryTotal).textContent = formatPrice(total);

  if (!entries.length) {
    const template = $("#cart-empty-template").content.cloneNode(true);
    $(selectors.cartItems).replaceChildren(template);
    createIconSet();
    return;
  }

  $(selectors.cartItems).innerHTML = entries
    .map(({ product, quantity }) => {
      const lineTotal = product.price * quantity;
      return `
        <article class="cart-item">
          <img ${fastImg(product.image || product.heroImage, product.name)} />
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(getCategoryLabel(product.category))} · ${formatPrice(product.price)} x ${quantity}</p>
            <p>เหลือในสต็อก ${product.stock.toLocaleString("th-TH")} ชิ้น</p>
          </div>
          <div class="cart-item-actions">
            <strong>${formatPrice(lineTotal)}</strong>
            <div class="quantity-row">
              <button class="quantity-button" type="button" data-cart-decrease="${escapeHtml(product.id)}">
                <i data-lucide="minus"></i>
              </button>
              <span class="quantity-value">${quantity}</span>
              <button class="quantity-button" type="button" data-cart-increase="${escapeHtml(product.id)}">
                <i data-lucide="plus"></i>
              </button>
              <button class="quantity-button" type="button" data-cart-remove="${escapeHtml(product.id)}" aria-label="ลบสินค้า">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  createIconSet();
}

function buildOrder(formData) {
  const entries = cartEntries();
  const subtotal = cartSubtotal();
  const fee = subtotal > 0 ? appConfig.serviceFee : 0;
  const total = subtotal + fee;
  return {
    id: `OLAF-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`,
    customerName: formData.get("customerName"),
    contact: formData.get("contact"),
    userId: state.currentUser?.id || null,
    username: state.currentUser?.displayName || state.currentUser?.username || formData.get("customerName"),
    paymentMethod: formData.get("paymentMethod"),
    subtotal,
    fee,
    total,
    currency: "THB",
    items: entries.map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity
    })),
    createdAt: new Date().toISOString()
  };
}

async function createPaymentIntent(order) {
  if (!appConfig.paymentEndpoint) {
    const manualQrUrl = state.store.payment?.manualQrUrl || appConfig.manualQrUrl;
    await new Promise((resolve) => window.setTimeout(resolve, 320));
    return {
      provider: manualQrUrl ? "manual-qr" : "mock",
      reference: order.id,
      amount: order.total,
      status: "pending",
      qrUrl: manualQrUrl || createPromptPayUrl(order.total)
    };
  }

  const response = await fetch(appConfig.paymentEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order)
  });

  if (!response.ok) {
    throw new Error(`Payment API ${response.status}`);
  }

  return response.json();
}

function createPromptPayUrl(amount) {
  const value = Math.max(1, Number(amount || 0)).toFixed(2);
  return `https://promptpay.io/${encodeURIComponent(appConfig.promptPayId)}/${value}.png`;
}

function renderPaymentInstructionRows() {
  const payment = state.store.payment ?? {};
  const rows = [
    payment.bankName && payment.bankAccountNumber
      ? ["บัญชีรับเงิน", `${payment.bankName} ${payment.bankAccountNumber}`]
      : null,
    payment.bankAccountName ? ["ชื่อบัญชี", payment.bankAccountName] : null,
    payment.walletName ? ["Wallet", payment.walletName] : null,
    payment.paymentNote ? ["หมายเหตุ", payment.paymentNote] : null
  ].filter(Boolean);

  return rows
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}



function openPaymentResult(order, payment) {
  const methodLabel = {
    promptpay: "PromptPay QR",
    bank: "โอนธนาคาร",
    "wallet-api": "Wallet API"
  }[order.paymentMethod];

  const paymentInfo = state.store.payment ?? {};
  // Build prominent account info block
  const hasAccountInfo = paymentInfo.bankAccountName || paymentInfo.bankName || paymentInfo.bankAccountNumber;
  const accountInfoHtml = hasAccountInfo ? `
    <div class="payment-account-block">
      <div class="payment-account-header">
        <i data-lucide="building-2"></i>
        <span>โอนเงินมาที่บัญชีนี้</span>
      </div>
      ${paymentInfo.bankName ? `<div class="payment-account-row"><span>ธนาคาร</span><strong>${escapeHtml(paymentInfo.bankName)}</strong></div>` : ''}
      ${paymentInfo.bankAccountNumber ? `<div class="payment-account-row"><span>เลขบัญชี</span><strong class="account-number">${escapeHtml(paymentInfo.bankAccountNumber)}</strong></div>` : ''}
      ${paymentInfo.bankAccountName ? `<div class="payment-account-row"><span>ชื่อบัญชี</span><strong>${escapeHtml(paymentInfo.bankAccountName)}</strong></div>` : ''}
      ${paymentInfo.walletName ? `<div class="payment-account-row"><span>Wallet</span><strong>${escapeHtml(paymentInfo.walletName)}</strong></div>` : ''}
      ${paymentInfo.paymentNote ? `<div class="payment-account-note"><i data-lucide="info"></i>${escapeHtml(paymentInfo.paymentNote)}</div>` : ''}
    </div>
  ` : '';

  $(selectors.paymentResult).innerHTML = `
    <div class="payment-head">
      <div class="payment-success-icon"><i data-lucide="check-circle-2"></i></div>
      <p class="eyebrow">Payment Created</p>
      <h2>รายการชำระเงินพร้อมแล้ว</h2>
      <p>เลขอ้างอิง ${escapeHtml(payment.reference || order.id)} · ${escapeHtml(methodLabel)}</p>
    </div>
    <div class="payment-box">
      <div class="qr-box">
        <img ${fastImg(payment.qrUrl || createPromptPayUrl(order.total), "PromptPay QR", { priority: true })} />
        <div class="qr-amount-badge">${formatPrice(order.total)}</div>
      </div>
      ${accountInfoHtml}
      <div class="payment-lines">
        <div><span>ยอดชำระ</span><strong class="payment-total-highlight">${formatPrice(order.total)}</strong></div>
        <div><span>จำนวนสินค้า</span><strong>${order.items.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น</strong></div>
        <div><span>สถานะ</span><strong><span class="status-waiting">⏳ รอแอดมินยืนยัน</span></strong></div>
      </div>
    </div>
    <div class="copy-row">
      <code id="order-reference">${escapeHtml(order.id)}</code>
      <button class="mini-button" type="button" data-copy-order>
        <i data-lucide="copy"></i>
        คัดลอก
      </button>
    </div>
    <div class="payment-steps">
      <div class="payment-step"><span class="step-num">1</span><span>สแกน QR หรือโอนตามข้อมูลบัญชี</span></div>
      <div class="payment-step"><span class="step-num">2</span><span>แนบสลิปในหน้าออเดอร์</span></div>
      <div class="payment-step"><span class="step-num">3</span><span>รอแอดมินยืนยันและจัดส่ง</span></div>
    </div>
    ${renderReviewPrompt(order)}
  `;

  $(selectors.cartDialog).close();
  $(selectors.paymentDialog).showModal();
  createIconSet();
  // Show action toast
  showToast("สร้างรายการชำระเงินสำเร็จ! กรุณารอแอดมินตรวจสอบ", "payment", 5000);
}

function bindEvents() {
  $(selectors.searchInput).addEventListener("input", (event) => {
    state.query = event.target.value;
    state.currentPage = 1;
    renderProducts();
  });

  $(selectors.stockOnly).addEventListener("change", (event) => {
    state.stockOnly = event.target.checked;
    state.currentPage = 1;
    renderProducts();
  });

  document.querySelectorAll('input[name="sort"]').forEach(radio => {
    radio.addEventListener("change", (event) => {
      state.sortBy = event.target.value;
      state.currentPage = 1;
      renderProducts();
    });
  });

  document.querySelectorAll('input[name="price"]').forEach(radio => {
    radio.addEventListener("change", (event) => {
      state.priceFilter = event.target.value;
      state.currentPage = 1;
      renderProducts();
    });
  });

  const openFilterBtn = $("#open-filter-btn");
  const filterPopover = $("#filter-popover");

  if (openFilterBtn && filterPopover) {
    openFilterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = filterPopover.hidden;
      filterPopover.hidden = !isHidden;
      openFilterBtn.setAttribute("aria-expanded", !isHidden);
    });

    document.addEventListener("click", (e) => {
      if (!filterPopover.hidden && !filterPopover.contains(e.target) && e.target !== openFilterBtn) {
        filterPopover.hidden = true;
        openFilterBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  $(selectors.categoryTabs).addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    selectCatalogCategory(button.dataset.category, { scrollToProducts: button.dataset.category === "all" });
  });

  document.body.addEventListener("click", async (event) => {
    const detailButton = event.target.closest("[data-detail]");
    const addButton = event.target.closest("[data-add]");
    const detailAddButton = event.target.closest("[data-detail-add]");
    const cartDecrease = event.target.closest("[data-cart-decrease]");
    const cartIncrease = event.target.closest("[data-cart-increase]");
    const cartRemove = event.target.closest("[data-cart-remove]");
    const quantityButton = event.target.closest("[data-qty]");
    const copyOrder = event.target.closest("[data-copy-order]");
    const authFromReview = event.target.closest("[data-open-auth-from-review]");
    const logoutButton = event.target.closest("[data-logout]");
    const pageButton = event.target.closest("[data-page]");
    const showcaseCategoryButton = event.target.closest("[data-showcase-category]");
    const promoVideoButton = event.target.closest("[data-promo-video]");

    if (promoVideoButton) {
      setPromoVideo(Number(promoVideoButton.dataset.promoVideo || 0));
      return;
    }

    if (showcaseCategoryButton) {
      selectCatalogCategory(showcaseCategoryButton.dataset.showcaseCategory, { scrollToCatalog: true });
      return;
    }

    if (pageButton) {
      state.currentPage = parseInt(pageButton.dataset.page, 10);
      renderProducts();
      const wrap = document.querySelector(".products-wrap");
      if (wrap) window.scrollTo({ top: wrap.offsetTop - 100, behavior: "smooth" });
      return;
    }

    if (detailButton) {
      openProduct(detailButton.dataset.detail);
      return;
    }

    if (addButton) {
      if (!state.currentUser) {
        window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      addToCart(addButton.dataset.add);
      $(selectors.cartDialog).showModal();
      return;
    }

    if (detailAddButton) {
      if (!state.currentUser) {
        window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      addToCart(detailAddButton.dataset.detailAdd, state.detailQuantity);
      $(selectors.productDialog).close();
      $(selectors.cartDialog).showModal();
      return;
    }

    if (cartDecrease) {
      const id = cartDecrease.dataset.cartDecrease;
      updateCartItem(id, (state.cart.get(id) ?? 0) - 1);
      return;
    }

    if (cartIncrease) {
      const id = cartIncrease.dataset.cartIncrease;
      updateCartItem(id, (state.cart.get(id) ?? 0) + 1);
      return;
    }

    if (cartRemove) {
      updateCartItem(cartRemove.dataset.cartRemove, 0);
      return;
    }

    if (quantityButton) {
      const activeProductName = $("#product-detail h2")?.textContent;
      const product = state.products.find((item) => item.name === activeProductName);
      if (!product) return;
      const direction = quantityButton.dataset.qty;
      const next =
        direction === "increase"
          ? Math.min(product.stock, state.detailQuantity + 1)
          : Math.max(1, state.detailQuantity - 1);
      state.detailQuantity = next;
      $("#detail-quantity").textContent = next;
      return;
    }

    if (copyOrder) {
      const reference = $("#order-reference")?.textContent ?? "";
      navigator.clipboard?.writeText(reference);
      copyOrder.textContent = "คัดลอกแล้ว";
    }

    if (authFromReview) {
      openAuth("login");
      return;
    }

    if (logoutButton) {
      await window.OlafStore?.logout();
      closeUserPopover();
      renderAll();
      showToast("ออกจากระบบแล้ว", "info");
    }

    // User popover sections
    const sectionBtn = event.target.closest("[data-user-section]");
    if (sectionBtn) {
      showUserPopoverSection(sectionBtn.dataset.userSection);
      return;
    }

    const userLogout = event.target.closest("[data-user-logout]");
    if (userLogout) {
      await window.OlafStore?.logout();
      closeUserPopover();
      renderAll();
      showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
      return;
    }
  });

  document.body.addEventListener("submit", async (event) => {
    if (event.target.matches("#profile-form")) {
      event.preventDefault();
      const formData = new FormData(event.target);
      await window.OlafStore.updateUser(state.currentUser.id, {
        username: formData.get("username"),
        displayName: formData.get("displayName")
      });
      renderAll();
      showToast("บันทึกโปรไฟล์เรียบร้อยแล้ว", "success");
    }

    if (event.target.matches("#user-password-form")) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const msg = document.querySelector("#pw-change-msg");
      try {
        if (!state.currentUser) throw new Error("กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน");
        await window.OlafStore.changePassword(
          state.currentUser.id,
          formData.get("oldPassword") || formData.get("currentPassword"),
          formData.get("newPassword") || formData.get("password")
        );
        event.target.reset();
        if (msg) { msg.style.color = "var(--success)"; msg.textContent = "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว"; }
        showToast("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", "success");
      } catch (error) {
        if (msg) { msg.style.color = "var(--danger)"; msg.textContent = error.message; }
        showToast(error.message, "error");
      }
    }
  });

  document.querySelector(".auth-tabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-tab]");
    if (!button) return;
    showAuthPanel(button.dataset.authTab);
  });

  document.querySelector("#login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const user = await window.OlafStore.signIn(formData.get("email"), formData.get("password"));
      $(selectors.authDialog)?.close();
      renderAll();
      showToast(`เข้าสู่ระบบสำเร็จ ${user.displayName || user.username}!`, "success");
    } catch (error) {
      if ($(selectors.authMessage)) $(selectors.authMessage).textContent = error.message;
      showToast(error.message, "error");
    }
  });

  document.querySelector("#register-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const user = await window.OlafStore.signUp({
        email: formData.get("email"),
        username: formData.get("username"),
        displayName: formData.get("displayName"),
        password: formData.get("password")
      });
      event.currentTarget.reset();
      $(selectors.authDialog)?.close();
      renderAll();
      showToast(`ยินดีต้อนรับกลับสู่ OLAF SHOP, ${user.displayName || user.username}!`, "success", 4000);
    } catch (error) {
      if ($(selectors.authMessage)) $(selectors.authMessage).textContent = error.message;
      showToast(error.message, "error");
    }
  });


  document.querySelector("#lang-toggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLanguageMenu();
  });
  document.querySelector("#language-popover")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const button = event.target.closest("[data-lang-option]");
    if (button) selectLanguage(button.dataset.langOption);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".language-switcher")) closeLanguageMenu();
    if (!event.target.closest(".notification-wrap")) closeNotificationMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLanguageMenu();
      closeNotificationMenu();
    }
  });
  document.querySelector("#open-notifications")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNotificationMenu();
  });
  $(selectors.openCart)?.addEventListener("click", () => {
    if (!state.currentUser) {
      window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    $(selectors.cartDialog).showModal();
  });
  $(selectors.openCheckout)?.addEventListener("click", () => {
    if (!state.currentUser) {
      window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    $(selectors.cartDialog).showModal();
  });
  $(selectors.openAuth).addEventListener("click", (event) => {
    event.stopPropagation();
    closeNotificationMenu();
    if (state.currentUser) {
      const popover = document.querySelector("#user-popover");
      if (popover && !popover.hidden) {
        closeUserPopover();
      } else {
        renderUserPopover();
      }
    } else {
      // ไปหน้า login แบบเต็มโดยตรง พร้อมส่ง return URL
      window.location.href = "login.html?return=" + encodeURIComponent(window.location.pathname + window.location.search);
    }
  });
  // Close user popover on outside click
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user-popover-wrap")) closeUserPopover();
  });
  $(selectors.openDashboard)?.addEventListener("click", renderMemberDashboard);

  // Replaced contact dialog listeners
  $(selectors.heroFeatured).addEventListener("click", () => {
    const dealLink = $(selectors.heroDeal).querySelector("a[href]");
    if (dealLink) {
      window.location.href = dealLink.href;
    }
  });

  $(selectors.closeProduct).addEventListener("click", () => $(selectors.productDialog).close());
  $(selectors.closeAuth)?.addEventListener("click", () => $(selectors.authDialog)?.close());
  $(selectors.closeDashboard).addEventListener("click", () => $(selectors.dashboardDialog).close());
  $(selectors.closeCart).addEventListener("click", () => $(selectors.cartDialog).close());
  $(selectors.closePayment).addEventListener("click", () => $(selectors.paymentDialog).close());

  $(selectors.checkoutForm).addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.cart.size) {
      showToast("กรุณาเลือกสินค้าก่อน", "warning");
      return;
    }

    const submitButton = $("#submit-order");
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i data-lucide="loader-circle"></i> กำลังเปิดหน้าสินค้า...';
    createIconSet();

    try {
      const firstProductId = state.cart.keys().next().value;
      showToast("กรุณาสั่งซื้อจากหน้ารายละเอียดสินค้า เพื่อให้ระบบตัดสต็อกผ่าน Supabase อย่างปลอดภัย", "info", 5000);
      if (firstProductId) {
        window.setTimeout(() => {
          window.location.href = productLink({ id: firstProductId });
        }, 650);
      }
    } catch (error) {
      showToast("ไม่สามารถเปิดหน้าสินค้าได้ กรุณาลองอีกครั้ง", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
      createIconSet();
    }
  });
}

function applySearchFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchFromUrl = urlParams.get("search");
  if (!searchFromUrl) return;

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.value = searchFromUrl;
    state.query = searchFromUrl;
    state.currentPage = 1;
    renderProducts();
    const catalog = document.querySelector("#catalog") || document.querySelector(".products-wrap");
    if (catalog) setTimeout(() => catalog.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const authReady = window.OlafStore?.ready?.catch((error) => {
    console.warn("Auth initialization delayed", error);
    return null;
  });

  bindEvents();
  applyPayload(fallbackPayload);
  renderAll();
  applySearchFromUrl();
  loadRecentPurchases();

  await loadProducts();
  renderAll();
  applySearchFromUrl();

  await authReady;
  refreshAccountState();
  renderAccount();
  renderCart();
  createIconSet();
  hydrateImages();
});
