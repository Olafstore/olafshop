// Products, stock, and orders are managed online through Supabase/RLS/RPC.
// Legacy localStorage remains only for non-migrated reviews/widgets and old cleanup helpers.

const state = {
  basePayload: null,
  payload: null,
  selectedProductId: null,
  search: "",
  stockLog: [],
  pendingQrDataUrl: null,
  pendingQrFile: null,
  pendingQrPreviewUrl: null,
  qrCleared: false,
  pendingTrueMoneyQrDataUrl: null,
  pendingTrueMoneyQrFile: null,
  pendingTrueMoneyQrPreviewUrl: null,
  tmQrCleared: false,
  pendingSiteIconDataUrl: null,
  siteIconCleared: false,
  users: [],
  reviews: [],
  orders: [],
  widgets: [],
  productPackages: {},
  offlineStockItems: {},
  selectedUserId: null,
  selectedReviewId: null,
  selectedOrderId: null,
  selectedWidgetId: null,
  categoryFilter: "all"
};

let adminSessionUser = null;
let packageDraftCounter = 0;
let iconRefreshQueued = false;
const packageLoadingProductIds = new Set();
const offlineStockLoadingProductIds = new Set();
const ADMIN_NOTICE_KEY = "olafshop_admin_notice";

const emptyPayload = {
  updatedAt: new Date().toISOString(),
  store: {
    name: "OLAF SHOP",
    siteIconUrl: "",
    promptPayId: "",
    paymentEndpoint: "",
    support: {
      line: "",
      facebook: "",
      hours: ""
    },
    payment: {
      promptPayId: "",
      serviceFee: 0,
      paymentEndpoint: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
      walletName: "",
      paymentNote: "",
      manualQrUrl: "",
      manualQrPath: "",
      trueMoneyQrUrl: "",
      trueMoneyQrPath: ""
    }
  },
  categories: [
    { id: "all", label: "ทั้งหมด" },
    { id: "steam-key", label: "คีย์ Steam" },
    { id: "steam-account", label: "ไอดียกเมล" },
    { id: "offline", label: "Steam Offline" },
    { id: "bundle", label: "แพ็กเกม" },
    { id: "minecraft-account", label: "Minecraft — Microsoft ID" },
    { id: "minecraft-key", label: "Minecraft — Key" },
    { id: "rockstar", label: "Rockstar / FiveM" }
  ],
  products: []
};

