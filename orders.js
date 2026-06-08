const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
let currentOrderId = params.get("order");
let currentLang = localStorage.getItem("olafshop_lang") || "th";
let globalPayload = null;
let orderRows = [];
let ordersError = "";
let iconRefreshQueued = false;

const formatPrice = (value) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const chromeText = {
  th: { signIn: "เข้าสู่ระบบ" },
  en: { signIn: "Sign in" }
};

function t(key) {
  return chromeText[currentLang]?.[key] || chromeText.th[key] || key;
}

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

function hydrateImages() {
  if (window.OlafImages?.scheduleHydrate) {
    window.OlafImages.scheduleHydrate(document);
    return;
  }
  window.OlafImages?.hydrate?.(document);
}

function showToast(message, type = "success", duration = 3500) {
  const container = document.querySelector("#toast-container");
  if (!container) return;
  const iconMap = {
    success: "check-circle",
    error: "alert-circle",
    info: "info",
    warning: "alert-triangle",
    shipping: "truck",
    cancel: "x-circle",
    payment: "credit-card",
    order: "package"
  };
  const icon = iconMap[type] || "check-circle";
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  createIconSet();
  setTimeout(() => { toast.classList.add("is-leaving"); setTimeout(() => toast.remove(), 350); }, duration);
}


function ratingValue(value) {
  return Math.max(1, Math.min(5, Number(value) || 5));
}

