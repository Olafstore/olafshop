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

const suggestionLimit = 12;

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

function showToast(message, type = "success", duration = 3500) {
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
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span>`;
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
    globalPayload = {
      ...payload,
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

  const [jsonPayload, product] = await Promise.all([
    jsonPayloadPromise,
    window.OlafProducts.fetchProductById(productId)
  ]);
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

  let products = await withTimeout(window.OlafProducts.fetchActiveProducts(), 700, [product]).catch((error) => {
    console.warn("Supabase product list unavailable for search suggestions", error);
    return [enrichedProduct];
  });
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
  const categoryIds = [...new Set(products.map((product) => product.category).filter(Boolean))];
  return [
    { id: "all", label: labels.get("all") || "ทั้งหมด" },
    ...categoryIds.map((id) => ({ id, label: labels.get(id) || id }))
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
  const title = String(pkg.title || pkg.name || "").trim();
  if (!title) return null;
  return {
    id: String(pkg.id || `package-${index}`).trim(),
    title,
    subtitle: String(pkg.subtitle || "").trim(),
    description: String(pkg.description || "").trim(),
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
    buyBtn.innerHTML = `<i data-lucide="shopping-cart"></i>${canBuy ? "ซื้อเลยตอนนี้" : "สินค้าหมด"}`;
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
  const nextProduct = freshProduct ? { ...freshProduct, packages: freshPackages || [] } : {
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
  return (
    globalPayload?.categories?.find((category) => category.id === categoryId)?.label ||
    {
      "steam-key": "คีย์ Steam",
      "steam-account": "ไอดีเกม",
      offline: "Steam Offline",
      bundle: "แพ็กเกม"
    }[categoryId] ||
    categoryId ||
    "สินค้า"
  );
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
        ...(product.tags || [])
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
                <img ${fastImg(product.image || product.heroImage, product.name, { className: "suggestion-img" })} />
                <span class="suggestion-info">
                  <span class="suggestion-name">${highlightMatch(product.name, keyword)}</span>
                  <span class="suggestion-meta">${escapeHtml(product.publisher || getCategoryLabel(product.category))}</span>
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
  currentProductPackages = activePackagesForProduct(p);
  if (currentProductPackages.length && !currentProductPackages.some((pkg) => pkg.id === selectedPackageId)) {
    selectedPackageId = currentProductPackages[0].id;
  }
  if (!currentProductPackages.length) selectedPackageId = null;

  const purchase = getPurchaseOption(p);
  const canAdd = purchase.stock > 0;
  detailQuantity = canAdd ? 1 : 0;

  // Determine platform badge class
  const catId = (p.category || "").toLowerCase();
  let badgeClass = "pd-badge-steam";
  let badgeLabel = "STEAM";
  if (catId.includes("psn") || catId.includes("ps4") || catId.includes("ps5")) {
    badgeClass = "pd-badge-psn"; badgeLabel = "PSN";
  } else if (catId.includes("xbox")) {
    badgeClass = "pd-badge-xbox"; badgeLabel = "XBOX";
  }
  const labelText = p.label || "";
  const hasOfflineBadge = labelText.toLowerCase().includes("offline") || catId.includes("offline");
  const hasPremiumBadge = labelText.toLowerCase().includes("premium") || labelText.toLowerCase().includes("deluxe");

  // Tags as genre chips in sidebar
  const genreTags = (p.tags || [])
    .map((t) => `<span class="pd-genre-tag">${escapeHtml(t)}</span>`)
    .join("");

  // Gallery images from admin gallery field (left column main image)
  // Left hero = gallery[0] → fallback heroImage → fallback image
  // Sidebar cover = heroImage → fallback image
  const galleryArr = Array.isArray(p.gallery) && p.gallery.length > 0
    ? p.gallery
    : [];

  // Use ONLY gallery images as requested by the user
  const screenshotSrcs = [...new Set(galleryArr.filter(Boolean))];

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
      <img id="pd-hero-main" ${fastImg(leftMainImg, p.name, { priority: true })} />
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
      // Bold the key label before colon, e.g. "OS: Windows" → "<strong>OS:</strong> Windows"
      const colonIdx = item.indexOf(':');
      if (colonIdx > 0) {
        const label = escapeHtml(item.slice(0, colonIdx + 1));
        const value = escapeHtml(item.slice(colonIdx + 1));
        return `<li><strong>${label}</strong>${value}</li>`;
      }
      return `<li>${escapeHtml(item)}</li>`;
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
          const name = lang.replace(/^🔊\s*/, '');
          return `<span class="pd-lang-chip${hasAudio ? ' has-audio' : ''}">${hasAudio ? '<span class="pd-lang-audio">🔊</span>' : ''}<span>${escapeHtml(name)}</span></span>`;
        }).join("")}
      </div>
      <p class="pd-lang-note"><span class="pd-lang-audio">🔊</span> ภาษาที่มีการรองรับเสียงพากย์</p>
    </div>
  ` : "";

  // Related products: same category, exclude current, max 6 for an even mobile grid
  const relatedProducts = (globalPayload.products || [])
    .filter((rp) => rp.id !== p.id && rp.category === p.category && rp.stock > 0)
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
    .slice(0, 6);

  const relatedCards = relatedProducts.map((rp) => {
    const rpStock = getStockState(rp.stock);
    const rpDiscount = getDiscount(rp);
    return `
      <a class="pd-related-card" href="product.html?id=${encodeURIComponent(rp.id)}">
        <div class="pd-related-img">
          <img ${fastImg(rp.image || rp.heroImage, rp.name)} />
          ${rpDiscount ? `<span class="pd-related-discount">-${rpDiscount}%</span>` : ""}
        </div>
        <div class="pd-related-body">
          <p class="pd-related-name">${escapeHtml(rp.name)}</p>
          <p class="pd-related-publisher">${escapeHtml(rp.publisher || "")}</p>
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

  container.innerHTML = `
    <div class="pd-bg-backdrop fade-in" ${fastBg(p.heroImage || p.image || leftMainImg)}></div>
    <a class="pd-breadcrumb" href="index.html" style="position:relative;z-index:10;">
      <i data-lucide="arrow-left"></i>
      กลับไปหน้าร้านค้า
    </a>

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
          <div class="pd-description">${(p.description || "ยังไม่มีรายละเอียดสินค้า").replace(/\n/g, "<br>")}</div>
        </div>

        <!-- Dynamic Detail Sections from Admin -->
        ${Array.isArray(p.detailSections) && p.detailSections.length > 0 ? p.detailSections.map(s => `
        <div class="pd-section">
          <h3 class="pd-section-title">
            <span class="pd-section-icon-box"><i data-lucide="info"></i></span>
            ${escapeHtml(s.title)}
          </h3>
          <div class="pd-description">${escapeHtml(s.body).replace(/\n/g, "<br>")}</div>
        </div>
        `).join("") : ""}

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
              <strong>${escapeHtml(p.delivery)}</strong>
            </div>` : ""}
            ${p.warranty ? `
            <div class="pd-info-row">
              <span><i data-lucide="shield-check" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--success)"></i>รับประกัน</span>
              <strong>${escapeHtml(p.warranty)}</strong>
            </div>` : ""}
            ${p.rating ? `
            <div class="pd-info-row">
              <span><i data-lucide="star" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-right:6px;color:var(--gold)"></i>คะแนนรีวิว</span>
              <strong>${escapeHtml(p.rating)}</strong>
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
            <img ${fastImg(sidebarCoverImg, p.name, { priority: true })} />
          </div>

          <div class="pd-sidebar-body">

            <!-- Platform badges -->
            <div class="pd-badges">
              <span class="pd-badge ${badgeClass}">${badgeLabel}</span>
              ${hasOfflineBadge ? `<span class="pd-badge pd-badge-offline">OFFLINE</span>` : ""}
              ${hasPremiumBadge ? `<span class="pd-badge pd-badge-premium">${escapeHtml(labelText)}</span>` : labelText && !hasOfflineBadge ? `<span class="pd-badge pd-badge-offline">${escapeHtml(labelText)}</span>` : ""}
            </div>

            <!-- Title & publisher -->
            <h1 class="pd-sidebar-title">${escapeHtml(p.name)}</h1>
            ${p.publisher ? `<p class="pd-sidebar-publisher">${escapeHtml(p.publisher)}</p>` : ""}

            <!-- Genre tags -->
            ${genreTags ? `<div class="pd-genre-tags">${genreTags}</div>` : ""}

            <div class="pd-separator"></div>

            ${packageSection}

            <!-- Price -->
            <p class="pd-price-label">ราคาสินค้า</p>
            <div class="pd-price-row">
              <strong class="pd-price-main" data-purchase-price>${formatPrice(purchase.price)}</strong>
              ${compareEl}
            </div>
            ${discountBadge}

            <!-- Quantity (Removed as requested) -->

            <!-- Buy button -->
            <button class="pd-buy-btn" type="button" id="btn-buy" ${!canAdd ? "disabled" : ""}>
              <i data-lucide="shopping-cart"></i>
              ${canAdd ? "ซื้อเลยตอนนี้" : "สินค้าหมด"}
            </button>

            <!-- Feature info row -->
            <div class="pd-features-row">
              ${Array.isArray(p.featureBlocks) && p.featureBlocks.length > 0 ? p.featureBlocks.map(f => `
              <div class="pd-feature-item">
                <div class="pd-feature-icon">
                  <i data-lucide="${escapeHtml(f.icon)}"></i>
                </div>
                <div class="pd-feature-text">
                  <strong>${escapeHtml(f.title)}</strong>
                  <span>${escapeHtml(f.text)}</span>
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
                  <strong>Cloud Gaming</strong>
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
                  <strong>Cloud Save</strong>
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
                <span>${escapeHtml(l.label)}</span>
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
    image.alt = p.name || "Product";
    image.loading = "lazy";
    image.decoding = "async";
  }
  hydrateImages();

  const categoryLabel = purchase.hasPackage
    ? `แพ็คเกจ: ${purchase.packageTitle}`
    : p.label || getCategoryLabel(p.category);
  setTextContent("[data-checkout-product-name]", p.name || "");
  setTextContent("[data-checkout-product-label]", purchase.hasPackage ? categoryLabel : categoryLabel ? `Type: ${categoryLabel}` : "Type: -");
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
    showToast("Order created. Please upload payment slip after transfer.", "payment", 5000);
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
    showToast("ไม่พบหน้าต่าง QR Payment กรุณารีเฟรชหน้าเว็บ", "error");
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
      html += `<div class="qr-note-alert"><i data-lucide="info" style="width:16px;height:16px;"></i> ${escapeHtml(paymentInfo.paymentNote)}</div>`;
    }
    let accountBoxesHtml = "";
    if (paymentInfo.bankName && paymentInfo.bankAccountNumber) {
      accountBoxesHtml += `
        <div class="qr-account-box">
          <span class="bank-name">ธนาคาร${escapeHtml(paymentInfo.bankName)}</span>
          <span class="acc-number">${escapeHtml(paymentInfo.bankAccountNumber)}</span>
          ${paymentInfo.bankAccountName ? `<span class="acc-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">ชื่อ: ${escapeHtml(paymentInfo.bankAccountName)}</span>` : ""}
        </div>
      `;
    }
    if (method === "wallet" && paymentInfo.walletName) {
      accountBoxesHtml += `
        <div class="qr-account-box">
          <span class="bank-name">ทรูมันนี่วอลเล็ท</span>
          <span class="acc-number">${escapeHtml(paymentInfo.walletName)}</span>
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

function bindPlatformSlipForm(order) {
  $("#platform-slip-file")?.addEventListener("change", (event) => {
    const fileName = event.target.files?.[0]?.name || "Upload payment slip";
    const label = $("#platform-slip-file-label");
    if (label) label.textContent = fileName;
  });

  $("#platform-slip-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = $("#platform-slip-file")?.files?.[0];
    if (!file) {
      showToast("Please choose a payment slip image first.", "warning");
      return;
    }

    const button = event.currentTarget.querySelector('button[type="submit"]');
    const originalHtml = button?.innerHTML || "";
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i data-lucide="loader-circle"></i> Uploading...';
      createIconSet();
    }

    try {
      if (!window.OlafOrders?.uploadPaymentSlip) throw new Error("Slip upload client is not ready");
      await window.OlafOrders.uploadPaymentSlip({ orderId: order.id, file });
      showToast("Payment slip uploaded. Waiting for admin review.", "payment", 5000);
      window.location.href = `orders.html?order=${encodeURIComponent(order.id)}`;
    } catch (error) {
      console.error("Payment slip upload failed", error);
      showToast(error?.message || "Payment slip upload failed.", "error", 5500);
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

  const button = $("[data-qr-upload-slip-btn]");
  const originalHtml = button?.innerHTML || "";
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle"></i><span>กำลังอัปโหลดสลิป...</span>';
    createIconSet();
  }

  try {
    if (!window.OlafOrders?.uploadPaymentSlip) throw new Error("Slip upload client is not ready");
    await window.OlafOrders.uploadPaymentSlip({ orderId: order.id, file });
    showToast("แนบสลิปเรียบร้อยแล้ว รอแอดมินตรวจสอบ", "payment", 5000);
    window.location.href = `orders.html?order=${encodeURIComponent(order.id)}`;
  } catch (error) {
    console.error("QR slip upload failed", error);
    showToast(error?.message || "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่", "error", 5500);
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
  window.location.href = `orders.html?order=${encodeURIComponent(currentQrOrder.id)}`;
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
    await window.OlafOrders.cancelMyOrder(order.id);
    currentQrOrder = null;
    $("#qr-dialog")?.close();
    const freshProduct = await refreshCurrentProduct();
    if (freshProduct) {
      renderProduct();
    }
    showToast("ยกเลิกรายการแล้ว", "info", 4000);
  } catch (error) {
    console.error("Cancel order failed", error);
    showToast(error?.message || "ยกเลิกรายการไม่สำเร็จ", "error", 5000);
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
  
  popover.innerHTML = `
    <div class="user-popover-header">
      <div class="user-popover-avatar">${escapeHtml((user.displayName || user.username || "U").slice(0, 1).toUpperCase())}</div>
      <div class="user-popover-info">
        <strong>${escapeHtml(user.displayName || user.username)}</strong>
        <span>${escapeHtml(user.email)}</span>
      </div>
    </div>
    <div class="user-popover-menu">
      ${user.role === "admin" ? '<a href="admin.html"><i data-lucide="shield"></i>หลังบ้าน (Admin)</a>' : ""}
      <a href="profile.html"><i data-lucide="user"></i>ข้อมูลส่วนตัว</a>
      <a href="profile.html#inventory"><i data-lucide="package"></i>คลังสินค้า (ID/Pass)</a>
      <a href="orders.html"><i data-lucide="receipt-text"></i>ออเดอร์ของฉัน</a>
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
    accountLabelEl.textContent = user ? user.displayName || user.username : "เข้าสู่ระบบ";
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
