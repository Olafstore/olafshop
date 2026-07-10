(function () {
  const state = {
    user: null,
    settings: null,
    order: null,
    amount: 100,
    balance: 0,
    busy: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => window.OlafText?.clean?.(value) ?? String(value || "").trim();
  const money = (value) => `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
  const point = (value) => Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(message, type = "info", icon = "info") {
    const box = $("#point-topup-status");
    if (!box) return;
    box.className = `point-topup-status is-${type}`;
    box.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span>`;
    window.lucide?.createIcons?.();
  }

  function setBusy(active, label = "กำลังดำเนินการ...") {
    state.busy = active;
    const createButton = $(".point-topup-submit");
    const slipButton = $("#point-topup-slip-form button[type='submit']");
    [createButton, slipButton].forEach((button) => {
      if (!button) return;
      button.disabled = active;
      if (active) {
        button.dataset.originalHtml ||= button.innerHTML;
        button.innerHTML = `<i data-lucide="loader-circle"></i><span>${escapeHtml(label)}</span>`;
      } else if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
        delete button.dataset.originalHtml;
      }
    });
    window.lucide?.createIcons?.();
  }

  function showToast(message, type = "success") {
    if (window.showToast) return window.showToast(message, type);
    const toast = document.createElement("div");
    toast.className = `toast${type === "error" ? " toast-error" : ""}`;
    toast.innerHTML = `<i data-lucide="${type === "error" ? "alert-circle" : "check-circle"}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    window.lucide?.createIcons?.();
    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 260);
    }, 3400);
  }

  function currentPaymentMethod() {
    return String($("input[name='paymentMethod']:checked")?.value || "promptpay").toLowerCase() === "wallet"
      ? "wallet"
      : "promptpay";
  }

  function paymentLabel(method = currentPaymentMethod()) {
    return method === "wallet" ? "TrueMoney Wallet" : "PromptPay QR";
  }

  function storePayment() {
    return state.settings?.payment || {};
  }

  function createPromptPayUrl(amount) {
    const payment = storePayment();
    const promptPayId = clean(
      payment.promptPayId ||
      payment.promptpayId ||
      state.settings?.promptPayId ||
      ""
    ).replace(/[\s-]/g, "");
    if (!promptPayId) return "";
    return `https://promptpay.io/${encodeURIComponent(promptPayId)}/${Number(amount || 0).toFixed(2)}.png`;
  }

  function paymentQrUrl(order = state.order) {
    const payment = storePayment();
    const amount = Number(order?.total || state.amount || 0);
    const method = currentPaymentMethod();
    if (method === "wallet") {
      return clean(payment.trueMoneyQrUrl || payment.walletQrUrl || payment.manualQrUrl || "");
    }
    return createPromptPayUrl(amount) || clean(payment.manualQrUrl || payment.qrUrl || "");
  }

  function renderBalance() {
    $$("[data-point-topup-balance], [data-topbar-point-balance]").forEach((item) => {
      item.textContent = item.hasAttribute("data-topbar-point-balance")
        ? `${point(state.balance)} Points`
        : point(state.balance);
    });
  }

  async function loadBalance() {
    if (!window.OlafOrders?.fetchPointBalance || !state.user) return;
    try {
      const wallet = await window.OlafOrders.fetchPointBalance();
      state.balance = Number(wallet?.balance || 0);
      renderBalance();
    } catch (error) {
      console.warn("Unable to load point balance", error);
    }
  }

  function renderAuthState() {
    const loginNote = $("[data-point-topup-login]");
    const submit = $(".point-topup-submit");
    if (loginNote) loginNote.hidden = Boolean(state.user);
    if (submit) submit.disabled = !state.user || state.busy;
  }

  function accountInfoHtml() {
    const payment = storePayment();
    const method = currentPaymentMethod();
    const rows = [];
    if (method === "wallet") {
      if (payment.walletName) rows.push(["ชื่อ Wallet", payment.walletName]);
    } else {
      if (payment.bankName) rows.push(["ธนาคาร", payment.bankName]);
      if (payment.bankAccountNumber) rows.push(["เลขบัญชี", payment.bankAccountNumber]);
      if (payment.bankAccountName) rows.push(["ชื่อบัญชี", payment.bankAccountName]);
    }
    if (payment.paymentNote) rows.push(["หมายเหตุ", payment.paymentNote]);
    if (!rows.length) return "";
    return rows.map(([label, value]) => `
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(clean(value))}</strong>
      </div>
    `).join("");
  }

  function renderPaymentPanel() {
    if (!state.order) return;
    const panel = $("#point-topup-payment");
    const qrWrap = $("[data-topup-qr-wrap]");
    if (!panel || !qrWrap) return;
    const qrUrl = paymentQrUrl(state.order);
    const total = Number(state.order.total || state.amount || 0);
    panel.hidden = false;
    panel.classList.add("is-visible");
    $("[data-topup-order-number]").textContent = state.order.orderNumber || state.order.id || "TOPUP";
    $("[data-topup-pay-total]").textContent = money(total);
    $("[data-topup-point-credit]").textContent = `${point(total)} P`;
    $("[data-topup-method-label]").textContent = paymentLabel();
    $("[data-topup-account]").innerHTML = accountInfoHtml();

    qrWrap.innerHTML = qrUrl
      ? `<img src="${escapeHtml(qrUrl)}" alt="QR สำหรับเติม Point" loading="eager" decoding="async" />`
      : `<div class="point-topup-no-qr"><i data-lucide="landmark"></i><span>ไม่พบ QR อัตโนมัติ กรุณาโอนตามข้อมูลบัญชีร้าน</span></div>`;
    window.lucide?.createIcons?.();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectedAmount() {
    const input = $("#point-topup-amount");
    const value = Math.round(Number(input?.value || state.amount || 0));
    return Math.max(1, Math.min(value, 50000));
  }

  function syncPreset(value) {
    state.amount = Number(value || selectedAmount());
    const input = $("#point-topup-amount");
    if (input) input.value = String(state.amount);
    $$("[data-topup-preset]").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.topupPreset) === state.amount);
    });
  }

  function topupErrorMessage(error) {
    const message = String(error?.code || error?.message || error || "");
    if (message.includes("AUTH_REQUIRED")) return "กรุณาเข้าสู่ระบบก่อนเติม Point";
    if (message.includes("INVALID_POINT_TOPUP_AMOUNT")) return "จำนวน Point ไม่ถูกต้อง กรุณากรอกขั้นต่ำ 1 Point";
    if (message.includes("SLIP_QR_SCANNER_NOT_READY")) return "ระบบอ่าน QR ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่";
    if (message.includes("SLIP_QR_NOT_FOUND")) return "ไม่พบ QR ในรูป กรุณาใช้ภาพสลิปต้นฉบับที่เห็น QR ชัดเจน";
    if (message.includes("INVALID_SLIP_QR")) return "QR ในรูปไม่ใช่ QR ตรวจสอบสลิปที่รองรับ";
    if (message.includes("DUPLICATE_SLIP")) return "สลิปนี้ถูกใช้ไปแล้ว กรุณาใช้สลิปใหม่";
    if (message.includes("PAYMENT_METHOD_MISMATCH")) return "สลิปไม่ตรงกับช่องทางชำระเงินที่เลือก";
    if (message.includes("RECEIVER_MISMATCH")) return "ข้อมูลผู้รับเงินในสลิปไม่ตรงกับบัญชีของร้าน";
    if (message.includes("PAYMENT_TIME_MISMATCH")) return "เวลาชำระเงินในสลิปไม่ตรงกับช่วงเวลาของรายการเติม Point";
    if (message.includes("RDCW_QUOTA_EXCEEDED")) return "โควต้าตรวจสลิปหมดหรือแพ็กเกจหมดอายุ กรุณาติดต่อแอดมิน";
    if (message.includes("RDCW_TEMPORARY_ERROR") || message.includes("PAYMENT_VERIFY_API_UNREACHABLE")) {
      return "ระบบตรวจสลิปขัดข้องชั่วคราว สลิปถูกเก็บไว้ให้แอดมินตรวจสอบ";
    }
    return "เติม Point ไม่สำเร็จ กรุณาลองใหม่";
  }

  async function handleCreateOrder(event) {
    event.preventDefault();
    if (!state.user) {
      showToast("กรุณาเข้าสู่ระบบก่อนเติม Point", "error");
      renderAuthState();
      return;
    }
    if (!window.OlafOrders?.createPointTopupOrder) {
      showToast("ระบบเติม Point ยังไม่พร้อม กรุณารัน SQL ล่าสุดก่อน", "error");
      return;
    }

    try {
      setBusy(true, "กำลังสร้างรายการ...");
      state.amount = selectedAmount();
      const order = await window.OlafOrders.createPointTopupOrder({
        amount: state.amount,
        paymentMethod: currentPaymentMethod(),
        customerName: state.user.displayName || state.user.username || ""
      });
      state.order = order;
      renderPaymentPanel();
      setStatus("สร้างรายการเติม Point แล้ว กรุณาชำระเงินและแนบสลิป", "info", "qr-code");
      showToast("สร้างรายการเติม Point สำเร็จ", "success");
    } catch (error) {
      console.error("Create point top-up order failed", error);
      setStatus(topupErrorMessage(error), "error", "alert-circle");
      showToast(topupErrorMessage(error), "error");
    } finally {
      setBusy(false);
      renderAuthState();
    }
  }

  async function handleSlipUpload(event) {
    event.preventDefault();
    const file = $("#point-topup-slip")?.files?.[0];
    if (!state.order?.id) {
      showToast("กรุณาสร้างรายการเติม Point ก่อนแนบสลิป", "error");
      return;
    }
    if (!file) {
      showToast("กรุณาเลือกไฟล์สลิปก่อนส่ง", "error");
      return;
    }

    try {
      setBusy(true, "กำลังตรวจสลิป...");
      setStatus("กำลังตรวจ QR และยืนยันสลิป กรุณารอสักครู่", "info", "loader-circle");
      const verifiedOrder = await window.OlafOrders.uploadPaymentSlip({
        orderId: state.order.id,
        file
      });
      state.order = verifiedOrder;
      await loadBalance();
      const credited = Number(verifiedOrder?.pointCreditAmount || verifiedOrder?.verification?.pointCreditAmount || state.amount || 0);
      setStatus(`เติม Point สำเร็จ ได้รับ ${point(credited)} Point เข้าบัญชีแล้ว`, "success", "badge-check");
      showToast(`เติม Point สำเร็จ +${point(credited)} Point`, "success");
      $("#point-topup-slip-form")?.reset?.();
      const label = $("[data-topup-slip-label]");
      if (label) label.textContent = "เลือกไฟล์สลิป";
    } catch (error) {
      console.error("Point top-up slip upload failed", error);
      const message = topupErrorMessage(error);
      setStatus(message, "error", "alert-circle");
      showToast(message, "error");
    } finally {
      setBusy(false);
      renderAuthState();
    }
  }

  async function init() {
    window.lucide?.createIcons?.();
    await window.OlafStore?.ready?.catch?.(() => null);
    state.user = window.OlafStore?.currentUser?.() || (await window.OlafSupabaseAuth?.getCurrentUser?.().catch(() => null));
    state.settings = await window.OlafStoreSettings?.fetchStoreSettings?.().catch(() => ({}));
    renderAuthState();
    await loadBalance();
    syncPreset(100);

    $("#point-topup-form")?.addEventListener("submit", handleCreateOrder);
    $("#point-topup-slip-form")?.addEventListener("submit", handleSlipUpload);
    $("#point-topup-slip")?.addEventListener("change", (event) => {
      const label = $("[data-topup-slip-label]");
      if (label) label.textContent = event.target.files?.[0]?.name || "เลือกไฟล์สลิป";
    });
    $$("[data-topup-preset]").forEach((button) => {
      button.addEventListener("click", () => syncPreset(button.dataset.topupPreset));
    });
    $("#point-topup-amount")?.addEventListener("input", () => syncPreset(selectedAmount()));
    $$("input[name='paymentMethod']").forEach((input) => {
      input.addEventListener("change", () => {
        if (state.order) renderPaymentPanel();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