function ratingStars(value) {
  const rating = ratingValue(value);
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
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

async function loadStoreChrome() {
  try {
    const products = await fetchSupabaseProducts();
    const jsonPayload = await fetchJsonProductsPayload(true).catch((error) => {
      console.warn("Product JSON settings unavailable while using Supabase products", error);
      return null;
    });
    globalPayload = {
      store: jsonPayload?.store ?? {},
      categories: deriveCategories(products, jsonPayload?.categories),
      products
    };
  } catch (error) {
    console.warn("Supabase products unavailable for orders page; using JSON fallback", error);
    globalPayload = await fetchJsonProductsPayload().catch((fallbackError) => {
      console.warn("Products JSON fallback unavailable for orders page", fallbackError);
      return null;
    });
  }
  const storeSettings = await fetchOnlineStoreSettings(true);
  if (globalPayload || Object.keys(storeSettings).length) {
    globalPayload = {
      ...(globalPayload ?? { categories: [], products: [] }),
      store: mergeStoreSettings(globalPayload?.store ?? {}, storeSettings)
    };
  }
  applySiteIcon(globalPayload?.store?.siteIconUrl);
  applyBrandIcon(globalPayload?.store?.siteIconUrl);
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

async function fetchJsonProductsPayload(quiet = false) {
  try {
    const response = await fetch("api/products.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (Array.isArray(payload?.products)) return payload;
    if (Array.isArray(payload)) return { products: payload };
    throw new Error("Invalid products JSON payload");
  } catch (error) {
    if (!quiet) console.warn("Products JSON fallback unavailable", error);
    throw error;
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

function deriveCategories(products, fallbackCategories = []) {
  const labels = new Map((fallbackCategories || []).map((category) => [category.id, category.label]));
  const categoryIds = [...new Set(products.map((product) => product.category).filter(Boolean))];
  return [
    { id: "all", label: labels.get("all") || "ทั้งหมด" },
    ...categoryIds.map((id) => ({ id, label: labels.get(id) || id }))
  ];
}

function applyLanguageChrome() {
  document.documentElement.lang = currentLang === "en" ? "en" : "th";
  document.querySelectorAll("[data-lang-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.langOption === currentLang);
  });
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

function closeNotificationMenu() {
  const popover = $("#notification-popover");
  const toggle = $("#open-notifications");
  if (popover) popover.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
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

function selectLanguage(lang) {
  if (!["th", "en"].includes(lang)) return;
  currentLang = lang;
  localStorage.setItem("olafshop_lang", currentLang);
  closeLanguageMenu();
  render();
}

function statusLabel(status) {
  const map = {
    awaiting_payment: "รอชำระเงิน / แนบสลีป",
    waiting_admin: "รอแอดมินตรวจสลิป",
    confirmed: "ยืนยันการชำระเงินแล้ว",
    delivered: "จัดส่งสินค้าแล้ว",
    cancelled: "ยกเลิก",
    expired: "หมดอายุ"
  };
  return map[status] || status || "pending";
}

function statusClass(status) {
  if (status === "delivered" || status === "confirmed") return "in-stock";
  if (status === "cancelled" || status === "expired") return "out-stock";
  return "low-stock";
}

function slipUploadErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("SLIP_FILE_TOO_LARGE")) return "ไฟล์สลิปใหญ่เกิน 5MB";
  if (message.includes("SLIP_FILE_MUST_BE_IMAGE")) return "กรุณาแนบไฟล์รูปภาพเท่านั้น";
  if (message.includes("ORDER_SLIP_LOCKED")) return "ออเดอร์นี้ตรวจสลิปแล้ว ไม่สามารถแก้ไขสลิปได้";
  if (message.includes("Bucket not found") || message.includes("row-level security") || message.includes("attach_payment_slip")) {
    return "ระบบสลิปยังไม่พร้อม กรุณารันไฟล์ supabase-store-payment-slips.sql ใน Supabase ก่อน";
  }
  return "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

function currentUser() {
  return window.OlafStore.currentUser();
}

function visibleOrders() {
  const user = currentUser();
  if (!user) return [];
  return orderRows;
}

async function loadOrders() {
  ordersError = "";
  const user = currentUser();
  if (!user) {
    orderRows = [];
    return;
  }

  try {
    if (!window.OlafOrders?.fetchMyOrders) throw new Error("Supabase order client is not ready");
    orderRows = await window.OlafOrders.fetchMyOrders();
  } catch (error) {
    console.error("Orders unavailable", error);
    ordersError = "ไม่สามารถโหลดคำสั่งซื้อจาก Supabase ได้ กรุณาลองใหม่อีกครั้ง";
    orderRows = [];
  }
}



function renderUserPopover() {
  const popover = document.querySelector("#user-popover");
  const user = currentUser();
  if (!popover || !user) return;
  
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
  createIconSet();
  
  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    await window.OlafStore.logout();
    closeUserPopover();
    showToast("ออกจากระบบแล้ว", "info");
    setTimeout(() => location.reload(), 800);
  });
}


function openUserPopover() {
  const popover = document.querySelector("#user-popover");
  if (!popover) return;
  if (!popover.innerHTML.trim()) renderUserPopover();
  popover.hidden = false;
  document.querySelector("#open-auth")?.classList.add("is-active");
}

function closeUserPopover() {
  const popover = document.querySelector("#user-popover");
  if (popover) popover.hidden = true;
  document.querySelector("#open-auth")?.classList.remove("is-active");
}

function render() {
  const user = currentUser();
  const accountLabelEl = $("#account-label");
  if (accountLabelEl) {
    accountLabelEl.textContent = user
      ? user.displayName || user.username
      : chromeText[currentLang]?.signIn || chromeText.th.signIn;
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
      if (window.lucide) window.lucide.createIcons();
    } else {
      authIcon.setAttribute("data-lucide", newIcon);
    }
  }
  
  if (user && document.querySelector("#user-popover") && !document.querySelector("#user-popover").innerHTML.trim()) {
      // Setup popover on first render if missing
      renderUserPopover();
  }
  applyLanguageChrome();
  const orders = visibleOrders();
  if (!currentOrderId && orders[0]) currentOrderId = orders[0].id;

  if (!user) {
    $("#orders-list").innerHTML = `<div class="empty-state"><i data-lucide="lock"></i><h3>กรุณาเข้าสู่ระบบ</h3><p>เข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ</p><a class="primary-button" href="login.html?return=orders.html">เข้าสู่ระบบ</a></div>`;
    $("#order-detail-panel").innerHTML = "";
    createIconSet();
    hydrateImages();
    return;
  }

  if (ordersError) {
    $("#orders-list").innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>โหลดคำสั่งซื้อไม่สำเร็จ</h3><p>${escapeHtml(ordersError)}</p></div>`;
    $("#order-detail-panel").innerHTML = "";
    createIconSet();
    hydrateImages();
    return;
  }

  $("#orders-list").innerHTML = orders.length
    ? orders
        .map(
          (order) => {
            const firstItem = order.items[0];
            const thumbUrl = firstItem?.productImageUrl || firstItem?.image || "";
            const thumbHtml = thumbUrl ? `<img ${fastImg(thumbUrl, "Product thumbnail", { className: "order-thumb" })}>` : `<div class="order-thumb placeholder"><i data-lucide="package"></i></div>`;
            return `
            <button class="order-list-item ${order.id === currentOrderId ? "is-active" : ""}" type="button" data-order-id="${escapeHtml(order.id)}">
              ${thumbHtml}
              <div class="order-list-info">
                <strong>${escapeHtml(order.orderNumber || order.id)}</strong>
                <span>${new Date(order.createdAt).toLocaleString("th-TH")}</span>
              </div>
              <span class="stock-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span>
            </button>
            `;
          }
        )
        .join("")
    : `<div class="empty-state"><i data-lucide="package-search"></i><h3>ยังไม่มีคำสั่งซื้อ</h3><p>เริ่มสั่งซื้อจากหน้ารายละเอียดสินค้า</p></div>`;

  const order = orders.find((item) => item.id === currentOrderId) || orders[0];
  $("#order-detail-panel").innerHTML = order ? renderOrderDetail(order) : "";
  createIconSet();
  hydrateImages();
}

function createPromptPayUrl(amount) {
  const payment = globalPayload?.store?.payment ?? {};
  const promptPayId = payment.promptPayId || globalPayload?.store?.promptPayId || "0812345678";
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
  const payment = globalPayload?.store?.payment ?? {};
  if (channel?.qrUrl) return channel.qrUrl;
  if (method === "wallet") return payment.trueMoneyQrUrl || "";
  return payment.manualQrUrl || "";
}

function renderOrderItemPackage(item) {
  const title = item.packageTitle || item.packageSnapshot?.title || "";
  const subtitle = item.packageSubtitle || item.packageSnapshot?.subtitle || "";
  if (!title) return "";
  return `
    <span class="order-package-line">แพ็คเกจ: ${escapeHtml(title)}</span>
    ${subtitle ? `<span class="order-package-subline">${escapeHtml(subtitle)}</span>` : ""}
  `;
}

function renderPaymentAccountBlock(payment = {}) {
  const rows = [
    payment.bankName ? ["ธนาคาร", payment.bankName] : null,
    payment.bankAccountNumber ? ["เลขบัญชี", payment.bankAccountNumber] : null,
    payment.bankAccountName ? ["ชื่อบัญชี", payment.bankAccountName] : null,
    payment.walletName ? ["Wallet", payment.walletName] : null
  ].filter(Boolean);

  if (!rows.length && !payment.paymentNote) return "";

  return `
    <div class="payment-account-block order-payment-account">
      <div class="payment-account-header">
        <i data-lucide="building-2"></i>
        <span>ข้อมูลรับชำระเงิน</span>
      </div>
      ${rows.map(([label, value]) => `<div class="payment-account-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      ${payment.paymentNote ? `<div class="payment-account-note"><i data-lucide="info"></i>${escapeHtml(payment.paymentNote)}</div>` : ""}
    </div>
  `;
}

function renderPaymentSlipBlock(order) {
  const locked = order.status !== "awaiting_payment";
  const slipPreview = order.paymentSlipUrl
    ? `
      <div class="payment-slip-preview">
        <p>สลิปที่แนบแล้ว</p>
        <img ${fastImg(order.paymentSlipUrl, "Payment slip")} />
      </div>
    `
    : "";

  const uploadForm = locked
    ? `<div class="payment-slip-note"><i data-lucide="lock"></i><span>ออเดอร์นี้ผ่านขั้นตอนตรวจสลิปแล้ว ไม่สามารถแก้ไขสลิปได้</span></div>`
    : `
      <form class="payment-slip-form" data-slip-form="${escapeHtml(order.id)}">
        <label class="payment-slip-picker">
          <i data-lucide="image-plus"></i>
          <span data-slip-file-label>เลือกไฟล์สลิป</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" data-slip-file />
        </label>
        <button class="primary-button" type="submit">
          <i data-lucide="upload-cloud"></i>
          ส่งสลิปให้แอดมินตรวจ
        </button>
      </form>
    `;

  return `
    <div class="order-slip-block">
      <div class="order-slip-heading">
        <div>
          <p class="eyebrow">Payment Slip</p>
          <h3>แนบสลิปชำระเงิน</h3>
        </div>
        <span class="stock-pill ${order.paymentSlipPath ? "in-stock" : "low-stock"}">${order.paymentSlipPath ? "แนบแล้ว" : "รอสลิป"}</span>
      </div>
      ${slipPreview}
      ${uploadForm}
    </div>
  `;
}

function renderPaymentBlock(order) {
  const payment = globalPayload?.store?.payment ?? {};
  const qrUrl = paymentQrForOrder(order);

  return `
    <div class="order-payment-block">
      <div class="order-payment-grid">
        <div class="order-payment-qr-card">
          <p class="eyebrow">Manual Payment</p>
          ${qrUrl ? `<img ${fastImg(qrUrl, "Payment QR", { priority: true })} />` : `<div class="qr-placeholder"><i data-lucide="qr-code"></i></div>`}
          <strong>${formatPrice(order.total)}</strong>
        </div>
        <div class="order-payment-detail">
          <h3>ชำระเงินตาม QR หรือบัญชีที่กำหนด</h3>
          <p>หลังโอนแล้วแนบสลิปในช่องด้านล่าง แอดมินจะตรวจสอบเองจากหลังบ้านและอัปเดตสถานะให้</p>
          ${renderPaymentAccountBlock(payment)}
          ${renderPaymentSlipBlock(order)}
        </div>
      </div>
    </div>
  `;
}

function renderOrderDetail(order) {
  const items = order.items
    .map(
      (item) => {
        const thumbUrl = item.productImageUrl || item.image || "";
        const itemName = item.productName || item.name || "";
        const thumbHtml = thumbUrl ? `<img ${fastImg(thumbUrl, itemName, { className: "item-thumb" })}>` : `<div class="item-thumb placeholder"><i data-lucide="package"></i></div>`;
        return `
        <div class="dashboard-row item-row">
          ${thumbHtml}
          <div class="item-details">
            <strong>${escapeHtml(itemName)}</strong>
            ${renderOrderItemPackage(item)}
            <span>${item.quantity} x ${formatPrice(item.unitPrice)}</span>
          </div>
          <b>${formatPrice(item.lineTotal)}</b>
        </div>
        `;
      }
    )
    .join("");
  return `
    <section class="dashboard-panel order-focus clean-order-panel">
        <div class="order-header-main">
        <div>
          <p class="eyebrow">Order Detail</p>
          <h2>${escapeHtml(order.orderNumber || order.id)}</h2>
        </div>
        <span class="stock-pill ${statusClass(order.status)}">${statusLabel(order.status)}</span>
      </div>
      
      <div class="order-timeline clean-timeline">
        <div class="${order.status ? "is-done" : ""}"><i data-lucide="receipt"></i><span>สร้างออเดอร์</span></div>
        <div class="${["confirmed", "delivered"].includes(order.status) ? "is-done" : ""}"><i data-lucide="shield-check"></i><span>แอดมินยืนยัน</span></div>
        <div class="${order.status === "delivered" ? "is-done" : ""}"><i data-lucide="send"></i><span>จัดส่งสินค้า</span></div>
      </div>
      
      <div class="order-items-list">
        ${items}
      </div>
      
      <div class="order-summary clean-summary">
        <div><span>ผู้สั่งซื้อ</span><strong>${escapeHtml(order.customerName)}</strong></div>
        <div><span>ช่องทางติดต่อ</span><strong>${escapeHtml(order.customerEmail || order.contact)}</strong></div>
        <div class="total-row"><span>ยอดชำระ</span><strong class="total-price">${formatPrice(order.total)}</strong></div>
      </div>
      
      ${
        order.deliveryNote
          ? `<div class="delivery-note highlight-note"><h3><i data-lucide="mail-open"></i> ข้อมูลจัดส่ง (รับสินค้า)</h3><p class="pre-wrap">${escapeHtml(order.deliveryNote)}</p></div>`
          : `<div class="delivery-note waiting-note"><h3><i data-lucide="clock"></i> กำลังรอจัดส่ง</h3><p>แอดมินจะอัปเดตข้อมูลจัดส่งหลังตรวจสอบสลิป</p></div>`
      }

      ${renderPaymentBlock(order)}

      <div style="margin-top: 16px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px dashed rgba(59, 130, 246, 0.3);">
        <a href="https://www.facebook.com/byOlafshop" target="_blank" rel="noreferrer" class="primary-button" style="width: 100%; text-decoration: none;">
          <i data-lucide="facebook"></i> ติดต่อเพจ
        </a>
        <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); text-align: center;">หากมีข้อสงสัยหรือต้องการความช่วยเหลือเพิ่มเติม</p>
      </div>
      <div class="order-action-buttons" style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
        ${!["cancelled", "expired", "delivered", "confirmed"].includes(order.status) ? `
          <button class="secondary-button" type="button" data-cancel-order="${escapeHtml(order.id)}" style="flex:1; border-color: rgba(239,68,68,0.4); color: #f87171;">
            <i data-lucide="x-circle"></i> ยกเลิกออเดอร์
          </button>
        ` : ""}
        ${order.paymentSlipUrl ? `
          <div style="width:100%; margin-top:4px;">
            <p style="font-size:0.82rem; color:var(--muted); margin-bottom:8px;">สลิปที่แนบ</p>
            <img ${fastImg(order.paymentSlipUrl, "Payment slip")} style="max-width:200px; border-radius:10px; border:1px solid var(--border);" />
          </div>
        ` : `
          <div style="width:100%; margin-top:4px; padding:12px; border:1px dashed rgba(148,163,184,0.28); border-radius:10px; color:var(--muted); font-size:0.86rem;">
            ระบบแนบสลิปผ่าน Supabase Storage ยังไม่เปิดใช้งาน กรุณาติดต่อแอดมินและห้ามส่งสลิปผ่าน localStorage
          </div>
        `}
      </div>
    </section>
  `;
}


document.addEventListener("DOMContentLoaded", async () => {
  const authReady = window.OlafStore?.ready?.catch((error) => {
    console.warn("Auth initialization delayed", error);
    return null;
  });
  const chromeReady = loadStoreChrome().catch((error) => {
    console.warn("Store chrome unavailable for orders page", error);
  });
  render();
  await Promise.all([authReady, chromeReady]);
  await loadOrders();
  render();
  $("#orders-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-id]");
    if (!button) return;
    currentOrderId = button.dataset.orderId;
    render();
  });

  // Handle slip upload and cancel actions
  document.body.addEventListener("click", async (event) => {
    // Cancel order button
    const cancelBtn = event.target.closest("[data-cancel-order]");
    if (cancelBtn) {
      const orderId = cancelBtn.dataset.cancelOrder;
      const orders = visibleOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      if (order.status === "delivered" || order.status === "confirmed") {
        showToast("ไม่สามารถยกเลิกออเดอร์ที่ยืนยันแล้วได้", "error");
        return;
      }
      
      const dialog = document.getElementById("cancel-confirm-dialog");
      if (dialog) {
        const yesBtn = document.getElementById("cancel-yes-btn");
        const noBtn = document.getElementById("cancel-no-btn");
        
        // Remove old listeners by replacing nodes
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        const newNoBtn = noBtn.cloneNode(true);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);
        
        newYesBtn.addEventListener("click", async () => {
          try {
            await window.OlafOrders.cancelMyOrder(orderId);
            showToast("ยกเลิกออเดอร์เรียบร้อยแล้ว", "cancel", 4000);
            dialog.close();
            await loadOrders();
            render();
          } catch (error) {
            showToast("ยกเลิกออเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
          }
        });
        
        newNoBtn.addEventListener("click", () => {
          dialog.close();
        });
        
        createIconSet();
        dialog.showModal();
      } else {
        if (confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกออเดอร์นี้?")) {
          try {
            await window.OlafOrders.cancelMyOrder(orderId);
            showToast("ยกเลิกออเดอร์เรียบร้อยแล้ว", "cancel", 4000);
            await loadOrders();
            render();
          } catch (error) {
            showToast("ยกเลิกออเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
          }
        }
      }
      return;
    }
  });

  document.body.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-slip-form]");
    if (!form) return;
    event.preventDefault();

    const orderId = form.dataset.slipForm;
    const input = form.querySelector("[data-slip-file]");
    const file = input?.files?.[0];
    if (!file) {
      showToast("กรุณาเลือกไฟล์สลิปก่อนส่งให้แอดมินตรวจ", "warning");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalHtml = submitButton?.innerHTML || "";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i data-lucide="loader-circle"></i> กำลังอัปโหลด...';
      createIconSet();
    }

    try {
      if (!window.OlafOrders?.uploadPaymentSlip) throw new Error("Slip upload client is not ready");
      await window.OlafOrders.uploadPaymentSlip({ orderId, file });
      showToast("แนบสลิปแล้ว รอแอดมินตรวจสอบ", "payment", 4500);
      await loadOrders();
      currentOrderId = orderId;
      render();
    } catch (error) {
      console.error("Payment slip upload failed", error);
      showToast(slipUploadErrorMessage(error), "error", 5500);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalHtml;
        createIconSet();
      }
    }
  });

  document.body.addEventListener("change", (event) => {
    const input = event.target.closest("[data-slip-file]");
    if (!input) return;
    const label = input.closest("[data-slip-form]")?.querySelector("[data-slip-file-label]");
    if (label) label.textContent = input.files?.[0]?.name || "เลือกไฟล์สลิป";
  });

  $("#lang-toggle").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLanguageMenu();
  });
  $("#language-popover").addEventListener("click", (event) => {
    event.stopPropagation();
    const button = event.target.closest("[data-lang-option]");
    if (button) selectLanguage(button.dataset.langOption);
  });
  $("#open-notifications")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNotificationMenu();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".language-switcher")) closeLanguageMenu();
    if (!event.target.closest(".notification-wrap")) closeNotificationMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLanguageMenu();
      closeNotificationMenu();
      closeUserPopover();
    }
  });

  $("#open-auth")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeNotificationMenu();
    const user = currentUser();
    if (user) {
      const popover = document.querySelector("#user-popover");
      if (popover && !popover.hidden) {
        closeUserPopover();
      } else {
        openUserPopover();
      }
    } else {
      location.href = "login.html?return=orders.html";
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user-popover-wrap")) closeUserPopover();
  });

  $("#open-contact")?.addEventListener("click", (event) => {
    event.preventDefault();
    $("#contact-dialog")?.showModal();
    createIconSet();
  });
  $("#close-contact")?.addEventListener("click", () => $("#contact-dialog")?.close());

  render();
});