const widgetPresets = {
  "steam-showcase": {
    title: "Steam Showcase",
    code: '<div class="olaf-widget" data-olaf-widget="steam-showcase"></div>'
  },
  "trust-cards": {
    title: "Service Glass Cards",
    code: '<div class="olaf-widget" data-olaf-widget="trust-cards"></div>'
  },
  "social-strip": {
    title: "Social Community",
    code: '<div class="olaf-widget" data-olaf-widget="social-strip"></div>'
  },
  "license-cards": {
    title: "Windows License Cards",
    code: '<div class="olaf-widget" data-olaf-widget="license-cards"></div>'
  }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const formatPrice = (value) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

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

function revokePreviewUrl(url) {
  if (url && String(url).startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function isInlinePreviewUrl(url) {
  const value = String(url || "");
  return value.startsWith("blob:") || value.startsWith("data:");
}

function setPendingQrPreview(kind, file) {
  if (kind === "wallet") {
    revokePreviewUrl(state.pendingTrueMoneyQrPreviewUrl);
    state.pendingTrueMoneyQrFile = file || null;
    state.pendingTrueMoneyQrPreviewUrl = file ? URL.createObjectURL(file) : null;
    state.pendingTrueMoneyQrDataUrl = state.pendingTrueMoneyQrPreviewUrl || null;
    state.tmQrCleared = false;
    return state.pendingTrueMoneyQrPreviewUrl;
  }

  revokePreviewUrl(state.pendingQrPreviewUrl);
  state.pendingQrFile = file || null;
  state.pendingQrPreviewUrl = file ? URL.createObjectURL(file) : null;
  state.pendingQrDataUrl = state.pendingQrPreviewUrl || null;
  state.qrCleared = false;
  return state.pendingQrPreviewUrl;
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

function applyAdminBrandIcon(iconUrl) {
  const url = String(iconUrl || "").trim();
  document.querySelectorAll(".admin-brand-mark, .admin-brand span").forEach((mark) => {
    mark.innerHTML = url ? `<img ${fastImg(url, "OLAF SHOP", { priority: true })} />` : "O";
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compactLines(value) {
  const source = Array.isArray(value) ? value.join("\n") : value;
  return String(source || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueList(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeGallery(product) {
  return uniqueList([
    ...(Array.isArray(product.gallery) ? product.gallery : []),
    product.heroImage,
    product.image
  ]);
}

function normalizePlatformLinks(product) {
  const rows = Array.isArray(product.platformLinks) ? product.platformLinks : [];
  return rows
    .map((link) => {
      if (typeof link === "string") {
        const [label = "", url = "", icon = "external-link"] = link.split("|").map((part) => part.trim());
        return { label, url, icon: icon || "external-link" };
      }
      return {
        label: String(link?.label || "").trim(),
        url: String(link?.url || "").trim(),
        icon: String(link?.icon || "external-link").trim() || "external-link"
      };
    })
    .filter((link) => link.label && link.url);
}

function normalizeFeatureBlocks(product) {
  const rows = Array.isArray(product.featureBlocks) ? product.featureBlocks : [];
  return rows
    .map((feature) => {
      if (typeof feature === "string") {
        const [icon = "sparkles", title = "", text = ""] = feature.split("|").map((part) => part.trim());
        return { icon: icon || "sparkles", title, text };
      }
      return {
        icon: String(feature?.icon || "sparkles").trim() || "sparkles",
        title: String(feature?.title || "").trim(),
        text: String(feature?.text || "").trim()
      };
    })
    .filter((feature) => feature.title || feature.text);
}

function normalizeDetailSections(product) {
  const rows = Array.isArray(product.detailSections) ? product.detailSections : [];
  return rows
    .map((section) => {
      if (typeof section === "string") {
        const [title = "", ...bodyParts] = section.split("|").map((part) => part.trim());
        return { title, body: bodyParts.join(" | ") };
      }
      return {
        title: String(section?.title || "").trim(),
        body: String(section?.body || "").trim()
      };
    })
    .filter((section) => section.title || section.body);
}

function normalizeSystemRequirements(product) {
  const req = product.systemRequirements;
  if (Array.isArray(req)) {
    return { minimum: compactLines(req), recommended: [] };
  }
  return {
    minimum: compactLines(req?.minimum || []),
    recommended: compactLines(req?.recommended || [])
  };
}

function parsePipeRows(value, fields, defaults = {}) {
  return compactLines(value)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return fields.reduce(
        (item, field, index) => ({
          ...item,
          [field]:
            index === fields.length - 1
              ? parts.slice(index).join(" | ") || defaults[field] || ""
              : parts[index] || defaults[field] || ""
        }),
        {}
      );
    })
    .filter((item) => Object.values(item).some(Boolean));
}

function serializePipeRows(rows, fields) {
  return (rows || [])
    .map((row) => fields.map((field) => row?.[field] || "").join("|"))
    .filter((line) => line.replace(/\|/g, "").trim())
    .join("\n");
}

function normalizePayload(payload) {
  const source = payload && typeof payload === "object" ? payload : emptyPayload;
  const store = source.store ?? {};
  const payment = store.payment ?? {};
  return {
    updatedAt: source.updatedAt || new Date().toISOString(),
    store: {
      ...emptyPayload.store,
      ...store,
      support: {
        ...emptyPayload.store.support,
        ...(store.support ?? {})
      },
      payment: {
        ...emptyPayload.store.payment,
        promptPayId: payment.promptPayId ?? store.promptPayId ?? "",
        paymentEndpoint: payment.paymentEndpoint ?? store.paymentEndpoint ?? "",
        ...payment,
        serviceFee: Number(payment.serviceFee ?? store.serviceFee ?? 0) || 0
      }
    },
    categories: Array.isArray(source.categories) ? source.categories : clone(emptyPayload.categories),
    products: Array.isArray(source.products)
      ? source.products.map((product) => ({
          id: String(product.id || slugify(product.name || "product")),
          name: product.name || "Untitled Product",
          publisher: product.publisher || "",
          category: product.category || "steam-key",
          label: product.label || "",
          price: Number(product.price) || 0,
          compareAt: Number(product.compareAt) || 0,
          stock: Number(product.stock) || 0,
          sold: Number(product.sold) || 0,
          rating: product.rating || "",
          delivery: product.delivery || "",
          warranty: product.warranty || "",
          image: product.image || "",
          heroImage: product.heroImage || product.image || "",
          tags: Array.isArray(product.tags) ? product.tags : [],
          description: product.description || "",
          gallery: normalizeGallery(product),
          platformLinks: normalizePlatformLinks(product),
          featureBlocks: normalizeFeatureBlocks(product),
          detailSections: normalizeDetailSections(product),
          steamRelatedLinks: Array.isArray(product.steamRelatedLinks) ? product.steamRelatedLinks : [],
          systemRequirements: normalizeSystemRequirements(product),
          isActive: product.isActive !== false,
          sortOrder: Number(product.sortOrder || 0)
        }))
      : []
  };
}

function slugify(value) {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `product-${Date.now()}`;
}

function setStatus(message) {
  $("#save-state").textContent = message;
}

function currentAdmin() {
  return adminSessionUser;
}

function adminRelativePath() {
  const fileName = window.location.pathname.split("/").pop() || "olaf-control.html";
  return `${fileName}${window.location.search}${window.location.hash}`;
}

function redirectToAdminLogin() {
  const loginUrl = new URL("login.html", window.location.href);
  loginUrl.searchParams.set("return", adminRelativePath());
  window.location.replace(loginUrl.toString());
}

function redirectToStoreWithNotice(message) {
  try {
    window.sessionStorage.setItem(ADMIN_NOTICE_KEY, message);
  } catch (error) {
    console.warn("Unable to store admin redirect notice", error);
  }
  window.location.replace(new URL("index.html", window.location.href).toString());
}

function adminDeniedMessage(reason) {
  if (reason === "ROLE_LOAD_FAILED") return "ไม่สามารถตรวจสอบสิทธิ์แอดมินได้ กรุณาลองเข้าสู่ระบบใหม่";
  if (reason === "INVALID_SESSION") return "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่";
  return "บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน";
}

function showAdminShell() {
  $("#admin-login-screen").hidden = true;
  $("#admin-shell").hidden = false;
  document.body.dataset.adminPanel = "dashboard";
}

function showAdminLogin(message = "") {
  $("#admin-shell").hidden = true;
  $("#admin-login-screen").hidden = false;
  $("#admin-login-message").textContent = message;
}

function requireSupabaseAdminClient() {
  if (!window.olafSupabase) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase สำหรับระบบหลังบ้าน");
  }
  return window.olafSupabase;
}

async function checkAdminAccess(options = {}) {
  const client = requireSupabaseAdminClient();
  let access = null;

  if (window.OlafSupabaseAuth?.getAdminAccess) {
    access = await window.OlafSupabaseAuth.getAdminAccess();
  } else {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData?.user) {
      access = { isAdmin: false, reason: "NO_SESSION", authUser: null };
    } else {
      let profile = null;
      let profileError = null;
      try {
        const profileResult = await client
          .from("profiles")
          .select("role, status")
          .eq("id", userData.user.id)
          .maybeSingle();
        profile = profileResult.data || null;
        profileError = profileResult.error || null;
      } catch (error) {
        profileError = error;
      }

        const role = String(profile?.role || "").toLowerCase();
        const status = String(profile?.status || "active").toLowerCase();
        const isProfileAdmin = role === "admin" && status === "active";
        let rpcAllowsAdmin = false;
        let rpcError = null;
        try {
          const { data, error } = await client.rpc("is_admin");
          if (error) throw error;
          rpcAllowsAdmin = data === true;
        } catch (error) {
          rpcError = error;
        }

        const isAdmin = isProfileAdmin || rpcAllowsAdmin;
        access = {
          isAdmin,
          reason: isAdmin
            ? (rpcAllowsAdmin ? "ADMIN" : "ADMIN_PROFILE_FALLBACK")
            : (profileError || rpcError ? "ROLE_LOAD_FAILED" : "NOT_ADMIN"),
          authUser: userData.user,
          profile,
          role,
          status,
          error: profileError || rpcError
        };
    }
  }

  checkAdminAccess.lastAccess = access;

  if (access?.isAdmin) {
    adminSessionUser = access.authUser || access.user;
    return adminSessionUser;
  }

  adminSessionUser = null;
  if (options.redirect) {
    if (access?.reason === "NO_SESSION" || access?.reason === "INVALID_SESSION") {
      redirectToAdminLogin();
    } else {
      redirectToStoreWithNotice(adminDeniedMessage(access?.reason));
    }
  }
  return null;
}

function adminAuthErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.toLowerCase().includes("invalid login")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (message.includes("is_admin")) return "ยังไม่ได้ติดตั้งฟังก์ชัน is_admin ใน Supabase";
  return message || "เข้าสู่ระบบหลังบ้านไม่สำเร็จ";
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i data-lucide="loader-circle"></i> กำลังตรวจสิทธิ์';
  createIconSet();
  showAdminLogin("กำลังเข้าสู่ระบบและตรวจสิทธิ์แอดมิน...");

  try {
    const client = requireSupabaseAdminClient();
    const email = String(form.elements.email.value || "").trim().toLowerCase();
    const password = String(form.elements.password.value || "");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const admin = await checkAdminAccess();
    if (!admin) {
      await client.auth.signOut().catch(() => {});
      showAdminLogin("บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน");
      return;
    }

    showAdminShell();
    await loadData();
    showAdminToast("เข้าสู่ระบบหลังบ้านสำเร็จ", "success");
  } catch (error) {
    showAdminLogin(adminAuthErrorMessage(error));
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
    createIconSet();
  }
}

function savePayload(message = "บันทึกแล้ว") {
  state.payload.updatedAt = new Date().toISOString();
  setStatus(`${message} ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`);
}

async function fetchAdminProductsFromSupabase() {
  const { data, error } = await requireSupabaseAdminClient()
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(mapSupabaseProductRow).filter(Boolean);
}

async function fetchAdminUsersFromSupabase() {
  if (!window.OlafAdminUsers?.fetchAdminUsers) {
    throw new Error("Supabase admin user API is not ready");
  }
  return window.OlafAdminUsers.fetchAdminUsers();
}

function mapSupabaseProductRow(row) {
  const product = window.OlafProducts?.mapProductRow
    ? window.OlafProducts.mapProductRow(row)
    : {
        id: row.id,
        name: row.name,
        publisher: row.publisher || "",
        category: row.category || "steam-key",
        label: row.label || "",
        price: Number(row.price || 0),
        compareAt: row.compare_at == null ? null : Number(row.compare_at),
        stock: Number(row.stock || 0),
        sold: Number(row.sold || 0),
        rating: row.rating || "",
        delivery: row.delivery || "",
        warranty: row.warranty || "",
        image: row.image_url || "",
        heroImage: row.hero_image_url || row.image_url || "",
        tags: Array.isArray(row.tags) ? row.tags : [],
        description: row.description || "",
        gallery: Array.isArray(row.gallery) ? row.gallery : [],
        platformLinks: Array.isArray(row.platform_links) ? row.platform_links : [],
        featureBlocks: Array.isArray(row.feature_blocks) ? row.feature_blocks : [],
        detailSections: Array.isArray(row.detail_sections) ? row.detail_sections : [],
        steamRelatedLinks: Array.isArray(row.steam_related_links) ? row.steam_related_links : [],
        systemRequirements: row.system_requirements || { minimum: [], recommended: [] },
        isActive: row.is_active !== false,
        sortOrder: Number(row.sort_order || 0)
      };
  if (!product) return null;
  return {
    ...product,
    createdAt: row.created_at || product.createdAt || "",
    updatedAt: row.updated_at || product.updatedAt || ""
  };
}

function categoriesForAdminProducts(adminProducts) {
  const categories = [...emptyPayload.categories];
  const existing = new Set(categories.map((category) => category.id));
  adminProducts.forEach((product) => {
    if (product.category && !existing.has(product.category)) {
      existing.add(product.category);
      categories.push({ id: product.category, label: product.category });
    }
  });
  return categories;
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

async function saveOnlineStoreSettings(storeSettings) {
  if (!window.OlafStoreSettings?.saveStoreSettings) {
    throw new Error("Store settings client is not ready");
  }
  return window.OlafStoreSettings.saveStoreSettings(storeSettings);
}

async function loadData() {
  setStatus("กำลังโหลดข้อมูล");
  const adminProducts = await fetchAdminProductsFromSupabase();
  const adminUsers = await fetchAdminUsersFromSupabase().catch((error) => {
    console.warn("Admin users unavailable while loading admin data", {
      code: error?.code,
      message: error?.message
    });
    return [];
  });
  const storeSettings = await fetchOnlineStoreSettings(true);
  state.basePayload = normalizePayload(emptyPayload);
  state.payload = normalizePayload({
    ...state.basePayload,
    store: mergeStoreSettings(state.basePayload.store, storeSettings),
    categories: categoriesForAdminProducts(adminProducts),
    products: adminProducts
  });
  state.users = adminUsers;
  state.reviews = window.OlafStore?.getReviews() ?? [];
  state.widgets = window.OlafStore?.getWidgets() ?? [];
  state.orders = await window.OlafOrders.fetchAdminOrders().catch((error) => {
    console.warn("Admin orders unavailable while loading products", {
      code: error?.code,
      message: error?.message
    });
    return [];
  });
  const productNames = new Map(state.payload.products.map((product) => [product.id, product.name]));
  state.stockLog = (await window.OlafOrders.fetchStockMovements().catch(() => [])).map((movement) => ({
    id: movement.id,
    name: productNames.get(movement.productId) || movement.productId || "ไม่พบสินค้า",
    action: movement.note || movement.movementType || "ปรับสต็อก",
    delta: movement.quantityChange,
    previous: "",
    next: "",
    createdAt: movement.createdAt
  }));
  state.selectedProductId = state.payload.products[0]?.id ?? null;
  state.selectedUserId = state.users[0]?.id ?? null;
  state.selectedReviewId = state.reviews[0]?.id ?? null;
  state.selectedOrderId = state.orders[0]?.id ?? null;
  state.selectedWidgetId = state.widgets[0]?.id ?? null;
  revokePreviewUrl(state.pendingQrPreviewUrl);
  revokePreviewUrl(state.pendingTrueMoneyQrPreviewUrl);
  state.pendingQrDataUrl = null;
  state.pendingQrFile = null;
  state.pendingQrPreviewUrl = null;
  state.qrCleared = false;
  state.pendingTrueMoneyQrDataUrl = null;
  state.pendingTrueMoneyQrFile = null;
  state.pendingTrueMoneyQrPreviewUrl = null;
  state.tmQrCleared = false;
  state.pendingSiteIconDataUrl = null;
  state.siteIconCleared = false;
  renderAll();
  setStatus("เชื่อมต่อ Supabase หลังบ้านแล้ว");
}

function products() {
  return state.payload.products;
}

function selectedProduct() {
  return products().find((product) => product.id === state.selectedProductId) ?? null;
}

function packageCacheKey(productId) {
  return productId ? String(productId) : "__new__";
}

function getCachedProductPackages(productId) {
  return state.productPackages[packageCacheKey(productId)] ?? null;
}

function setCachedProductPackages(productId, packages) {
  state.productPackages[packageCacheKey(productId)] = Array.isArray(packages) ? packages : [];
}

function normalizeAdminPackage(pkg = {}, index = 0) {
  return {
    id: pkg.id || "",
    title: pkg.title || "",
    subtitle: pkg.subtitle || "",
    description: pkg.description || "",
    price: Number(pkg.price || 0),
    compareAt: pkg.compareAt == null ? null : Number(pkg.compareAt),
    stock: Number(pkg.stock || 0),
    sold: Number(pkg.sold || 0),
    status: pkg.status || "active",
    sortOrder: Number(pkg.sortOrder ?? index),
    badge: pkg.badge || "",
    metadata: pkg.metadata && typeof pkg.metadata === "object" ? pkg.metadata : {}
  };
}

async function loadProductPackages(productId, { force = false } = {}) {
  const key = packageCacheKey(productId);
  if (!productId) {
    if (!state.productPackages[key]) state.productPackages[key] = [];
    return state.productPackages[key];
  }
  if (!force && Array.isArray(state.productPackages[key])) return state.productPackages[key];
  if (!window.OlafProducts?.adminFetchProductPackages) {
    throw new Error("Product package client is not ready");
  }
  const packages = await window.OlafProducts.adminFetchProductPackages(productId);
  setCachedProductPackages(productId, packages.map(normalizeAdminPackage));
  return state.productPackages[key];
}

function productPackageDraft(productId) {
  const existing = getCachedProductPackages(productId) || [];
  return {
    id: `draft-${Date.now()}-${++packageDraftCounter}`,
    title: `Package ${existing.length + 1}`,
    subtitle: "",
    description: "",
    price: 0,
    compareAt: null,
    stock: 0,
    sold: 0,
    status: "active",
    sortOrder: existing.length,
    badge: "",
    metadata: {}
  };
}

function packageInputValue(value) {
  return value == null ? "" : escapeHtml(value);
}

function renderPackageEditorCard(pkg, index) {
  const value = normalizeAdminPackage(pkg, index);
  const isDraft = String(value.id || "").startsWith("draft-");
  return `
    <article class="package-editor-card" data-package-card data-package-id="${escapeHtml(value.id)}">
      <div class="package-card-head">
        <div>
          <span class="eyebrow">Package ${index + 1}</span>
          <strong>${escapeHtml(value.title || "แพ็คเกจใหม่")}</strong>
        </div>
        <button class="danger-button" type="button" data-package-delete>
          <i data-lucide="trash-2"></i>
          ลบ
        </button>
      </div>
      <div class="package-field-grid">
        <label>
          ชื่อแพ็ค
          <input data-package-field="title" type="text" value="${packageInputValue(value.title)}" placeholder="Deluxe Edition (1)" required />
        </label>
        <label>
          หัวข้อ/คำอธิบายสั้น
          <input data-package-field="subtitle" type="text" value="${packageInputValue(value.subtitle)}" placeholder="พร้อมเล่น / ได้ครบ" />
        </label>
        <label>
          ราคา
          <input data-package-field="price" type="number" min="0" step="1" value="${Number(value.price || 0)}" required />
        </label>
        <label>
          ราคาเต็ม
          <input data-package-field="compareAt" type="number" min="0" step="1" value="${value.compareAt == null ? "" : Number(value.compareAt)}" />
        </label>
        <label>
          สต็อก
          <input data-package-field="stock" type="number" min="0" step="1" value="${Number(value.stock || 0)}" required />
        </label>
        <label>
          ขายแล้ว
          <input data-package-field="sold" type="number" min="0" step="1" value="${Number(value.sold || 0)}" />
        </label>
        <label>
          สถานะ
          <select data-package-field="status">
            <option value="active" ${value.status === "active" ? "selected" : ""}>เปิดขาย</option>
            <option value="inactive" ${value.status === "inactive" ? "selected" : ""}>ปิดชั่วคราว</option>
            <option value="archived" ${value.status === "archived" ? "selected" : ""}>เก็บถาวร</option>
          </select>
        </label>
        <label>
          ลำดับ
          <input data-package-field="sortOrder" type="number" min="0" step="1" value="${Number(value.sortOrder || 0)}" />
        </label>
        <label>
          Badge
          <input data-package-field="badge" type="text" value="${packageInputValue(value.badge)}" placeholder="ขายดี" />
        </label>
      </div>
      <label class="package-description-field">
        รายละเอียดแพ็ค
        <textarea data-package-field="description" rows="3" placeholder="รายละเอียดที่จะแสดงในหน้าสินค้า">${escapeHtml(value.description || "")}</textarea>
      </label>
      <input data-package-field="id" type="hidden" value="${escapeHtml(isDraft ? "" : value.id)}" />
    </article>
  `;
}

function renderProductPackagesEditor(product) {
  const list = $("#product-package-list");
  const addButton = $("#add-product-package");
  if (!list || !addButton) return;

  const key = packageCacheKey(product?.id);
  const packages = getCachedProductPackages(product?.id);
  addButton.disabled = false;

  if (product?.id && packages === null) {
    addButton.disabled = true;
    list.innerHTML = `<div class="package-editor-empty">กำลังโหลดแพ็คเกจสินค้า...</div>`;
    if (!packageLoadingProductIds.has(key)) {
      packageLoadingProductIds.add(key);
      loadProductPackages(product.id)
        .then(() => {
          if (selectedProduct()?.id === product.id) {
            renderProductPackagesEditor(selectedProduct());
          }
        })
        .catch((error) => {
          console.warn("Product packages unavailable", error);
          list.innerHTML = `<div class="package-editor-empty">โหลดแพ็คเกจไม่สำเร็จ: ${escapeHtml(adminProductErrorMessage(error))}</div>`;
        })
        .finally(() => {
          packageLoadingProductIds.delete(key);
          createIconSet();
        });
    }
    return;
  }

  const nextPackages = Array.isArray(packages) ? packages : [];
  if (!nextPackages.length) {
    list.innerHTML = `<div class="package-editor-empty">ยังไม่มีแพ็คเกจ กดเพิ่มแพ็คเกจเพื่อเริ่มตั้งราคา/สต็อกแยก</div>`;
    return;
  }
  list.innerHTML = nextPackages.map(renderPackageEditorCard).join("");
}

function packageDraftsFromEditor() {
  return $$("#product-package-list [data-package-card]").map((card, index) => {
    const field = (name) => card.querySelector(`[data-package-field="${name}"]`);
    const compareAtText = field("compareAt")?.value?.trim() || "";
    return {
      id: field("id")?.value?.trim() || "",
      title: field("title")?.value?.trim() || "",
      subtitle: field("subtitle")?.value?.trim() || "",
      description: field("description")?.value?.trim() || "",
      price: Number(field("price")?.value || 0),
      compareAt: compareAtText === "" ? null : Number(compareAtText),
      stock: Number(field("stock")?.value || 0),
      sold: Number(field("sold")?.value || 0),
      status: field("status")?.value || "active",
      sortOrder: Number(field("sortOrder")?.value || index),
      badge: field("badge")?.value?.trim() || "",
      metadata: {}
    };
  });
}

function validateAdminPackages(packages) {
  packages.forEach((pkg, index) => {
    const label = pkg.title || `Package ${index + 1}`;
    if (!pkg.title.trim()) throw new Error("กรุณากรอกชื่อแพ็คเกจให้ครบ");
    validateNonNegativeNumber(pkg.price, `ราคา ${label}`);
    if (pkg.compareAt != null) validateNonNegativeNumber(pkg.compareAt, `ราคาเต็ม ${label}`);
    validateNonNegativeInteger(pkg.stock, `สต็อก ${label}`);
    validateNonNegativeInteger(pkg.sold, `ขายแล้ว ${label}`);
    validateNonNegativeInteger(pkg.sortOrder, `ลำดับ ${label}`);
    if (!["active", "inactive", "archived"].includes(pkg.status)) {
      throw new Error(`สถานะแพ็คเกจ ${label} ไม่ถูกต้อง`);
    }
  });
}

function syncPackageCacheFromEditor(productId) {
  setCachedProductPackages(productId, packageDraftsFromEditor().map(normalizeAdminPackage));
}

function addPackageDraftToEditor() {
  const product = selectedProduct();
  syncPackageCacheFromEditor(product?.id);
  const packages = getCachedProductPackages(product?.id) || [];
  packages.push(productPackageDraft(product?.id));
  setCachedProductPackages(product?.id, packages);
  renderProductPackagesEditor(product);
  createIconSet();
}

async function deletePackageFromEditor(button) {
  const card = button.closest("[data-package-card]");
  if (!card) return;
  const product = selectedProduct();
  const packageId = card.querySelector('[data-package-field="id"]')?.value?.trim() || "";

  if (packageId) {
    if (!(await adminConfirm("ลบแพ็คเกจนี้ใช่ไหม? ออเดอร์เก่าจะยังอ่านจาก snapshot เดิมได้"))) return;
    button.disabled = true;
    try {
      if (!window.OlafProducts?.adminDeleteProductPackage) {
        throw new Error("Product package client is not ready");
      }
      await window.OlafProducts.adminDeleteProductPackage(packageId);
      await loadProductPackages(product?.id, { force: true });
      renderProductPackagesEditor(product);
      showAdminToast("ลบแพ็คเกจแล้ว", "success");
    } catch (error) {
      const message = adminProductErrorMessage(error);
      showAdminToast(message, "error");
      button.disabled = false;
    } finally {
      createIconSet();
    }
    return;
  }

  card.remove();
  syncPackageCacheFromEditor(product?.id);
  renderProductPackagesEditor(product);
  createIconSet();
}

function isOfflineProductCategory(category) {
  return ["offline", "rockstar"].includes(String(category || "").trim().toLowerCase());
}

function managedStockCategoryLabel(category) {
  return String(category || "").trim().toLowerCase() === "rockstar"
    ? "Rockstar / FiveM"
    : "Steam Offline";
}

function offlineStockCacheKey(productId) {
  return productId || "__new__";
}

function normalizeOfflineStockItem(item = {}, index = 0) {
  return {
    id: item.id || `draft-offline-${index}`,
    productId: item.productId || item.product_id || "",
    content: item.content || "",
    status: item.status || "available",
    orderId: item.orderId || item.order_id || "",
    orderItemId: item.orderItemId || item.order_item_id || "",
    reservedBy: item.reservedBy || item.reserved_by || "",
    reservedAt: item.reservedAt || item.reserved_at || "",
    deliveredAt: item.deliveredAt || item.delivered_at || "",
    createdAt: item.createdAt || item.created_at || "",
    updatedAt: item.updatedAt || item.updated_at || ""
  };
}

function getCachedOfflineStockItems(productId) {
  const key = offlineStockCacheKey(productId);
  return Object.prototype.hasOwnProperty.call(state.offlineStockItems, key)
    ? state.offlineStockItems[key]
    : null;
}

function setCachedOfflineStockItems(productId, items) {
  state.offlineStockItems[offlineStockCacheKey(productId)] = (items || []).map(normalizeOfflineStockItem);
}

function offlineStockLinesFromEditor() {
  return compactLines($("#offline-stock-lines")?.value || "");
}

function offlineStatusCounts(items = []) {
  return items.reduce(
    (acc, item) => {
      const status = item.status || "available";
      if (status === "available") acc.available += 1;
      else if (status === "reserved") acc.reserved += 1;
      else if (status === "delivered") acc.delivered += 1;
      return acc;
    },
    { available: 0, reserved: 0, delivered: 0 }
  );
}

function renderOfflineStockMeta(items = [], availableOverride = null) {
  const counts = offlineStatusCounts(items);
  if (availableOverride != null) counts.available = Number(availableOverride) || 0;
  const countEl = $("#offline-stock-count");
  const metaEl = $("#offline-stock-meta");
  if (countEl) countEl.textContent = `${counts.available.toLocaleString("th-TH")} ชิ้นพร้อมขาย`;
  if (metaEl) {
    metaEl.innerHTML = `
      <span>พร้อมขาย ${counts.available.toLocaleString("th-TH")}</span>
      <span>ถูกจอง ${counts.reserved.toLocaleString("th-TH")}</span>
      <span>ส่งแล้ว ${counts.delivered.toLocaleString("th-TH")}</span>
    `;
  }
}

async function loadOfflineStockItems(productId, { force = false } = {}) {
  const key = offlineStockCacheKey(productId);
  if (!productId) {
    if (!state.offlineStockItems[key]) state.offlineStockItems[key] = [];
    return state.offlineStockItems[key];
  }
  if (!force && Array.isArray(state.offlineStockItems[key])) return state.offlineStockItems[key];
  if (!window.OlafProducts?.adminFetchOfflineStockItems) {
    throw new Error("Offline stock client is not ready");
  }
  const items = await window.OlafProducts.adminFetchOfflineStockItems(productId);
  setCachedOfflineStockItems(productId, items);
  return state.offlineStockItems[key];
}

function renderOfflineStockEditor(product) {
  const section = $("#offline-stock-editor");
  const textarea = $("#offline-stock-lines");
  const form = $("#product-form");
  if (!section || !textarea || !form) return;

  const category = form.elements.category?.value || product?.category || "";
  const isOffline = isOfflineProductCategory(category);
  const stockCategoryLabel = managedStockCategoryLabel(category);
  section.hidden = !isOffline;
  form.elements.stock.readOnly = isOffline;
  form.elements.stock.title = isOffline ? `สต็อกหมวด ${stockCategoryLabel} จะนับจากรายการที่พร้อมขายด้านล่าง` : "";

  const heading = section.querySelector(".offline-stock-head h3");
  const help = section.querySelector(".offline-stock-head p");
  const fieldLabel = textarea.closest("label");
  if (heading) heading.textContent = `สต็อก ${stockCategoryLabel}`;
  if (help) {
    help.textContent = "ใส่ข้อมูลสินค้า 1 บรรทัดต่อ 1 ชิ้น ระบบจะจองรายการตอนลูกค้าสั่งซื้อ และส่งให้ลูกค้าเมื่อแอดมินกดจัดส่งเท่านั้น";
  }
  if (fieldLabel?.firstChild) fieldLabel.firstChild.textContent = "รายการที่พร้อมขาย\n";

  if (!isOffline) return;

  const key = offlineStockCacheKey(product?.id);
  const cached = getCachedOfflineStockItems(product?.id);

  if (product?.id && cached === null) {
    textarea.value = "";
    textarea.placeholder = `กำลังโหลดสต็อก ${stockCategoryLabel}...`;
    textarea.disabled = true;
    renderOfflineStockMeta([], Number(product.stock || 0));
    if (!offlineStockLoadingProductIds.has(key)) {
      offlineStockLoadingProductIds.add(key);
      loadOfflineStockItems(product.id)
        .then((items) => {
          if (selectedProduct()?.id === product.id) {
            textarea.disabled = false;
            textarea.placeholder = category === "rockstar"
              ? "rockstar-email | password | email access | note"
              : "email@example.com | password | note";
            textarea.value = items
              .filter((item) => item.status === "available")
              .map((item) => item.content)
              .join("\n");
            form.elements.stock.value = offlineStockLinesFromEditor().length;
            renderOfflineStockMeta(items, offlineStockLinesFromEditor().length);
          }
        })
        .catch((error) => {
          console.warn("Offline stock unavailable", error);
          textarea.disabled = true;
          textarea.placeholder = adminProductErrorMessage(error);
          renderOfflineStockMeta([], Number(product.stock || 0));
        })
        .finally(() => {
          offlineStockLoadingProductIds.delete(key);
        });
    }
    return;
  }

  const items = Array.isArray(cached) ? cached : [];
  textarea.disabled = false;
  textarea.placeholder = category === "rockstar"
    ? "rockstar-email | password | email access | note"
    : "email@example.com | password | note";
  textarea.value = items
    .filter((item) => item.status === "available")
    .map((item) => item.content)
    .join("\n");
  const availableLineCount = offlineStockLinesFromEditor().length;
  form.elements.stock.value = availableLineCount;
  renderOfflineStockMeta(items, availableLineCount);
}

function syncOfflineStockCacheFromEditor(productId) {
  const existing = getCachedOfflineStockItems(productId) || [];
  const lockedItems = existing.filter((item) => item.status !== "available");
  const availableItems = offlineStockLinesFromEditor().map((content, index) =>
    normalizeOfflineStockItem({
      id: `draft-offline-${index}`,
      productId,
      content,
      status: "available"
    })
  );
  setCachedOfflineStockItems(productId, [...availableItems, ...lockedItems]);
}

function validateOfflineStockLines(lines) {
  lines.forEach((line, index) => {
    if (line.length > 2000) {
      throw new Error(`ข้อมูลสต็อกบรรทัดที่ ${index + 1} ยาวเกินไป`);
    }
  });
}

function selectedUser() {
  return state.users.find((user) => user.id === state.selectedUserId) ?? null;
}

function selectedReview() {
  return state.reviews.find((review) => review.id === state.selectedReviewId) ?? null;
}

function selectedOrder() {
  return state.orders.find((order) => order.id === state.selectedOrderId) ?? null;
}

function selectedWidget() {
  return state.widgets.find((widget) => widget.id === state.selectedWidgetId) ?? null;
}

function categoryOptions(selectedId) {
  return state.payload.categories
    .filter((category) => category.id !== "all")
    .map(
      (category) =>
        `<option value="${escapeHtml(category.id)}" ${category.id === selectedId ? "selected" : ""}>${escapeHtml(
          category.label
        )}</option>`
    )
    .join("");
}

function categoryLabel(categoryId) {
  return state.payload.categories.find((category) => category.id === categoryId)?.label ?? categoryId;
}

function stockStatus(stock) {
  if (stock <= 0) return { className: "danger", label: "หมด" };
  if (stock <= 5) return { className: "warn", label: `เหลือ ${stock}` };
  return { className: "ok", label: `พร้อม ${stock}` };
}

function renderAll() {
  state.reviews = window.OlafStore?.getReviews() ?? [];
  state.widgets = window.OlafStore?.getWidgets() ?? [];
  applySiteIcon(state.payload.store.siteIconUrl);
  applyAdminBrandIcon(state.payload.store.siteIconUrl);
  renderMetrics();
  renderAnalyticsCharts();
  renderProductsTable();
  renderProductForm();
  renderUsersTable();
  renderUserForm();
  renderOrdersTable();
  renderOrderForm();
  renderReviewsTable();
  renderReviewForm();
  renderWidgetsTable();
  renderWidgetForm();
  renderStockBoard();
  renderPaymentForm();
  renderDataPreview();
  createIconSet();
  renderCategoryTabs("admin-category-tabs");
  renderCategoryTabs("stock-category-tabs");
}

function renderMetrics() {
  const totalStock = products().reduce((sum, product) => sum + product.stock, 0);
  const totalSold = products().reduce((sum, product) => sum + product.sold, 0);
  const lowStock = products().filter((product) => product.stock <= 5).length;

  $("#metric-products").textContent = products().length.toLocaleString("th-TH");
  $("#metric-stock").textContent = totalStock.toLocaleString("th-TH");
  $("#metric-low-stock").textContent = lowStock.toLocaleString("th-TH");
  $("#metric-sold").textContent = totalSold.toLocaleString("th-TH");

  const alerts = products()
    .filter((product) => product.stock <= 5)
    .sort((a, b) => a.stock - b.stock);
  $("#stock-alert-count").textContent = `${alerts.length.toLocaleString("th-TH")} รายการ`;
  $("#stock-alert-list").innerHTML = alerts.length
    ? alerts.map(renderCompactStockItem).join("")
    : `<div class="compact-item"><div><h3>สต็อกปกติ</h3><p>ยังไม่มีสินค้าใกล้หมด</p></div></div>`;

  $("#stock-log-list").innerHTML = state.stockLog.length
    ? state.stockLog
        .slice(0, 8)
        .map(
          (log) => `
            <div class="compact-item">
              <div>
                <h3>${escapeHtml(log.name)}</h3>
                <p>${escapeHtml(log.action)} · ${new Date(log.createdAt).toLocaleString("th-TH")}</p>
              </div>
              <span class="status-pill ${log.delta >= 0 ? "ok" : "danger"}">${log.delta >= 0 ? "+" : ""}${log.delta}</span>
            </div>
          `
        )
        .join("")
    : `<div class="compact-item"><div><h3>ยังไม่มีประวัติ</h3><p>การเพิ่มหรือลดสต็อกจะแสดงที่นี่</p></div></div>`;
}

function chartRgba(hex, alpha) {
  const value = String(hex || "").replace("#", "");
  if (value.length !== 6) return `rgba(90, 167, 255, ${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function prepareChartCanvas(canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(300, Math.round(rect.width || canvas.clientWidth || canvas.width || 560));
  const height = Math.max(220, Math.round(rect.height || canvas.clientHeight || canvas.height || 260));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function chartLabel(ctx, text, maxWidth) {
  const raw = String(text || "");
  if (ctx.measureText(raw).width <= maxWidth) return raw;
  let label = raw;
  while (label.length > 2 && ctx.measureText(`${label}…`).width > maxWidth) {
    label = label.slice(0, -1);
  }
  return `${label}…`;
}

function drawChartGrid(ctx, width, height, padding) {
  const rows = 4;
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.13)";
  ctx.lineWidth = 1;
  for (let index = 0; index <= rows; index += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / rows) * index;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEmptyChart(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(248, 250, 252, 0.72)";
  ctx.font = "600 14px Kanit, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ยังไม่มีข้อมูลสำหรับกราฟ", width / 2, height / 2);
  ctx.restore();
}

function drawBarChart(canvas, labels, values, color = "#5aa7ff") {
  const chart = prepareChartCanvas(canvas);
  if (!chart) return;
  const { ctx, width, height } = chart;
  const normalizedValues = (values || []).map((value) => Math.max(0, Number(value) || 0));
  if (!normalizedValues.length) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const padding = { top: 30, right: 18, bottom: 48, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...normalizedValues, 1);
  const gap = Math.max(10, Math.min(18, chartWidth / Math.max(normalizedValues.length * 4, 1)));
  const barWidth = Math.max(16, (chartWidth - gap * (normalizedValues.length - 1)) / normalizedValues.length);

  drawChartGrid(ctx, width, height, padding);
  ctx.textAlign = "center";
  ctx.font = "500 11px Kanit, Segoe UI, sans-serif";

  normalizedValues.forEach((value, index) => {
    const barHeight = value > 0 ? Math.max(6, (value / max) * chartHeight) : 3;
    const x = padding.left + index * (barWidth + gap);
    const y = padding.top + chartHeight - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, padding.top + chartHeight);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, chartRgba(color, 0.22));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, barWidth, barHeight, Math.min(12, barWidth / 2));
    else ctx.rect(x, y, barWidth, barHeight);
    ctx.fill();

    ctx.fillStyle = "rgba(248, 250, 252, 0.86)";
    ctx.font = "600 11px Kanit, Segoe UI, sans-serif";
    ctx.fillText(value.toLocaleString("th-TH"), x + barWidth / 2, Math.max(16, y - 8));
    ctx.fillStyle = "rgba(182, 194, 211, 0.82)";
    ctx.font = "500 11px Kanit, Segoe UI, sans-serif";
    ctx.fillText(chartLabel(ctx, labels[index], barWidth + 18), x + barWidth / 2, height - 18);
  });
}

function drawLineChart(canvas, labels, values, color = "#34d399") {
  const chart = prepareChartCanvas(canvas);
  if (!chart) return;
  const { ctx, width, height } = chart;
  const normalizedValues = (values || []).map((value) => Math.max(0, Number(value) || 0));
  if (!normalizedValues.length) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const padding = { top: 30, right: 24, bottom: 48, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...normalizedValues, 1);
  const points = normalizedValues.map((value, index) => {
    const x =
      normalizedValues.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (chartWidth / (normalizedValues.length - 1)) * index;
    const y = padding.top + chartHeight - (value / max) * chartHeight;
    return { x, y, value };
  });

  drawChartGrid(ctx, width, height, padding);
  const area = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
  area.addColorStop(0, chartRgba(color, 0.24));
  area.addColorStop(1, chartRgba(color, 0.02));

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
  ctx.lineTo(points[0].x, padding.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = area;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.textAlign = "center";
  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#060811";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = "rgba(182, 194, 211, 0.82)";
    ctx.font = "500 11px Kanit, Segoe UI, sans-serif";
    ctx.fillText(chartLabel(ctx, labels[index], 74), point.x, height - 18);
  });
}

function renderAnalyticsCharts() {
  const latestOrders = [...state.orders].slice(0, 7).reverse();
  drawLineChart(
    $("#revenue-chart"),
    latestOrders.map((order) => new Date(order.createdAt).toLocaleDateString("th-TH", {day:"numeric", month:"short"})),
    latestOrders.map((order) => Number(order.total) || 0),
    "#10b981"
  );
  const stockByCategory = state.payload.categories
    .filter((category) => category.id !== "all")
    .map((category) => ({
      label: category.label,
      value: state.payload.products
        .filter((product) => product.category === category.id)
        .reduce((sum, product) => sum + product.stock, 0)
    }));
  drawBarChart(
    $("#stock-chart"),
    stockByCategory.map((item) => item.label.slice(0, 8)),
    stockByCategory.map((item) => item.value),
    "#7aa2ff"
  );
}

function renderCompactStockItem(product) {
  const status = stockStatus(product.stock);
  return `
    <div class="compact-item">
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(categoryLabel(product.category))}</p>
      </div>
      <button class="mini-button" type="button" data-edit-product="${escapeHtml(product.id)}">
        <i data-lucide="pencil"></i>
        แก้ไข
      </button>
      <span class="status-pill ${status.className}">${status.label}</span>
    </div>
  `;
}

function filteredProducts() {
  let result = products();
  if (state.categoryFilter !== "all") {
    result = result.filter(p => p.category === state.categoryFilter);
  }
  const query = state.search.trim().toLowerCase();
  if (!query) return result;
  return result.filter((product) =>
    [product.name, product.publisher, product.category, product.label, ...(product.tags ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function renderCategoryTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const categories = [{ id: "all", label: "ทั้งหมด" }, ...(state.payload.categories || [])];
  
  container.innerHTML = categories.map(cat => `
    <button type="button" class="category-tab ${state.categoryFilter === cat.id ? "is-active" : ""}" data-category-filter="${escapeHtml(cat.id)}">
      ${escapeHtml(cat.label)}
    </button>
  `).join("");
}

function renderProductsTable() {
  $("#products-table").innerHTML = filteredProducts()
    .map((product, index) => {
      const status = stockStatus(product.stock);
      const isOffline = isOfflineProductCategory(product.category);
      const stockCategoryLabel = managedStockCategoryLabel(product.category);
      return `
        <tr>
          <td><span style="color: var(--muted); font-weight: 500;">${index + 1}</span></td>
          <td>
            <div class="product-cell">
              <img ${fastImg(product.image || product.heroImage, product.name)} />
              <div>
                <strong>${escapeHtml(product.name)}</strong>
                <span>${escapeHtml(product.publisher || product.id)}</span>
              </div>
            </div>
          </td>
          <td>${escapeHtml(categoryLabel(product.category))}</td>
          <td>${formatPrice(product.price)}</td>
          <td><span class="status-pill ${status.className}">${status.label}</span></td>
          <td>
            <div class="row-actions">
              ${
                isOffline
                  ? `<button class="mini-button" type="button" data-manage-offline-stock="${escapeHtml(product.id)}"><i data-lucide="list-plus"></i> รายการ</button>`
                  : `<button class="mini-button" type="button" data-stock-adjust="${escapeHtml(product.id)}" data-delta="1">+1</button>`
              }
              <button class="mini-button" type="button" data-edit-product="${escapeHtml(product.id)}">
                <i data-lucide="pencil"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderProductForm() {
  $("#category-select").innerHTML = categoryOptions(selectedProduct()?.category);
  fillProductForm(selectedProduct());
}

function renderStockViews({ refreshProductForm = false } = {}) {
  renderMetrics();
  renderAnalyticsCharts();
  renderProductsTable();
  renderStockBoard();
  renderCategoryTabs("admin-category-tabs");
  renderCategoryTabs("stock-category-tabs");
  if (refreshProductForm) renderProductForm();
  createIconSet();
}

function openOfflineStockManager(productId) {
  const product = products().find((item) => item.id === productId);
  state.selectedProductId = productId;
  switchPanel("products");
  renderProductForm();
  createIconSet();
  requestAnimationFrame(() => {
    const editor = $("#offline-stock-editor");
    if (editor && !editor.hidden) editor.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  setStatus(`เปิดช่องจัดการสต็อก ${managedStockCategoryLabel(product?.category)} แล้ว`);
}

function fillProductForm(product) {
  const form = $("#product-form");
  const isNew = !product;
  $("#product-form-title").textContent = isNew ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า";
  $("#editing-product-id").textContent = isNew ? "สินค้าใหม่" : product.id;
  $("#delete-product").disabled = isNew;

  const value = product ?? {
    id: "",
    name: "",
    publisher: "",
    category: state.categoryFilter !== "all" ? state.categoryFilter : "steam-key",
    label: "",
    price: 0,
    compareAt: 0,
    stock: 0,
    sold: 0,
    rating: "",
    delivery: "",
    warranty: "",
    image: "",
    heroImage: "",
    tags: [],
    description: "",
    gallery: [],
    platformLinks: [],
    featureBlocks: [],
    detailSections: [],
    steamRelatedLinks: [],
    featureBlocks: [],
    detailSections: [],
    systemRequirements: { minimum: [], recommended: [] },
    isActive: true,
    sortOrder: products().length
  };

  form.elements.id.value = value.id;
  form.elements.name.value = value.name;
  form.elements.publisher.value = value.publisher;
  form.elements.category.value = value.category;
  form.elements.label.value = value.label;
  form.elements.price.value = value.price;
  form.elements.compareAt.value = value.compareAt;
  form.elements.stock.value = value.stock;
  form.elements.sold.value = value.sold;
  form.elements.rating.value = value.rating;
  form.elements.isActive.value = String(value.isActive !== false);
  form.elements.sortOrder.value = Number(value.sortOrder || 0);
  form.elements.delivery.value = value.delivery;
  form.elements.warranty.value = value.warranty;
  form.elements.image.value = value.image;
  form.elements.heroImage.value = value.heroImage;
  form.elements.gallery.value = (value.gallery ?? []).join("\n");
  form.elements.platformLinks.value = serializePipeRows(value.platformLinks, ["label", "url", "icon"]);
  form.elements.featureBlocks.value = serializePipeRows(value.featureBlocks, ["icon", "title", "text"]);
  form.elements.detailSections.value = serializePipeRows(value.detailSections, ["title", "body"]);
  form.elements.steamRelatedLinks.value = (value.steamRelatedLinks ?? []).join("\n");
  const sysReq = value.systemRequirements;
  const isLegacy = Array.isArray(sysReq);
  form.elements.systemRequirementsMinimum.value = (isLegacy ? sysReq : (sysReq?.minimum ?? [])).join("\n");
  form.elements.systemRequirementsRecommended.value = (isLegacy ? [] : (sysReq?.recommended ?? [])).join("\n");
  form.elements.tags.value = (value.tags ?? []).join(", ");
  form.elements.description.value = value.description;
  renderProductPackagesEditor(product);
  renderOfflineStockEditor(value);
}

function isAcceptableImageUrl(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/\s/.test(text)) return false;
  if (text.startsWith("data:image/")) return true;
  if (text.startsWith("/") || text.startsWith("./") || text.startsWith("../")) return true;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function isSteamStoreAppUrl(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return /(^|\.)steampowered\.com$/i.test(parsed.hostname) && /\/app\/\d+/i.test(parsed.pathname);
  } catch (error) {
    return false;
  }
}

function validateNonNegativeNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป`);
  }
}

function validateNonNegativeInteger(value, label) {
  validateNonNegativeNumber(value, label);
  if (!Number.isInteger(value)) {
    throw new Error(`${label} ต้องเป็นจำนวนเต็ม`);
  }
}

function validateAdminProduct(product, { isNew, selectedProductId }) {
  if (!product.name.trim()) throw new Error("กรุณากรอกชื่อสินค้า");
  if (!product.id.trim()) throw new Error("กรุณากรอก Product ID");
  if (!isNew && !selectedProductId) throw new Error("ไม่พบ Product ID ของสินค้าที่กำลังแก้ไข");
  if (!isNew && product.id !== selectedProductId) {
    throw new Error("ไม่สามารถเปลี่ยน Product ID ของสินค้าที่มีอยู่แล้ว");
  }
  validateNonNegativeNumber(product.price, "ราคาขาย");
  if (product.compareAt != null) validateNonNegativeNumber(product.compareAt, "ราคาเต็ม");
  validateNonNegativeInteger(product.stock, "สต็อก");
  validateNonNegativeInteger(product.sold, "ขายแล้ว");
  validateNonNegativeInteger(product.sortOrder, "ลำดับแสดงผล");
  if (!isAcceptableImageUrl(product.image)) throw new Error("URL รูปสินค้าไม่ถูกต้อง");
  if (!isAcceptableImageUrl(product.heroImage)) throw new Error("URL รูป Hero ไม่ถูกต้อง");
  if ((product.gallery || []).some((url) => !isAcceptableImageUrl(url))) {
    throw new Error("URL ในแกลเลอรีรูปสินค้าไม่ถูกต้อง");
  }
  if ((product.steamRelatedLinks || []).some((url) => !isSteamStoreAppUrl(url))) {
    throw new Error("ลิงก์เนื้อหาเกม / DLC ต้องเป็นลิงก์ Steam รูปแบบ store.steampowered.com/app/...");
  }
}

function productToSupabaseRow(product, { includeId = false, includeStock = false } = {}) {
  const row = {
    name: product.name.trim(),
    publisher: product.publisher || null,
    category: product.category || "steam-key",
    label: product.label || null,
    price: Number(product.price || 0),
    compare_at: product.compareAt == null ? null : Number(product.compareAt),
    sold: Number(product.sold || 0),
    rating: product.rating || null,
    delivery: product.delivery || null,
    warranty: product.warranty || null,
    image_url: product.image || null,
    hero_image_url: product.heroImage || product.image || null,
    tags: Array.isArray(product.tags) ? product.tags : [],
    description: product.description || null,
    gallery: Array.isArray(product.gallery) ? product.gallery : [],
    platform_links: Array.isArray(product.platformLinks) ? product.platformLinks : [],
    feature_blocks: Array.isArray(product.featureBlocks) ? product.featureBlocks : [],
    detail_sections: Array.isArray(product.detailSections) ? product.detailSections : [],
    steam_related_links: Array.isArray(product.steamRelatedLinks) ? product.steamRelatedLinks : [],
    system_requirements: product.systemRequirements || { minimum: [], recommended: [] },
    is_active: product.isActive !== false,
    sort_order: Number(product.sortOrder || 0)
  };
  if (includeId) row.id = product.id.trim();
  if (includeStock) row.stock = Number(product.stock || 0);
  return row;
}

function replaceProductInState(product) {
  const index = products().findIndex((item) => item.id === product.id);
  if (index >= 0) {
    state.payload.products[index] = product;
  } else {
    state.payload.products.unshift(product);
  }
  state.payload.categories = categoriesForAdminProducts(state.payload.products);
  state.payload.updatedAt = product.updatedAt || new Date().toISOString();
}

function adminProductErrorMessage(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  if (code === "23505" || message.toLowerCase().includes("duplicate")) return "Product ID นี้ถูกใช้แล้ว";
  if (
    message.includes("product_packages") ||
    message.includes("admin_save_product_package") ||
    message.includes("admin_delete_product_package")
  ) {
    return "ยังไม่ได้รัน supabase-product-packages.sql หรือสิทธิ์ package ยังไม่พร้อม";
  }
  if (
    message.includes("offline_stock_items") ||
    message.includes("admin_fetch_offline_stock_items") ||
    message.includes("admin_replace_offline_stock_items") ||
    message.includes("Offline stock client")
  ) {
    return "ยังไม่ได้รัน supabase-offline-stock-items.sql เวอร์ชันล่าสุด หรือสิทธิ์สต็อกรายชิ้นยังไม่พร้อม";
  }
  if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("rls")) {
    return "บัญชีนี้ไม่มีสิทธิ์แก้ไขสินค้า";
  }
  return message || "บันทึกสินค้าไม่สำเร็จ";
}

function adminStockErrorMessage(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  const lower = message.toLowerCase();
  if (
    code === "PGRST202" ||
    code === "42883" ||
    message.includes("admin_set_product_stock") ||
    lower.includes("schema cache")
  ) {
    return "ยังไม่ได้รัน supabase-orders-admin.sql หรือ RPC admin_set_product_stock ยังไม่พร้อม";
  }
  if (message.includes("ADMIN_REQUIRED")) return "บัญชีนี้ไม่มีสิทธิ์แอดมินสำหรับแก้สต็อก";
  if (message.includes("OFFLINE_STOCK_REQUIRES_ITEMS")) {
    return "สินค้าหมวดนี้ต้องจัดการสต็อกแบบ 1 บรรทัดต่อ 1 ชิ้นในฟอร์มสินค้า";
  }
  if (message.includes("PRODUCT_NOT_FOUND")) return "ไม่พบสินค้านี้ในฐานข้อมูล";
  if (message.includes("INVALID_STOCK")) return "จำนวนสต็อกไม่ถูกต้อง";
  if (lower.includes("permission") || lower.includes("rls")) {
    return "บัญชีนี้ไม่มีสิทธิ์แก้ไขสต็อกสินค้าใน Supabase";
  }
  return message || "อัปเดตสต็อกไม่สำเร็จ";
}

function adminUserErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("PASSWORD_MANAGED_IN_SUPABASE_AUTH")) {
    return "รหัสผ่านของ Auth user ต้องเปลี่ยนใน Supabase Dashboard > Authentication > Users";
  }
  if (message.includes("AUTH_USER_NOT_FOUND")) {
    return "ไม่พบ Auth user อีเมลนี้ ให้สมัครสมาชิกหรือสร้าง user ใน Supabase Authentication ก่อน";
  }
  if (message.includes("ADMIN_REQUIRED")) return "บัญชีนี้ไม่มีสิทธิ์จัดการ user";
  if (message.includes("admin_list_profiles") || message.includes("admin_save_profile")) {
    return "ยังไม่ได้รัน supabase-admin-users.sql ใน Supabase";
  }
  if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("rls")) {
    return "บัญชีนี้ไม่มีสิทธิ์แก้ไข user ใน Supabase";
  }
  return message || "บันทึก user ไม่สำเร็จ";
}

function productFromForm(form) {
  const name = form.elements.name.value.trim();
  const id = form.elements.id.value.trim() || slugify(name);
  const image = form.elements.image.value.trim();
  const heroImage = form.elements.heroImage.value.trim() || image;
  const gallery = uniqueList(compactLines(form.elements.gallery.value));
  const compareAtValue = form.elements.compareAt.value.trim();
  
  const category = form.elements.category.value;
  const stock = isOfflineProductCategory(category)
    ? offlineStockLinesFromEditor().length
    : Number(form.elements.stock.value) || 0;

  return {
    id,
    name,
    publisher: form.elements.publisher.value.trim(),
    category,
    label: form.elements.label.value.trim(),
    price: Number(form.elements.price.value) || 0,
    compareAt: compareAtValue === "" ? null : Number(compareAtValue),
    stock,
    sold: Number(form.elements.sold.value) || 0,
    rating: form.elements.rating.value.trim(),
    isActive: form.elements.isActive.value !== "false",
    sortOrder: Number(form.elements.sortOrder.value) || 0,
    delivery: form.elements.delivery.value.trim(),
    warranty: form.elements.warranty.value.trim(),
    image,
    heroImage,
    gallery,
    platformLinks: parsePipeRows(form.elements.platformLinks.value, ["label", "url", "icon"], {
      icon: "external-link"
    }).filter((link) => link.label && link.url),
    featureBlocks: parsePipeRows(form.elements.featureBlocks.value, ["icon", "title", "text"], {
      icon: "sparkles"
    }).filter((feature) => feature.title || feature.text),
    detailSections: parsePipeRows(form.elements.detailSections.value, ["title", "body"]).filter(
      (section) => section.title || section.body
    ),
    steamRelatedLinks: uniqueList(compactLines(form.elements.steamRelatedLinks.value)),
    systemRequirements: {
      minimum: compactLines(form.elements.systemRequirementsMinimum.value),
      recommended: compactLines(form.elements.systemRequirementsRecommended.value)
    },
    tags: form.elements.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    description: form.elements.description.value.trim()
  };
}

async function saveProductFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const product = productFromForm(event.currentTarget);
  const packageDrafts = packageDraftsFromEditor();
  const isOfflineProduct = isOfflineProductCategory(product.category);
  const offlineStockLines = isOfflineProduct ? offlineStockLinesFromEditor() : [];
  const isNew = !state.selectedProductId;
  const previous = isNew ? null : selectedProduct();

  const submitButton = form.querySelector("button[type='submit']");
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i data-lucide="loader-circle"></i> กำลังบันทึก';
  createIconSet();

  try {
    validateAdminProduct(product, { isNew, selectedProductId: state.selectedProductId });
    validateAdminPackages(packageDrafts);
    if (isOfflineProduct) validateOfflineStockLines(offlineStockLines);
    if (isNew && products().some((item) => item.id === product.id)) {
      throw new Error("Product ID นี้ถูกใช้แล้ว");
    }

    const client = requireSupabaseAdminClient();
    const requestedStock = isOfflineProduct ? offlineStockLines.length : Number(product.stock || 0);
    let savedProduct;

    if (isNew) {
      const insertRow = {
        ...productToSupabaseRow(product, { includeId: true }),
        stock: 0
      };
      const { data, error } = await client
        .from("products")
        .insert([insertRow])
        .select("*")
        .single();
      if (error) throw error;
      savedProduct = mapSupabaseProductRow(data);
    } else {
      const { data, error } = await client
        .from("products")
        .update(productToSupabaseRow(product))
        .eq("id", state.selectedProductId)
        .select("*")
        .single();
      if (error) throw error;
      savedProduct = mapSupabaseProductRow(data);
    }

    if (!isOfflineProduct && Number(savedProduct.stock || 0) !== requestedStock) {
      const adjustedProduct = await window.OlafProducts.setAdminProductStock({
        productId: savedProduct.id,
        stock: requestedStock,
        note: previous ? "แก้ยอดคงเหลือจากฟอร์มสินค้า" : "ตั้งค่าสต็อกสินค้าใหม่"
      });
      savedProduct = adjustedProduct || savedProduct;
    }

    if (isOfflineProduct) {
      if (!window.OlafProducts?.adminReplaceOfflineStockItems) {
        throw new Error("Offline stock client is not ready");
      }
      const offlineResult = await window.OlafProducts.adminReplaceOfflineStockItems(savedProduct.id, offlineStockLines);
      if (offlineResult.product) savedProduct = offlineResult.product;
      setCachedOfflineStockItems(savedProduct.id, offlineResult.items || []);
      delete state.offlineStockItems.__new__;
    }

    if (packageDrafts.length) {
      if (!window.OlafProducts?.adminSaveProductPackages) {
        throw new Error("Product package client is not ready");
      }
      const savedPackages = await window.OlafProducts.adminSaveProductPackages(savedProduct.id, packageDrafts);
      setCachedProductPackages(savedProduct.id, savedPackages.map(normalizeAdminPackage));
      delete state.productPackages.__new__;
    } else {
      setCachedProductPackages(savedProduct.id, []);
      delete state.productPackages.__new__;
    }

    replaceProductInState(savedProduct);
    state.selectedProductId = savedProduct.id;
    renderAll();
    const updatedAt = savedProduct.updatedAt
      ? new Date(savedProduct.updatedAt).toLocaleString("th-TH")
      : new Date().toLocaleString("th-TH");
    setStatus(`บันทึกข้อมูลสินค้าเรียบร้อยแล้ว ${updatedAt}`);
    if (savedProduct?._stockFallback) {
      showAdminToast("บันทึกสินค้าแล้ว แต่ stock log ต้องรัน supabase-orders-admin.sql เพิ่ม", "warning");
    } else {
      showAdminToast("บันทึกข้อมูลสินค้าเรียบร้อยแล้ว", "success");
    }
  } catch (error) {
    console.error("Supabase product save failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    const message = adminProductErrorMessage(error);
    setStatus(message);
    showAdminToast(message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
    createIconSet();
  }
}

async function deleteSelectedProduct() {
  const product = selectedProduct();
  if (!product) return;
  if (!(await adminConfirm(`ปิดการขายสินค้า ${product.name} ใช่ไหม? สินค้าจะไม่แสดงหน้าร้าน แต่ข้อมูลยังอยู่ใน Supabase`))) return;

  try {
    const { data, error } = await requireSupabaseAdminClient()
      .from("products")
      .update({ is_active: false })
      .eq("id", product.id)
      .select("*")
      .single();
    if (error) throw error;
    const updatedProduct = mapSupabaseProductRow(data);
    replaceProductInState(updatedProduct);
    state.selectedProductId = updatedProduct.id;
    renderAll();
    setStatus("ปิดการขายสินค้าแล้ว");
    showAdminToast("ปิดการขายสินค้าเรียบร้อยแล้ว", "success");
  } catch (error) {
    console.error("Supabase product deactivate failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    const message = adminProductErrorMessage(error);
    setStatus(message);
    showAdminToast(message, "error");
  }
}

function renderUsersTable() {
  $("#users-table").innerHTML = state.users.length
    ? state.users
        .map(
          (user) => `
            <tr>
              <td>
                <div class="user-cell">
                  <span class="user-avatar">${escapeHtml((user.displayName || user.username || "U").slice(0, 1).toUpperCase())}</span>
                  <div>
                    <strong>${escapeHtml(user.displayName || user.username)}</strong>
                    <span>${escapeHtml(user.email)}</span>
                  </div>
                </div>
              </td>
              <td><span class="status-pill ${user.role === "admin" ? "warn" : "ok"}">${escapeHtml(user.role)}</span></td>
              <td>${escapeHtml(user.position || "-")}</td>
              <td><span class="status-pill ${user.status === "active" ? "ok" : "danger"}">${escapeHtml(user.status)}</span></td>
              <td>
                <div class="row-actions">
                  <button class="mini-button" type="button" data-edit-user="${escapeHtml(user.id)}">
                    <i data-lucide="pencil"></i>
                  </button>
                  <button class="mini-button" type="button" data-reset-pw="${escapeHtml(user.id)}" title="เปลี่ยนรหัสผ่าน">
                    <i data-lucide="key-round"></i>
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5">ยังไม่มี user</td></tr>`;
}

function userFromForm(form) {
  return {
    id: state.selectedUserId || null,
    email: form.elements.email.value.trim().toLowerCase(),
    username: form.elements.username.value.trim(),
    displayName: form.elements.displayName.value.trim(),
    fullName: form.elements.displayName.value.trim(),
    password: form.elements.password.value,
    role: form.elements.role.value,
    position: form.elements.position.value.trim() || "Member",
    partnerLevel: form.elements.partnerLevel.value,
    status: form.elements.status.value
  };
}

function replaceUserInState(user) {
  const index = state.users.findIndex((item) => item.id === user.id);
  if (index >= 0) {
    state.users[index] = user;
  } else {
    state.users.unshift(user);
  }
}

function renderUserForm() {
  fillUserForm(selectedUser());
}

function fillUserForm(user) {
  const form = $("#user-form");
  const isNew = !user;
  $("#user-form-title").textContent = isNew ? "เพิ่ม user ใหม่" : "แก้ไข user";
  $("#editing-user-id").textContent = isNew ? "user ใหม่" : user.id;
  $("#delete-user").disabled = isNew;
  const value = user ?? {
    email: "",
    username: "",
    displayName: "",
    role: "customer",
    position: "Member",
    partnerLevel: "none",
    status: "active"
  };
  form.elements.email.value = value.email;
  form.elements.username.value = value.username;
  form.elements.displayName.value = value.displayName;
  form.elements.password.value = "";
  form.elements.role.value = value.role;
  form.elements.position.value = value.position;
  form.elements.partnerLevel.value = value.partnerLevel;
  form.elements.status.value = value.status;
}

async function saveUserFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = '<i data-lucide="loader-circle"></i> กำลังบันทึก user';
  createIconSet();

  try {
    const savedUser = await window.OlafAdminUsers.saveAdminUser(userFromForm(form));
    replaceUserInState(savedUser);
    state.selectedUserId = savedUser.id;
    renderUsersTable();
    renderUserForm();
    createIconSet();
    setStatus(`บันทึก user ${savedUser.email} แล้ว`);
    showAdminToast("บันทึก user ไปที่ Supabase แล้ว", "success");
  } catch (error) {
    console.error("Supabase admin user save failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    const message = adminUserErrorMessage(error);
    setStatus(message);
    showAdminToast(message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
    createIconSet();
  }
}

async function deleteSelectedUser() {
  const user = selectedUser();
  if (!user) return;
  if (!(await adminConfirm(`ระงับ user ${user.email} ใช่ไหม? Auth account จะยังอยู่ใน Supabase แต่ status จะเปลี่ยนเป็น banned`))) return;

  try {
    const updatedUser = await window.OlafAdminUsers.disableAdminUser(user.id);
    replaceUserInState(updatedUser);
    state.selectedUserId = updatedUser.id;
    renderUsersTable();
    renderUserForm();
    createIconSet();
    setStatus(`ระงับ user ${updatedUser.email} แล้ว`);
    showAdminToast("เปลี่ยนสถานะ user เป็น banned แล้ว", "success");
  } catch (error) {
    console.error("Supabase admin user disable failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    const message = adminUserErrorMessage(error);
    setStatus(message);
    showAdminToast(message, "error");
  }
}

function adminResetPassword(userId) {
  const user = state.users.find((item) => item.id === userId);
  setStatus(`เปลี่ยนรหัสผ่าน ${user?.email || "user"} ได้ใน Supabase Dashboard > Authentication > Users`);
  showAdminToast("เพื่อความปลอดภัย รหัสผ่านต้องเปลี่ยนใน Supabase Dashboard", "warning");
}

function renderReviewsTable() {
  $("#reviews-count").textContent = `${state.reviews.length.toLocaleString("th-TH")} รีวิว`;
  $("#reviews-table").innerHTML = state.reviews.length
    ? state.reviews
        .map(
          (review) => `
            <tr>
              <td>
                <div class="review-table-cell">
                  <strong>${escapeHtml(review.title || "ไม่มีหัวข้อ")}</strong>
                  <span>${escapeHtml(review.username)} · ${new Date(review.createdAt).toLocaleString("th-TH")}</span>
                </div>
              </td>
              <td>${escapeHtml(review.productName)}</td>
              <td><span class="rating-stars rating-frame">${ratingStars(review.rating)}</span></td>
              <td><span class="status-pill ${review.status === "published" ? "ok" : "warn"}">${escapeHtml(review.status)}</span></td>
              <td>
                <div class="row-actions">
                  <button class="mini-button" type="button" data-edit-review="${escapeHtml(review.id)}">
                    <i data-lucide="pencil"></i>
                  </button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5">ยังไม่มีรีวิว</td></tr>`;
}

function renderReviewForm() {
  fillReviewForm(selectedReview());
}

function fillReviewForm(review) {
  const form = $("#review-form");
  const isEmpty = !review;
  $("#review-form-title").textContent = isEmpty ? "ยังไม่มีรีวิวให้แก้ไข" : "แก้ไขรีวิว";
  $("#editing-review-id").textContent = isEmpty ? "ยังไม่ได้เลือก" : review.id;
  $("#delete-review").disabled = isEmpty;
  const value = review ?? {
    title: "",
    productId: "",
    productName: "",
    username: "",
    rating: 5,
    status: "published",
    body: ""
  };
  form.elements.title.value = value.title;
  form.elements.productId.value = value.productId;
  form.elements.productName.value = value.productName;
  form.elements.username.value = value.username;
  form.elements.rating.value = String(value.rating);
  form.elements.status.value = value.status;
  form.elements.body.value = value.body;
}

function saveReviewFromForm(event) {
  event.preventDefault();
  if (!state.selectedReviewId) return;
  const form = event.currentTarget;
  window.OlafStore.updateReview(state.selectedReviewId, {
    title: form.elements.title.value,
    productId: form.elements.productId.value,
    productName: form.elements.productName.value,
    username: form.elements.username.value,
    rating: form.elements.rating.value,
    status: form.elements.status.value,
    body: form.elements.body.value
  });
  setStatus("บันทึกรีวิวแล้ว");
  renderAll();
  showAdminToast("บันทึกรีวิวเรียบร้อยแล้ว", "success");
}

async function deleteSelectedReview() {
  if (!state.selectedReviewId) return;
  if (!(await adminConfirm("ลบรีวิวนี้ใช่ไหม?"))) return;
  window.OlafStore.deleteReview(state.selectedReviewId);
  state.selectedReviewId = null;
  setStatus("ลบรีวิวแล้ว");
  renderAll();
}

function orderStatusClass(status) {
  if (status === "delivered" || status === "confirmed") return "ok";
  if (status === "cancelled") return "danger";
  return "warn";
}

function renderOrdersTable() {
  $("#orders-count").textContent = `${state.orders.length.toLocaleString("th-TH")} ออเดอร์`;
  $("#orders-table").innerHTML = state.orders.length
    ? state.orders
        .map(
          (order) => `
            <tr>
              <td><strong>${escapeHtml(order.orderNumber || order.id)}</strong><br><span>${new Date(order.createdAt).toLocaleString("th-TH")}</span></td>
              <td>${escapeHtml(order.customerName || order.username || "-")}</td>
              <td>${formatPrice(order.total)}</td>
              <td><span class="status-pill ${orderStatusClass(order.status)}">${escapeHtml(order.status)}</span></td>
              <td><div class="row-actions"><button class="mini-button" type="button" data-edit-order="${escapeHtml(order.id)}"><i data-lucide="pencil"></i></button></div></td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="5">ยังไม่มีคำสั่งซื้อ</td></tr>`;
}

function renderOrderForm() {
  const order = selectedOrder();
  const form = $("#order-form");
  $("#order-form-title").textContent = order ? "จัดการออเดอร์" : "ยังไม่ได้เลือกออเดอร์";
  $("#editing-order-id").textContent = order?.orderNumber || order?.id || "ยังไม่ได้เลือก";
  $("#delete-order").disabled = !order;
  form.elements.status.value = order?.status || "waiting_admin";
  form.elements.deliveryNote.value = order?.deliveryNote || "";
  const items = order?.items?.length
    ? `
      <h3>รายการสินค้า</h3>
      ${order.items
        .map((item) => {
          const packageTitle = item.packageTitle || item.packageSnapshot?.title || "";
          const packageSubtitle = item.packageSubtitle || item.packageSnapshot?.subtitle || "";
          return `
            <p>
              <strong>${escapeHtml(item.productName || item.name)}</strong>
              ${packageTitle ? `<br><span class="admin-order-package">แพ็คเกจ: ${escapeHtml(packageTitle)}</span>` : ""}
              ${packageSubtitle ? `<br><span class="admin-order-package muted">${escapeHtml(packageSubtitle)}</span>` : ""}
              <br>${Number(item.quantity || 0).toLocaleString("th-TH")} x ${formatPrice(item.unitPrice)} = ${formatPrice(item.lineTotal)}
            </p>
          `;
        })
        .join("")}
    `
    : "";
  const slipHtml = order?.paymentSlipUrl
    ? `<h3>สลิปที่ลูกค้าแนบ</h3><img ${fastImg(order.paymentSlipUrl, "Payment slip")} /><p>${escapeHtml(order.paymentSlipPath)}</p>`
    : order?.paymentSlipPath
      ? `<h3>Storage path สลิป</h3><p>${escapeHtml(order.paymentSlipPath)}</p><p>ยังสร้าง signed URL ไม่ได้ กรุณาตรวจ policy ของ bucket payment-slips</p>`
      : `<p>ยังไม่มีสลิปแนบสำหรับออเดอร์นี้</p>`;
  $("#slip-preview").innerHTML = `${slipHtml}${items}`;
  return;
  $("#slip-preview").innerHTML = order?.paymentSlipPath
    ? `<h3>Storage path สลิป</h3><p>${escapeHtml(order.paymentSlipPath)}</p>${items}`
    : `<p>ระบบแนบสลิปผ่าน Supabase Storage ยังไม่เปิดใช้งาน</p>${items}`;
}

async function saveOrderFromForm(event) {
  event.preventDefault();
  if (!state.selectedOrderId) return;
  const form = event.currentTarget;
  const orderId = state.selectedOrderId;

  try {
    await window.OlafOrders.adminUpdateOrder({
      orderId,
      status: form.elements.status.value,
      deliveryNote: form.elements.deliveryNote.value,
      deliveredPayload: form.elements.deliveryNote.value
    });
    await loadData();
    state.selectedOrderId = orderId;
    renderAll();
    setStatus("บันทึกสถานะออเดอร์ออนไลน์แล้ว");
    showAdminToast("บันทึกออเดอร์ใน Supabase เรียบร้อยแล้ว", "success");
  } catch (error) {
    setStatus(error.message || "บันทึกออเดอร์ไม่สำเร็จ");
    showAdminToast(error.message || "บันทึกออเดอร์ไม่สำเร็จ", "error");
  }
}

async function deleteSelectedOrder() {
  if (!state.selectedOrderId) return;
  const orderId = state.selectedOrderId;
  if (!(await adminConfirm("ยกเลิกออเดอร์นี้ใช่ไหม? ระบบจะคืนสต็อกถ้าออเดอร์ยังไม่เคยถูกยกเลิก"))) return;

  try {
    await window.OlafOrders.adminUpdateOrder({
      orderId,
      status: "cancelled",
      deliveryNote: selectedOrder()?.deliveryNote || "",
      deliveredPayload: selectedOrder()?.deliveredPayload || ""
    });
    await loadData();
    state.selectedOrderId = state.orders[0]?.id ?? null;
    renderAll();
    setStatus("ยกเลิกออเดอร์แล้ว");
    showAdminToast("ยกเลิกออเดอร์เรียบร้อยแล้ว", "success");
  } catch (error) {
    setStatus(error.message || "ยกเลิกออเดอร์ไม่สำเร็จ");
    showAdminToast(error.message || "ยกเลิกออเดอร์ไม่สำเร็จ", "error");
  }
}

function renderWidgetsTable() {
  $("#widgets-table").innerHTML = state.widgets.length
    ? state.widgets
        .map(
          (widget) => `
            <tr>
              <td><strong>${escapeHtml(widget.title)}</strong><br><span>${escapeHtml(widget.id)}</span></td>
              <td>${escapeHtml(widget.placement)}</td>
              <td><span class="status-pill ${widget.status === "active" ? "ok" : "warn"}">${escapeHtml(widget.status)}</span></td>
              <td><div class="row-actions"><button class="mini-button" type="button" data-edit-widget="${escapeHtml(widget.id)}"><i data-lucide="pencil"></i></button></div></td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4">ยังไม่มี widget</td></tr>`;
}

function renderWidgetForm() {
  const widget = selectedWidget();
  const form = $("#widget-form");
  $("#widget-form-title").textContent = widget ? "แก้ไข Widget" : "เพิ่ม Widget";
  $("#editing-widget-id").textContent = widget?.id || "Widget ใหม่";
  $("#delete-widget").disabled = !widget;
  form.elements.title.value = widget?.title || "";
  form.elements.placement.value = widget?.placement || "home";
  form.elements.status.value = widget?.status || "active";
  form.elements.code.value = widget?.code || "";
  $("#widget-preset-select").value = "";
}

function applyWidgetPreset() {
  const preset = widgetPresets[$("#widget-preset-select").value];
  if (!preset) {
    setStatus("เลือก preset widget ก่อน");
    return;
  }
  const form = $("#widget-form");
  if (!form.elements.title.value.trim()) form.elements.title.value = preset.title;
  form.elements.code.value = preset.code;
  form.elements.placement.value = "home";
  form.elements.status.value = "active";
  setStatus(`เติม preset ${preset.title} แล้ว`);
}

function saveWidgetFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    title: form.elements.title.value,
    placement: form.elements.placement.value,
    status: form.elements.status.value,
    code: form.elements.code.value
  };
  const widget = state.selectedWidgetId
    ? window.OlafStore.updateWidget(state.selectedWidgetId, payload)
    : window.OlafStore.createWidget(payload);
  state.selectedWidgetId = widget.id;
  setStatus("บันทึก Widget แล้ว");
  renderAll();
  showAdminToast("บันทึก Widget เรียบร้อยแล้ว", "success");
}

async function deleteSelectedWidget() {
  if (!state.selectedWidgetId) return;
  if (!(await adminConfirm("ลบ Widget นี้ใช่ไหม?"))) return;
  window.OlafStore.deleteWidget(state.selectedWidgetId);
  state.selectedWidgetId = null;
  setStatus("ลบ Widget แล้ว");
  renderAll();
}

function renderStockBoard() {
  $("#stock-board").innerHTML = filteredProducts()
    .map((product) => {
      const status = stockStatus(product.stock);
      const isOffline = isOfflineProductCategory(product.category);
      return `
        <article class="stock-card">
          <div class="stock-head">
            <img ${fastImg(product.image || product.heroImage, product.name, { className: "stock-thumb" })} />
            <div>
              <h3>${escapeHtml(product.name)}</h3>
              <p>${escapeHtml(categoryLabel(product.category))}</p>
            </div>
          </div>
          <span class="status-pill ${status.className}">${status.label}</span>
          ${
            isOffline
              ? `
                <div class="offline-stock-card-note">
                  สต็อกหมวด ${escapeHtml(stockCategoryLabel)} ต้องจัดการเป็นรายการ 1 บรรทัดต่อ 1 ชิ้น
                </div>
                <button class="primary-button" type="button" data-manage-offline-stock="${escapeHtml(product.id)}">
                  <i data-lucide="list-plus"></i>
                  จัดการรายการสต็อก
                </button>
              `
              : `
                <div class="stock-buttons">
                  <button class="mini-button" type="button" data-stock-adjust="${escapeHtml(product.id)}" data-delta="1">+1</button>
                  <button class="mini-button" type="button" data-stock-adjust="${escapeHtml(product.id)}" data-delta="5">+5</button>
                  <button class="mini-button" type="button" data-stock-adjust="${escapeHtml(product.id)}" data-delta="10">+10</button>
                  <button class="mini-button" type="button" data-stock-zero="${escapeHtml(product.id)}">หมด</button>
                </div>
                <div class="stock-set">
                  <input type="number" min="0" step="1" value="${product.stock}" data-stock-input="${escapeHtml(product.id)}" />
                  <button class="primary-button" type="button" data-stock-set="${escapeHtml(product.id)}">ตั้งค่า</button>
                </div>
              `
          }
        </article>
      `;
    })
    .join("");
}

async function changeStock(productId, nextStock, action) {
  const product = products().find((item) => item.id === productId);
  if (!product) return;
  if (isOfflineProductCategory(product.category)) {
    state.selectedProductId = productId;
    switchPanel("products");
    renderProductForm();
    const stockCategoryLabel = managedStockCategoryLabel(product.category);
    setStatus(`สินค้า ${stockCategoryLabel} ต้องเพิ่มสต็อกจากรายการ 1 บรรทัดต่อ 1 ชิ้น`);
    showAdminToast(`กรุณาจัดการสต็อก ${stockCategoryLabel} ในฟอร์มสินค้า`, "info");
    return;
  }
  const stock = Math.max(0, Number(nextStock) || 0);
  try {
    validateNonNegativeInteger(stock, "สต็อก");
    const previousStock = Number(product.stock || 0);
    const updatedProduct = await window.OlafProducts.setAdminProductStock({
      productId,
      stock,
      note: action
    });
    if (updatedProduct) replaceProductInState(updatedProduct);
    state.stockLog.unshift({
      id: `${productId}-${Date.now()}`,
      name: updatedProduct?.name || product.name,
      action,
      delta: stock - previousStock,
      previous: previousStock,
      next: stock,
      createdAt: new Date().toISOString()
    });
    state.stockLog = state.stockLog.slice(0, 40);
    state.selectedProductId = productId;
    renderStockViews({ refreshProductForm: document.body.dataset.adminPanel === "products" });
    if (updatedProduct?._stockFallback) {
      setStatus("อัปเดตสต็อกแล้ว แต่ยังไม่ได้บันทึกประวัติ stock movement เพราะ RPC ยังไม่พร้อม");
      showAdminToast("อัปเดตสต็อกแล้ว กรุณารัน supabase-orders-admin.sql เพื่อเปิด stock log", "warning");
    } else {
      setStatus("อัปเดตสต็อกออนไลน์แล้ว");
      showAdminToast("อัปเดตสต็อกใน Supabase แล้ว", "success");
    }
  } catch (error) {
    console.error("Supabase stock adjustment failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    const message = adminStockErrorMessage(error);
    setStatus(message);
    showAdminToast(message, "error");
  }
}

function renderPaymentForm() {
  const form = $("#payment-form");
  const payment = state.payload.store.payment ?? {};
  const qrUrl = state.pendingQrPreviewUrl ?? state.pendingQrDataUrl ?? payment.manualQrUrl ?? "";
  const trueMoneyQrUrl = state.pendingTrueMoneyQrPreviewUrl ?? state.pendingTrueMoneyQrDataUrl ?? payment.trueMoneyQrUrl ?? "";
  const siteIconUrl = state.pendingSiteIconDataUrl ?? state.payload.store.siteIconUrl ?? "";

  form.elements.promptPayId.value = payment.promptPayId || state.payload.store.promptPayId || "";
  form.elements.serviceFee.value = payment.serviceFee || 0;
  form.elements.paymentEndpoint.value = payment.paymentEndpoint || state.payload.store.paymentEndpoint || "";
  form.elements.bankName.value = payment.bankName || "";
  form.elements.bankAccountNumber.value = payment.bankAccountNumber || "";
  form.elements.bankAccountName.value = payment.bankAccountName || "";
  form.elements.walletName.value = payment.walletName || "";
  form.elements.paymentNote.value = payment.paymentNote || "";
  form.elements.manualQrUrl.value = isInlinePreviewUrl(qrUrl) ? "" : qrUrl;
  form.elements.trueMoneyQrUrl.value = isInlinePreviewUrl(trueMoneyQrUrl) ? "" : trueMoneyQrUrl;
  form.elements.siteIconUrl.value = isInlinePreviewUrl(siteIconUrl) ? "" : siteIconUrl;
  renderQrPreview(qrUrl, trueMoneyQrUrl);
  renderSiteIconPreview(siteIconUrl);
}

function renderQrPreview(qrUrl, trueMoneyQrUrl) {
  const preview = $("#qr-preview");
  const qrIsLocalPreview = String(qrUrl || "").startsWith("blob:");
  const tmQrIsLocalPreview = String(trueMoneyQrUrl || "").startsWith("blob:");
  $("#qr-source-label").textContent = qrUrl
    ? qrIsLocalPreview
      ? "รูปที่อัปโหลดเอง"
      : "URL รูป QR"
    : "ยังไม่ได้ตั้งค่า";

  preview.innerHTML = qrUrl
    ? `<img ${fastImg(qrUrl, "QR Code พร้อมเพย์", { priority: true })} />`
    : `<i data-lucide="qr-code"></i><p>อัปโหลดรูป QR หรือใส่ URL เพื่อแสดงในหน้าชำระเงิน</p>`;

  const tmPreview = $("#truemoney-qr-preview");
  if (tmPreview) {
    $("#truemoney-qr-source-label").textContent = trueMoneyQrUrl
      ? tmQrIsLocalPreview
        ? "รูปที่อัปโหลดเอง"
        : "URL รูป QR"
      : "ยังไม่ได้ตั้งค่า";
    tmPreview.innerHTML = trueMoneyQrUrl
      ? `<img ${fastImg(trueMoneyQrUrl, "QR Code ทรูมันนี่", { priority: true })} />`
      : `<i data-lucide="qr-code"></i><p>อัปโหลดรูป QR หรือใส่ URL ทรูมันนี่</p>`;
  }
  createIconSet();
}

function renderSiteIconPreview(iconUrl) {
  const preview = $("#site-icon-preview");
  const label = $("#site-icon-source-label");
  if (!preview || !label) return;
  label.textContent = iconUrl
    ? iconUrl.startsWith("data:")
      ? "รูปที่อัปโหลดเอง"
      : "URL ไอคอน"
    : "ยังไม่ได้ตั้งค่า";

  preview.innerHTML = iconUrl
    ? `<img ${fastImg(iconUrl, "ไอคอนหน้าเว็บ", { priority: true })} />`
    : `<i data-lucide="badge"></i><p>อัปโหลดหรือใส่ URL เพื่อเปลี่ยนไอคอนหน้าเว็บ</p>`;
  createIconSet();
}

async function savePaymentSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const existingQr = state.payload.store.payment?.manualQrUrl || "";
  const existingQrPath = state.payload.store.payment?.manualQrPath || "";
  const typedQr = form.elements.manualQrUrl.value.trim();
  let manualQrUrl = state.qrCleared ? "" : typedQr || existingQr;
  let manualQrPath = state.qrCleared ? "" : existingQrPath;
  
  const existingTmQr = state.payload.store.payment?.trueMoneyQrUrl || "";
  const existingTmQrPath = state.payload.store.payment?.trueMoneyQrPath || "";
  const typedTmQr = form.elements.trueMoneyQrUrl.value.trim();
  let trueMoneyQrUrl = state.tmQrCleared ? "" : typedTmQr || existingTmQr;
  let trueMoneyQrPath = state.tmQrCleared ? "" : existingTmQrPath;
  
  const existingIcon = state.payload.store.siteIconUrl || "";
  const typedIcon = form.elements.siteIconUrl.value.trim();
  const siteIconUrl = state.siteIconCleared ? "" : state.pendingSiteIconDataUrl || typedIcon || existingIcon;

  try {
    if (state.pendingQrFile) {
      if (!window.OlafStoreSettings?.uploadPaymentQr) throw new Error("PAYMENT_QR_UPLOAD_NOT_READY");
      const uploadedQr = await window.OlafStoreSettings.uploadPaymentQr({
        channelId: "promptpay",
        file: state.pendingQrFile
      });
      manualQrPath = uploadedQr.path;
      manualQrUrl = uploadedQr.signedUrl || "";
    }

    if (state.pendingTrueMoneyQrFile) {
      if (!window.OlafStoreSettings?.uploadPaymentQr) throw new Error("PAYMENT_QR_UPLOAD_NOT_READY");
      const uploadedTmQr = await window.OlafStoreSettings.uploadPaymentQr({
        channelId: "wallet",
        file: state.pendingTrueMoneyQrFile
      });
      trueMoneyQrPath = uploadedTmQr.path;
      trueMoneyQrUrl = uploadedTmQr.signedUrl || "";
    }
  } catch (error) {
    console.error("Payment QR upload failed", error);
    setStatus(error.message || "QR upload failed");
    showAdminToast("QR upload failed. Run supabase-payment-channels.sql first.", "error");
    return;
  }

  state.payload.store.promptPayId = form.elements.promptPayId.value.trim();
  state.payload.store.paymentEndpoint = form.elements.paymentEndpoint.value.trim();
  state.payload.store.serviceFee = Number(form.elements.serviceFee.value) || 0;
  state.payload.store.siteIconUrl = siteIconUrl;
  state.payload.store.payment = {
    promptPayId: form.elements.promptPayId.value.trim(),
    serviceFee: Number(form.elements.serviceFee.value) || 0,
    paymentEndpoint: form.elements.paymentEndpoint.value.trim(),
    bankName: form.elements.bankName.value.trim(),
    bankAccountNumber: form.elements.bankAccountNumber.value.trim(),
    bankAccountName: form.elements.bankAccountName.value.trim(),
    walletName: form.elements.walletName.value.trim(),
    paymentNote: form.elements.paymentNote.value.trim(),
    manualQrUrl,
    manualQrPath,
    trueMoneyQrUrl,
    trueMoneyQrPath
  };

  try {
    const channels = [
      {
        id: "promptpay",
        label: "PromptPay QR",
        method: "promptpay",
        isActive: Boolean(manualQrPath || manualQrUrl || form.elements.promptPayId.value.trim()),
        sortOrder: 10,
        bankName: form.elements.bankName.value.trim(),
        accountNumber: form.elements.bankAccountNumber.value.trim(),
        accountName: form.elements.bankAccountName.value.trim(),
        note: form.elements.paymentNote.value.trim(),
        qrPath: manualQrPath,
        qrUrl: manualQrPath ? "" : manualQrUrl
      },
      {
        id: "wallet",
        label: "Wallet / TrueMoney QR",
        method: "wallet",
        isActive: Boolean(trueMoneyQrPath || trueMoneyQrUrl || form.elements.walletName.value.trim()),
        sortOrder: 20,
        walletName: form.elements.walletName.value.trim(),
        note: form.elements.paymentNote.value.trim(),
        qrPath: trueMoneyQrPath,
        qrUrl: trueMoneyQrPath ? "" : trueMoneyQrUrl
      }
    ];
    const savedChannels = window.OlafStoreSettings?.savePaymentChannels
      ? await window.OlafStoreSettings.savePaymentChannels(channels)
      : [];
    const promptpayChannel = savedChannels.find((channel) => channel.id === "promptpay");
    const walletChannel = savedChannels.find((channel) => channel.id === "wallet");
    if (promptpayChannel?.qrUrl) state.payload.store.payment.manualQrUrl = promptpayChannel.qrUrl;
    if (walletChannel?.qrUrl) state.payload.store.payment.trueMoneyQrUrl = walletChannel.qrUrl;
    await saveOnlineStoreSettings(state.payload.store);
  } catch (error) {
    console.error("Store settings save failed", error);
    setStatus(error.message || "บันทึกการตั้งค่าหน้าร้านไม่สำเร็จ");
    showAdminToast("Save failed. Run supabase-payment-channels.sql first.", "error");
    return;
  }

  revokePreviewUrl(state.pendingQrPreviewUrl);
  revokePreviewUrl(state.pendingTrueMoneyQrPreviewUrl);
  state.pendingQrDataUrl = null;
  state.pendingQrFile = null;
  state.pendingQrPreviewUrl = null;
  state.qrCleared = false;
  state.pendingTrueMoneyQrDataUrl = null;
  state.pendingTrueMoneyQrFile = null;
  state.pendingTrueMoneyQrPreviewUrl = null;
  state.tmQrCleared = false;
  state.pendingSiteIconDataUrl = null;
  state.siteIconCleared = false;
  applySiteIcon(siteIconUrl);
  applyAdminBrandIcon(siteIconUrl);
  savePayload("บันทึกการชำระเงินแล้ว");
  renderPaymentForm();
  renderDataPreview();
  showAdminToast("บันทึกการตั้งค่าชำระเงินเรียบร้อยแล้ว", "success");
}

function handleQrUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const previewUrl = setPendingQrPreview("promptpay", file);
  renderQrPreview(previewUrl, state.pendingTrueMoneyQrPreviewUrl || state.payload.store.payment?.trueMoneyQrUrl || "");
  setStatus("QR selected. Save to upload it to Supabase Storage.");
}

function handleTrueMoneyQrUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const previewUrl = setPendingQrPreview("wallet", file);
  renderQrPreview(state.pendingQrPreviewUrl || state.payload.store.payment?.manualQrUrl || "", previewUrl);
  setStatus("Wallet QR selected. Save to upload it to Supabase Storage.");
}

function handleSiteIconUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.pendingSiteIconDataUrl = String(reader.result || "");
    state.siteIconCleared = false;
    renderSiteIconPreview(state.pendingSiteIconDataUrl);
    setStatus("เลือกไอคอนเว็บแล้ว กดบันทึกเพื่อใช้งาน");
  });
  reader.readAsDataURL(file);
}

function renderDataPreview() {
  $("#data-updated").textContent = state.payload.updatedAt
    ? new Date(state.payload.updatedAt).toLocaleString("th-TH")
    : "-";
  $("#json-preview").textContent = JSON.stringify(state.payload, null, 2);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `olafshop-products-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = "";
  setStatus("ปิดการนำเข้า JSON แล้ว กรุณาเพิ่มสินค้าออนไลน์ผ่านฟอร์มหลังบ้าน");
  showAdminToast("การนำเข้า JSON ถูกปิดเพื่อป้องกันข้อมูลทับ Supabase", "warning");
}

async function resetData() {
  revokePreviewUrl(state.pendingQrPreviewUrl);
  revokePreviewUrl(state.pendingTrueMoneyQrPreviewUrl);
  state.pendingQrDataUrl = null;
  state.pendingQrFile = null;
  state.pendingQrPreviewUrl = null;
  state.qrCleared = false;
  state.pendingTrueMoneyQrDataUrl = null;
  state.pendingTrueMoneyQrFile = null;
  state.pendingTrueMoneyQrPreviewUrl = null;
  state.tmQrCleared = false;
  await loadData();
  setStatus("โหลดข้อมูลจาก Supabase ใหม่แล้ว");
}

function switchPanel(panelName) {
  document.body.dataset.adminPanel = panelName;
  $$(".admin-nav button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelTarget === panelName);
  });
  $$(".admin-panel").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.panel === panelName);
  });
  if (panelName === "dashboard") {
    requestAnimationFrame(renderAnalyticsCharts);
  }
}

function bindEvents() {
  $("#admin-login-form").addEventListener("submit", handleAdminLogin);

  $(".admin-nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-panel-target]");
    if (!button) return;
    switchPanel(button.dataset.panelTarget);
  });

  document.body.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-product]");
    const manageOfflineStockButton = event.target.closest("[data-manage-offline-stock]");
    const stockAdjustButton = event.target.closest("[data-stock-adjust]");
    const stockZeroButton = event.target.closest("[data-stock-zero]");
    const stockSetButton = event.target.closest("[data-stock-set]");
    const editUserButton = event.target.closest("[data-edit-user]");
    const resetPasswordButton = event.target.closest("[data-reset-pw]");
    const editReviewButton = event.target.closest("[data-edit-review]");
    const editOrderButton = event.target.closest("[data-edit-order]");
    const editWidgetButton = event.target.closest("[data-edit-widget]");
    const addPackageButton = event.target.closest("#add-product-package");
    const deletePackageButton = event.target.closest("[data-package-delete]");
    const categoryTab = event.target.closest(".category-tab");

    if (addPackageButton) {
      addPackageDraftToEditor();
      return;
    }

    if (deletePackageButton) {
      await deletePackageFromEditor(deletePackageButton);
      return;
    }

    if (categoryTab) {
      state.categoryFilter = categoryTab.dataset.categoryFilter;
      renderCategoryTabs("admin-category-tabs");
      renderCategoryTabs("stock-category-tabs");
      renderProductsTable();
      renderStockBoard();
      createIconSet();
      return;
    }

    if (manageOfflineStockButton) {
      openOfflineStockManager(manageOfflineStockButton.dataset.manageOfflineStock);
      return;
    }

    if (editButton) {
      state.selectedProductId = editButton.dataset.editProduct;
      switchPanel("products");
      renderProductForm();
      createIconSet();
      $("#product-form")?.closest(".admin-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (stockAdjustButton) {
      const id = stockAdjustButton.dataset.stockAdjust;
      const product = products().find((item) => item.id === id);
      const delta = Number(stockAdjustButton.dataset.delta) || 0;
      if (product) await changeStock(id, product.stock + delta, "เพิ่มสต็อก");
      return;
    }

    if (stockZeroButton) {
      await changeStock(stockZeroButton.dataset.stockZero, 0, "ตั้งค่าสินค้าหมด");
      return;
    }

    if (stockSetButton) {
      const id = stockSetButton.dataset.stockSet;
      const input = document.querySelector(`[data-stock-input="${CSS.escape(id)}"]`);
      await changeStock(id, Number(input?.value) || 0, "กำหนดสต็อกเอง");
      return;
    }

    if (editUserButton) {
      state.selectedUserId = editUserButton.dataset.editUser;
      switchPanel("users");
      renderUserForm();
      createIconSet();
      return;
    }

    if (resetPasswordButton) {
      adminResetPassword(resetPasswordButton.dataset.resetPw);
      return;
    }

    if (editReviewButton) {
      state.selectedReviewId = editReviewButton.dataset.editReview;
      switchPanel("reviews");
      renderReviewForm();
      createIconSet();
      return;
    }

    if (editOrderButton) {
      state.selectedOrderId = editOrderButton.dataset.editOrder;
      switchPanel("orders");
      renderOrderForm();
      createIconSet();
      return;
    }

    if (editWidgetButton) {
      state.selectedWidgetId = editWidgetButton.dataset.editWidget;
      switchPanel("widgets");
      renderWidgetForm();
      createIconSet();
    }
  });

  $("#admin-search").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProductsTable();
    createIconSet();
  });

  $("#category-select")?.addEventListener("change", () => {
    const form = $("#product-form");
    const product = {
      ...(selectedProduct() || {}),
      id: state.selectedProductId ? form.elements.id.value.trim() : "",
      category: form.elements.category.value,
      stock: Number(form.elements.stock.value || 0)
    };
    renderOfflineStockEditor(product);
  });

  $("#offline-stock-lines")?.addEventListener("input", () => {
    const product = selectedProduct();
    syncOfflineStockCacheFromEditor(product?.id);
    const lines = offlineStockLinesFromEditor();
    const form = $("#product-form");
    if (form?.elements?.stock && isOfflineProductCategory(form.elements.category.value)) {
      form.elements.stock.value = lines.length;
    }
    renderOfflineStockMeta(getCachedOfflineStockItems(product?.id) || [], lines.length);
  });

  $("#new-product").addEventListener("click", () => {
    state.selectedProductId = null;
    delete state.productPackages.__new__;
    delete state.offlineStockItems.__new__;
    fillProductForm(null);
    $("#product-form")?.closest(".admin-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#new-user").addEventListener("click", () => {
    state.selectedUserId = null;
    fillUserForm(null);
  });

  $("#new-widget").addEventListener("click", () => {
    state.selectedWidgetId = null;
    renderWidgetForm();
  });

  $("#product-form").addEventListener("submit", saveProductFromForm);
  $("#user-form").addEventListener("submit", saveUserFromForm);
  $("#review-form").addEventListener("submit", saveReviewFromForm);
  $("#order-form").addEventListener("submit", saveOrderFromForm);
  $("#widget-form").addEventListener("submit", saveWidgetFromForm);

  document.querySelectorAll(".dialog-close").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest("dialog")?.close());
  });

  $("#apply-widget-preset").addEventListener("click", applyWidgetPreset);
  $("#delete-product").addEventListener("click", deleteSelectedProduct);
  $("#delete-user").addEventListener("click", deleteSelectedUser);
  $("#delete-review").addEventListener("click", deleteSelectedReview);
  $("#delete-order").addEventListener("click", deleteSelectedOrder);
  $("#delete-widget").addEventListener("click", deleteSelectedWidget);
  $("#admin-logout").addEventListener("click", async () => {
    await requireSupabaseAdminClient().auth.signOut();
    await window.OlafStore?.logout({ skipRemoteSignOut: true });
    adminSessionUser = null;
    showAdminLogin("ออกจากระบบแล้ว");
  });
  $("#payment-form").addEventListener("submit", savePaymentSettings);
  $("#qr-upload").addEventListener("change", handleQrUpload);
  $("#truemoney-qr-upload").addEventListener("change", handleTrueMoneyQrUpload);
  $("#site-icon-upload").addEventListener("change", handleSiteIconUpload);
  $("#clear-custom-qr").addEventListener("click", () => {
    revokePreviewUrl(state.pendingQrPreviewUrl);
    revokePreviewUrl(state.pendingTrueMoneyQrPreviewUrl);
    state.qrCleared = true;
    state.tmQrCleared = true;
    state.pendingQrFile = null;
    state.pendingQrPreviewUrl = null;
    state.pendingTrueMoneyQrFile = null;
    state.pendingTrueMoneyQrPreviewUrl = null;
    state.pendingQrDataUrl = "";
    state.pendingTrueMoneyQrDataUrl = "";
    state.payload.store.payment.manualQrUrl = "";
    state.payload.store.payment.manualQrPath = "";
    state.payload.store.payment.trueMoneyQrUrl = "";
    state.payload.store.payment.trueMoneyQrPath = "";
    savePayload("ล้าง QR เองแล้ว");
    renderPaymentForm();
  });
  $("#clear-site-icon").addEventListener("click", () => {
    state.siteIconCleared = true;
    state.pendingSiteIconDataUrl = "";
    state.payload.store.siteIconUrl = "";
    applySiteIcon("");
    applyAdminBrandIcon("");
    savePayload("ล้างไอคอนเว็บแล้ว");
    renderPaymentForm();
  });
  $("#clear-stock-log").addEventListener("click", () => {
    state.stockLog = [];
    renderMetrics();
    createIconSet();
    setStatus("ล้างประวัติในหน้าจอแล้ว ประวัติจริงยังอยู่ใน Supabase");
  });
  $("#export-json").addEventListener("click", exportJson);
  $("#import-json").addEventListener("change", importJson);
  $("#reset-data").addEventListener("click", resetData);
  $("#reload-data").addEventListener("click", loadData);

  let chartResizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(chartResizeTimer);
    chartResizeTimer = setTimeout(() => {
      if (document.body.dataset.adminPanel === "dashboard") renderAnalyticsCharts();
    }, 140);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.OlafStore?.ready;
  bindEvents();
  showAdminLogin("กำลังตรวจสอบสิทธิ์แอดมิน...");
  try {
    const admin = await checkAdminAccess();
    if (admin) {
      showAdminShell();
      await loadData();
    } else {
      const access = checkAdminAccess.lastAccess || {};
      const reason = access.reason || "NO_SESSION";

      if (reason === "NOT_ADMIN") {
        await requireSupabaseAdminClient().auth.signOut().catch(() => {});
      }

      if (reason === "NO_SESSION" || reason === "INVALID_SESSION" || reason === "NOT_ADMIN") {
        showAdminLogin(adminDeniedMessage(reason));
      } else {
        showAdminLogin(adminDeniedMessage("ROLE_LOAD_FAILED"));
      }
    }
  } catch (error) {
    console.error("Admin access guard failed", error);
    showAdminLogin(adminDeniedMessage("ROLE_LOAD_FAILED"));
  }
  createIconSet();
});

function adminAlert(message, title = "ข้อความจากระบบ") {
  return new Promise((resolve) => {
    const dialog = document.getElementById("admin-alert-dialog");
    if (!dialog) { alert(message); return resolve(); }
    document.getElementById("admin-alert-message").textContent = message;
    document.getElementById("admin-alert-title").textContent = title;
    const okBtn = document.getElementById("admin-alert-ok");
    
    const closeHandler = () => {
      dialog.close();
      okBtn.removeEventListener("click", closeHandler);
      resolve();
    };
    
    okBtn.addEventListener("click", closeHandler);
    dialog.showModal();
    if (typeof createIconSet === "function") createIconSet();
  });
}

function adminConfirm(message, title = "ยืนยันการทำรายการ") {
  return new Promise((resolve) => {
    const dialog = document.getElementById("admin-confirm-dialog");
    if (!dialog) { return resolve(confirm(message)); }
    document.getElementById("admin-confirm-message").textContent = message;
    document.getElementById("admin-confirm-title").textContent = title;
    
    const okBtn = document.getElementById("admin-confirm-ok");
    const cancelBtn = document.getElementById("admin-confirm-cancel");
    
    const cleanup = () => {
      dialog.close();
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
    };
    
    const okHandler = () => { cleanup(); resolve(true); };
    const cancelHandler = () => { cleanup(); resolve(false); };
    
    okBtn.addEventListener("click", okHandler);
    cancelBtn.addEventListener("click", cancelHandler);
    
    dialog.showModal();
    if (typeof createIconSet === "function") createIconSet();
  });
}


function showAdminToast(message, type = "success", duration = 3000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'info'}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  if (typeof createIconSet === "function") createIconSet();
  
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

