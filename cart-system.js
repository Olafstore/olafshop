(function () {
  const STORAGE_KEY = "olafshop_cart_v2";
  const CART_DIALOG_ID = "site-cart-dialog";
  const CART_BUTTON_ID = "site-cart-button";
  const CART_BADGE_ID = "site-cart-count";
  let pointState = { balance: 0, enabled: false, pointsToUse: 0 };
  let pendingOrder = null;
  let storeSettingsPromise = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const money = (value) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const point = (value) =>
    new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Math.floor(Number(value) || 0));

  function escapeHtml(value = "") {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cleanItems(items) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => ({
        productId: String(item.productId || item.product_id || item.id || "").trim(),
        packageId: item.packageId || item.package_id || null,
        name: String(item.name || item.productName || "สินค้า").trim(),
        image: String(item.image || item.productImageUrl || item.product_image_url || "").trim(),
        category: String(item.category || "").trim(),
        packageTitle: String(item.packageTitle || "").trim(),
        price: Math.max(Number(item.price || item.unitPrice || 0), 0),
        stock: Math.max(Number(item.stock || 999), 0),
        quantity: Math.max(1, Math.floor(Number(item.quantity || 1)))
      }))
      .filter((item) => item.productId && item.price >= 0);
  }

  function cartKey(item) {
    return `${item.productId}::${item.packageId || ""}`;
  }

  function readCart() {
    try {
      return cleanItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch (error) {
      console.warn("Unable to read cart", error);
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanItems(items)));
    renderCartBadge();
    renderDialog();
  }

  function subtotal(items = readCart()) {
    return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  }

  function pointDiscount(items = readCart()) {
    if (!pointState.enabled) return 0;
    return Math.min(Math.max(Number(pointState.balance || 0), 0), subtotal(items));
  }

  function currentUser() {
    return window.OlafStore?.currentUser?.() || null;
  }

  function showToast(message, type = "success") {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }
    const container = $("#toast-container") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "toast-container" }));
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${type === "error" ? "alert-circle" : "check-circle"}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    window.lucide?.createIcons?.();
    setTimeout(() => {
      toast.classList.add("is-leaving");
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  function ensureCartButton() {
    const actions = $(".topbar-actions");
    if (!actions || $(`#${CART_BUTTON_ID}`)) return;

    const button = document.createElement("button");
    button.className = "icon-button site-cart-button";
    button.id = CART_BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", "เปิดตะกร้าสินค้า");
    button.innerHTML = `<i data-lucide="shopping-cart"></i><span class="site-cart-count" id="${CART_BADGE_ID}" hidden>0</span>`;

    const userWrap = actions.querySelector(".user-popover-wrap");
    const language = actions.querySelector(".language-switcher");
    if (userWrap) {
      userWrap.classList.add("site-user-divider");
      actions.insertBefore(button, userWrap);
    } else if (language?.nextSibling) {
      actions.insertBefore(button, language.nextSibling);
    } else {
      actions.appendChild(button);
    }

    button.addEventListener("click", openCart);
    window.lucide?.createIcons?.();
  }

  function ensureDialog() {
    let dialog = $(`#${CART_DIALOG_ID}`);
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "site-cart-dialog";
    dialog.id = CART_DIALOG_ID;
    dialog.setAttribute("aria-label", "ตะกร้าสินค้า");
    dialog.innerHTML = `
      <div class="site-cart-shell">
        <div class="site-cart-head">
          <div class="site-cart-title-wrap">
            <span class="site-cart-icon-bubble"><i data-lucide="shopping-bag"></i></span>
            <div>
              <p class="eyebrow">OLAF CART</p>
              <h2>ตะกร้าสินค้า</h2>
              <span data-cart-head-note>รวมสินค้า ใช้ Point ลดราคา และชำระผ่านระบบเดิมได้ในรายการเดียว</span>
            </div>
          </div>
          <button class="dialog-close" type="button" data-site-cart-close aria-label="ปิดตะกร้า">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="site-cart-body">
          <section class="site-cart-items-panel">
            <div class="site-cart-section-head">
              <div>
                <strong>รายการสินค้า</strong>
                <span>ตรวจจำนวนและแพ็คเกจก่อนสร้างคำสั่งซื้อ</span>
              </div>
              <em data-site-cart-count-label>0 รายการ</em>
            </div>
            <div class="site-cart-items" data-site-cart-items></div>
          </section>
          <aside class="site-cart-summary">
            <div class="site-cart-summary-card">
              <div class="site-cart-summary-head">
                <span class="site-cart-summary-icon"><i data-lucide="receipt-text"></i></span>
                <div>
                  <strong>สรุปคำสั่งซื้อ</strong>
                  <small>Point จะหักตอนกดสร้างคำสั่งซื้อ</small>
                </div>
              </div>
              <div class="site-cart-summary-row"><span>ยอดสินค้า</span><strong data-site-cart-subtotal>฿0</strong></div>
              <label class="site-cart-points" data-site-cart-points hidden>
                <input type="checkbox" data-site-cart-use-points />
                <span><i data-lucide="coins"></i></span>
                <span class="site-cart-points-copy">
                  <b>ใช้ Point ลดราคา</b>
                  <small>คงเหลือ <em data-site-cart-point-balance>0</em> Point</small>
                </span>
                <i class="site-cart-points-check" data-lucide="check"></i>
              </label>
              <div class="site-cart-summary-row"><span>ส่วนลด Point</span><strong data-site-cart-point-discount>-฿0</strong></div>
              <div class="site-cart-summary-row total-line"><span>ยอดชำระ</span><strong data-site-cart-total>฿0</strong></div>
              <div class="site-cart-payment" data-site-cart-payment>
                <span class="site-cart-payment-title">ช่องทางชำระเงิน</span>
                <div class="site-cart-payment-grid">
                  <label>
                    <input type="radio" name="siteCartPayment" value="promptpay" checked />
                    <span><i data-lucide="qr-code"></i><b>PromptPay QR</b><small>แอปธนาคาร</small></span>
                  </label>
                  <label>
                    <input type="radio" name="siteCartPayment" value="wallet" />
                    <span><i data-lucide="wallet"></i><b>Wallet</b><small>TrueMoney</small></span>
                  </label>
                </div>
              </div>
              <div class="site-cart-action-row">
                <button class="primary-button site-cart-checkout" type="button" data-site-cart-checkout>
                  <i data-lucide="receipt"></i>
                  สร้างคำสั่งซื้อ
                </button>
                <button class="secondary-button site-cart-continue" type="button" data-site-cart-close>
                  เลือกสินค้าต่อ
                </button>
              </div>
              <p class="site-cart-note">Offline จะจัดส่งอัตโนมัติหลังสลิปผ่าน ส่วนสินค้าอื่นรอแอดมินจัดส่ง</p>
            </div>
            <div class="site-cart-payment-result" data-site-cart-payment-result hidden></div>
          </aside>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-site-cart-close]")) dialog.close();
      const remove = event.target.closest("[data-site-cart-remove]");
      const increase = event.target.closest("[data-site-cart-increase]");
      const decrease = event.target.closest("[data-site-cart-decrease]");
      if (remove) updateQuantity(remove.dataset.siteCartRemove, 0);
      if (increase) updateQuantity(increase.dataset.siteCartIncrease, Number(increase.dataset.quantity || 1) + 1);
      if (decrease) updateQuantity(decrease.dataset.siteCartDecrease, Number(decrease.dataset.quantity || 1) - 1);
      if (event.target.closest("[data-site-cart-checkout]")) checkout();
      if (event.target.closest("[data-site-cart-upload]")) openSlipPicker();
      if (event.target.closest("[data-site-cart-profile]")) window.location.href = "profile.html#inventory";
    });

    dialog.addEventListener("change", (event) => {
      if (event.target.matches("[data-site-cart-use-points]")) {
        pointState.enabled = event.target.checked;
        renderDialog();
      }
    });

    window.lucide?.createIcons?.();
    return dialog;
  }

  function renderCartBadge() {
    const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
    const badge = $(`#${CART_BADGE_ID}`);
    if (!badge) return;
    badge.textContent = count.toLocaleString("th-TH");
    badge.hidden = count <= 0;
  }

  function renderDialog() {
    const dialog = ensureDialog();
    const items = readCart();
    const list = $("[data-site-cart-items]", dialog);
    const sub = subtotal(items);
    const discount = pointDiscount(items);
    const total = Math.max(sub - discount, 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    if (!list) return;
    const countLabel = $("[data-site-cart-count-label]", dialog);
    if (countLabel) countLabel.textContent = `${point(count)} รายการ`;
    if (!items.length) {
      list.innerHTML = `
        <div class="site-cart-empty">
          <i data-lucide="shopping-bag"></i>
          <h3>ตะกร้ายังว่าง</h3>
          <p>เพิ่มสินค้าจากหน้ารายละเอียดสินค้าเพื่อสร้างคำสั่งซื้อรวม</p>
        </div>
      `;
    } else {
      list.innerHTML = items.map((item) => {
        const key = cartKey(item);
        return `
          <article class="site-cart-item">
            <div class="site-cart-item-media">
              <img src="${escapeHtml(item.image || "https://placehold.co/160x90/0f172a/93c5fd?text=OLAF")}" alt="" loading="lazy" />
            </div>
            <div class="site-cart-item-main">
              <h3>${escapeHtml(item.name)}</h3>
              <p>${escapeHtml(item.packageTitle || item.category || "สินค้า")}</p>
              <div class="site-cart-item-meta">
                <span>${money(item.price)} / ชิ้น</span>
                <span>สต็อก ${point(item.stock || 0)}</span>
              </div>
              <strong>${money(item.price * item.quantity)}</strong>
            </div>
            <div class="site-cart-item-actions">
              <div class="site-cart-qty-control">
                <button type="button" class="quantity-button" data-site-cart-decrease="${escapeHtml(key)}" data-quantity="${item.quantity}" aria-label="ลดจำนวน"><i data-lucide="minus"></i></button>
                <span>${item.quantity}</span>
                <button type="button" class="quantity-button" data-site-cart-increase="${escapeHtml(key)}" data-quantity="${item.quantity}" aria-label="เพิ่มจำนวน"><i data-lucide="plus"></i></button>
              </div>
              <button type="button" class="site-cart-remove" data-site-cart-remove="${escapeHtml(key)}" aria-label="ลบสินค้า"><i data-lucide="trash-2"></i><span>ลบ</span></button>
            </div>
          </article>
        `;
      }).join("");
    }

    const pointsCard = $("[data-site-cart-points]", dialog);
    const pointInput = $("[data-site-cart-use-points]", dialog);
    if (pointsCard) pointsCard.hidden = !(pointState.balance > 0 && sub > 0);
    if (pointInput) pointInput.checked = Boolean(pointState.enabled && pointState.balance > 0);
    if (pointsCard) pointsCard.classList.toggle("is-active", Boolean(pointState.enabled && discount > 0));
    const payment = $("[data-site-cart-payment]", dialog);
    if (payment) payment.hidden = total <= 0 && discount > 0;
    $("[data-site-cart-subtotal]", dialog).textContent = money(sub);
    $("[data-site-cart-point-balance]", dialog).textContent = point(pointState.balance);
    $("[data-site-cart-point-discount]", dialog).textContent = `-${money(discount)}`;
    $("[data-site-cart-total]", dialog).textContent = money(total);
    window.lucide?.createIcons?.();
  }

  async function hydratePoints() {
    if (!window.OlafOrders?.fetchPointBalance || !currentUser()) {
      pointState.balance = 0;
      pointState.enabled = false;
      renderDialog();
      return;
    }
    try {
      const wallet = await window.OlafOrders.fetchPointBalance();
      pointState.balance = Number(wallet?.balance || 0);
    } catch (error) {
      console.warn("Unable to load cart point balance", error);
      pointState.balance = 0;
    }
    renderDialog();
  }

  function add(item) {
    const next = cleanItems([item])[0];
    if (!next) return;
    const items = readCart();
    const key = cartKey(next);
    const found = items.find((entry) => cartKey(entry) === key);
    if (found) {
      found.quantity = Math.min(Math.max(found.stock || 999, 1), found.quantity + next.quantity);
      if (next.price) found.price = next.price;
      if (next.name) found.name = next.name;
      if (next.image) found.image = next.image;
      if (next.packageTitle) found.packageTitle = next.packageTitle;
    } else {
      items.push(next);
    }
    writeCart(items);
    showToast(`เพิ่ม "${next.name}" ลงตะกร้าแล้ว`, "success");
  }

  function updateQuantity(key, quantity) {
    const items = readCart();
    const next = items
      .map((item) => cartKey(item) === key ? { ...item, quantity: Math.max(0, Math.floor(Number(quantity || 0))) } : item)
      .filter((item) => item.quantity > 0);
    writeCart(next);
  }

  async function storeSettings() {
    if (!storeSettingsPromise) {
      storeSettingsPromise = window.OlafStoreSettings?.fetchStoreSettings?.().catch(() => ({})) || Promise.resolve({});
    }
    return storeSettingsPromise;
  }

  function promptPayQr(promptPayId, amount) {
    const id = String(promptPayId || "").trim();
    if (!id) return "";
    return `https://promptpay.io/${encodeURIComponent(id)}/${Math.max(1, Number(amount || 0)).toFixed(2)}.png`;
  }

  async function paymentQr(order) {
    const settings = await storeSettings();
    const payment = settings?.payment || {};
    if (order.paymentMethod === "wallet") return payment.trueMoneyQrUrl || payment.manualQrUrl || "";
    return payment.manualQrUrl || promptPayQr(payment.promptPayId || settings.promptPayId, order.total);
  }

  function orderRef(order) {
    return order?.orderNumber || order?.order_number || order?.id || "";
  }

  async function showPayment(order) {
    pendingOrder = order;
    const dialog = ensureDialog();
    const box = $("[data-site-cart-payment-result]", dialog);
    if (!box) return;
    const qr = await paymentQr(order);
    box.hidden = false;
    box.innerHTML = `
      <div class="site-cart-paid-head">
        <i data-lucide="scan-line"></i>
        <div>
          <strong>ชำระเงินคำสั่งซื้อ ${escapeHtml(orderRef(order))}</strong>
          <span>ยอดชำระ ${money(order.total)}</span>
        </div>
      </div>
      ${qr ? `<img class="site-cart-qr" src="${escapeHtml(qr)}" alt="QR สำหรับชำระเงิน" />` : `<div class="site-cart-noqr">ยังไม่พบ QR สำหรับช่องทางนี้</div>`}
      <div class="site-cart-result-actions">
        <button class="primary-button" type="button" data-site-cart-upload><i data-lucide="upload"></i>แนบสลิป</button>
        <button class="secondary-button" type="button" data-site-cart-profile><i data-lucide="package"></i>ไปคลังสินค้า</button>
      </div>
    `;
    window.lucide?.createIcons?.();
  }

  function checkoutErrorMessage(error) {
    const message = String(error?.message || error?.code || "");
    if (message.includes("AUTH_REQUIRED")) return "กรุณาเข้าสู่ระบบก่อนสร้างคำสั่งซื้อ";
    if (message.includes("POINT_BALANCE_INSUFFICIENT")) return "Point คงเหลือไม่พอ กรุณารีเฟรชแล้วลองใหม่";
    if (message.includes("INSUFFICIENT_STOCK")) return "สินค้าบางรายการสต็อกไม่พอ กรุณาปรับตะกร้า";
    if (message.includes("create_cart_order")) return "ยังไม่ได้รัน SQL ระบบตะกร้า กรุณารัน supabase-cart-order.sql ก่อน";
    return "ไม่สามารถสร้างคำสั่งซื้อจากตะกร้าได้ กรุณาลองใหม่";
  }

  async function checkout() {
    const items = readCart();
    if (!items.length) {
      showToast("กรุณาเพิ่มสินค้าก่อน", "warning");
      return;
    }

    await window.OlafStore?.ready?.catch(() => null);
    const user = currentUser();
    if (!user) {
      const returnPath = `${location.pathname.split("/").pop() || "index.html"}${location.search}${location.hash}`;
      location.href = `login.html?return=${encodeURIComponent(returnPath)}`;
      return;
    }

    if (!window.OlafOrders?.createCartOrder) {
      showToast("ระบบตะกร้ายังไม่พร้อม กรุณารีเฟรชหน้าเว็บ", "error");
      return;
    }

    const dialog = ensureDialog();
    const button = $("[data-site-cart-checkout]", dialog);
    const original = button?.innerHTML || "";
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i data-lucide="loader-circle"></i> กำลังสร้างคำสั่งซื้อ...';
      window.lucide?.createIcons?.();
    }

    try {
      const paymentMethod = $("input[name='siteCartPayment']:checked", dialog)?.value || "promptpay";
      const order = await window.OlafOrders.createCartOrder({
        items,
        paymentMethod,
        customerName: user.displayName || user.username || "",
        pointsToUse: pointDiscount(items)
      });
      writeCart([]);
      await hydratePoints();
      if (Number(order?.total || 0) <= 0 || order?.paymentStatus === "verified") {
        showToast(order?.status === "delivered" ? "ใช้ Point ซื้อสำเร็จและจัดส่ง Offline แล้ว" : "ใช้ Point ซื้อสำเร็จ รอแอดมินจัดส่ง");
        setTimeout(() => { location.href = `profile.html?order=${encodeURIComponent(order.id)}#inventory`; }, 800);
        return;
      }
      showToast("สร้างคำสั่งซื้อแล้ว กรุณาชำระเงินและแนบสลิป", "payment");
      await showPayment(order);
    } catch (error) {
      console.error(error);
      showToast(checkoutErrorMessage(error), "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
        window.lucide?.createIcons?.();
      }
    }
  }

  let slipInput = null;
  function openSlipPicker() {
    if (!pendingOrder?.id) return;
    if (!slipInput) {
      slipInput = document.createElement("input");
      slipInput.type = "file";
      slipInput.accept = "image/png,image/jpeg,image/webp";
      slipInput.hidden = true;
      slipInput.addEventListener("change", uploadSlip);
      document.body.appendChild(slipInput);
    }
    slipInput.value = "";
    slipInput.click();
  }

  async function uploadSlip(event) {
    const file = event.target.files?.[0];
    if (!file || !pendingOrder?.id) return;
    try {
      if (!window.OlafOrders?.uploadPaymentSlip) throw new Error("Slip upload client is not ready");
      const verified = await window.OlafOrders.uploadPaymentSlip(pendingOrder.id, file);
      if (Number(verified?.pointCreditAmount || 0) > 0) {
        showToast(`ตรวจสลิปแล้ว ส่วนเกิน ${money(verified.pointCreditAmount)} ถูกแปลงเป็น Point`);
      } else {
        showToast(verified?.status === "delivered" ? "ตรวจสลิปแล้วและจัดส่ง Offline แล้ว" : "ตรวจสลิปแล้ว รอแอดมินจัดส่ง");
      }
      setTimeout(() => { location.href = `profile.html?order=${encodeURIComponent(pendingOrder.id)}#inventory`; }, 900);
    } catch (error) {
      console.error(error);
      const code = String(error?.code || error?.message || "");
      if (code.includes("PAYMENT_AMOUNT_INSUFFICIENT")) {
        showToast("จำนวนเงินไม่เพียงพอ ยอดที่ชำระถูกแปลงเป็น Point แล้ว", "error");
        setTimeout(() => { location.href = "profile.html#info"; }, 1200);
      } else {
        showToast("ตรวจสลิปไม่สำเร็จ กรุณาลองใหม่หรือไปแนบในหน้าคลังสินค้า", "error");
      }
    }
  }

  async function openCart() {
    ensureDialog();
    renderDialog();
    await hydratePoints();
    const dialog = ensureDialog();
    if (!dialog.open) dialog.showModal();
    window.lucide?.createIcons?.();
  }

  function init() {
    ensureCartButton();
    ensureDialog();
    renderCartBadge();
    renderDialog();
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        renderCartBadge();
        renderDialog();
      }
    });
  }

  window.OlafCart = {
    add,
    open: openCart,
    items: readCart,
    clear: () => writeCart([])
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
