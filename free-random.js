(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = (value) => `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
  const clean = (value) => window.OlafText?.clean?.(value) || String(value || "");

  const state = {
    config: { settings: { dailyLimit: 5, isActive: true }, slots: [] },
    status: { dailyLimit: 5, spinsUsedToday: 0, spinsRemaining: 0 },
    spinning: false,
    user: null,
    countdownTimer: null
  };

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function prizeImage(slot) {
    return slot.imageUrl || "assets/placeholder.svg";
  }

  function availableSlots() {
    return state.config.slots.filter((slot) => {
      if (!slot.isActive) return false;
      const prizeType = slot.prizeType || "product";
      if (prizeType === "empty") return true;
      if (prizeType === "points") return Number(slot.pointAmount || 0) > 0;
      return slot.productId && slot.productIsActive && slot.stock > 0;
    });
  }

  function slotKind(slot) {
    return slot.prizeType || "product";
  }

  function slotVisualHtml(slot) {
    const kind = slotKind(slot);
    if (kind === "points") {
      return `
        <div class="free-random-card-symbol is-points">
          <i data-lucide="coins"></i>
          <strong>${Number(slot.pointAmount || 0).toLocaleString("th-TH")}</strong>
          <span>POINT</span>
        </div>
      `;
    }
    if (kind === "empty") {
      return `
        <div class="free-random-card-symbol is-empty">
          <i data-lucide="circle-slash"></i>
          <strong>เกลือ</strong>
          <span>ไว้ลุ้นรอบหน้า</span>
        </div>
      `;
    }
    return `
      <div class="free-random-card-image">
        <img src="${escapeHtml(prizeImage(slot))}" alt="${escapeHtml(clean(slot.label || slot.productName || "รางวัล"))}" loading="lazy" decoding="async" />
      </div>
    `;
  }

  function slotMeta(slot) {
    const kind = slotKind(slot);
    if (kind === "points") return `${Number(slot.pointAmount || 0).toLocaleString("th-TH")} Point · เข้าบัญชีทันที`;
    if (kind === "empty") return "ไม่ได้รับเกมหรือ Point";
    return `${clean(slot.category || "สินค้า")} · ${money(slot.price)}`;
  }

  function slotName(slot) {
    const kind = slotKind(slot);
    if (slot.label) return clean(slot.label);
    if (kind === "points") return `${Number(slot.pointAmount || 0).toLocaleString("th-TH")} Point`;
    if (kind === "empty") return "เกลือ";
    return clean(slot.productName || `ช่องที่ ${slot.slotNumber}`);
  }

  function cardHtml(slot, compact = false) {
    const name = slotName(slot);
    const kind = slotKind(slot);
    return `
      <article class="free-random-card is-${escapeHtml(kind)}${compact ? " is-compact" : ""}" data-slot-number="${slot.slotNumber}">
        ${slotVisualHtml(slot)}
        <div class="free-random-card-body">
          <span>ช่อง ${slot.slotNumber}</span>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(slotMeta(slot))}</p>
        </div>
        <strong>${Number(slot.chancePercent || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}%</strong>
      </article>
    `;
  }

  function renderTrack() {
    const track = $("#free-random-track");
    if (!track) return;
    const slots = state.config.slots.length ? state.config.slots : Array.from({ length: 10 }, (_, index) => ({
      slotNumber: index + 1,
      label: "รอตั้งค่ารางวัล",
      chancePercent: 0,
      stock: 0
    }));
    track.style.transition = "none";
    track.style.transform = "translate3d(0,0,0)";
    track.innerHTML = slots.map((slot) => cardHtml(slot, true)).join("");
  }

  function renderPrizeGrid() {
    const grid = $("#free-random-prizes");
    if (!grid) return;
    grid.innerHTML = state.config.slots.length
      ? state.config.slots.map((slot) => cardHtml(slot)).join("")
      : `<div class="free-random-empty">ยังไม่ได้ตั้งค่าของรางวัล</div>`;
  }

  function renderStatus() {
    const title = $("#free-random-title");
    const subtitle = $("#free-random-subtitle");
    const remaining = $("#free-random-remaining");
    const spinButton = $("#free-random-spin");
    const settings = state.config.settings || {};
    if (title) title.textContent = clean(settings.title || "สุ่มเกมฟรี");
    if (subtitle) subtitle.textContent = clean(settings.subtitle || "สุ่มของรางวัลฟรี วันละ 5 ครั้ง");
    if (remaining) remaining.textContent = Number(state.status.spinsRemaining ?? settings.dailyLimit ?? 5).toLocaleString("th-TH");
    if (spinButton) {
      const hasPrize = availableSlots().length > 0;
      const disabled = state.spinning || settings.isActive === false || !hasPrize || Number(state.status.spinsRemaining || 0) <= 0;
      spinButton.disabled = disabled;
      spinButton.querySelector("span").textContent = state.spinning
        ? "กำลังสุ่ม..."
        : settings.isActive === false
          ? "ระบบสุ่มปิดอยู่"
          : Number(state.status.spinsRemaining || 0) <= 0
            ? "ครบ 5 ครั้งวันนี้แล้ว"
            : "เริ่มสุ่มฟรี";
    }
    startResetCountdown();
  }

  function nextResetAt() {
    const today = String(state.status?.today || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      const reset = new Date(`${today}T00:00:00+07:00`);
      if (!Number.isNaN(reset.getTime())) {
        reset.setDate(reset.getDate() + 1);
        return reset;
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  }

  function formatDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function updateResetCountdown() {
    const label = $("#free-random-reset-countdown");
    if (!label) return;
    label.textContent = formatDuration(nextResetAt().getTime() - Date.now());
  }

  function startResetCountdown() {
    updateResetCountdown();
    if (state.countdownTimer) return;
    state.countdownTimer = window.setInterval(updateResetCountdown, 1000);
  }

  function showResult(result) {
    const panel = $("#free-random-result");
    if (!panel) return;
    const product = result.product || {};
    const prizeType = result.claim?.prizeType || result.slot?.prizeType || "product";
    const pointAmount = Number(result.pointCredit?.amount || result.claim?.pointAmount || result.slot?.pointAmount || 0);
    const name = prizeType === "points"
      ? `${pointAmount.toLocaleString("th-TH")} Point`
      : prizeType === "empty"
        ? "เกลือ!"
        : clean(product.name || result.slot?.label || "รางวัลของคุณ");
    const imageHtml = prizeType === "points"
      ? `<div class="free-random-result-symbol is-points"><i data-lucide="coins"></i><strong>${pointAmount.toLocaleString("th-TH")}</strong><span>POINT</span></div>`
      : prizeType === "empty"
        ? `<div class="free-random-result-symbol is-empty"><i data-lucide="circle-slash"></i><strong>เกลือ</strong><span>ไม่ได้รางวัลรอบนี้</span></div>`
        : `<div class="free-random-result-image"><img src="${escapeHtml(product.imageUrl || result.slot?.imageUrl || "assets/placeholder.svg")}" alt="${escapeHtml(name)}" /></div>`;
    const detail = prizeType === "points"
      ? `ระบบเติม ${pointAmount.toLocaleString("th-TH")} Point เข้าบัญชีของคุณทันทีแล้ว`
      : prizeType === "empty"
        ? "รอบนี้ยังไม่ได้เกมหรือ Point แต่ยังสามารถลุ้นต่อได้ถ้ายังเหลือจำนวนครั้งวันนี้"
        : `ระบบสร้างออเดอร์ฟรีให้แล้ว ${result.order?.status === "delivered" ? "และจัดส่งเข้าคลังเรียบร้อย" : "รอแอดมินจัดส่งตามประเภทสินค้า"}`;
    panel.hidden = false;
    panel.innerHTML = `
      <div class="free-random-result-card is-${escapeHtml(prizeType)}">
        ${imageHtml}
        <div>
          <span class="eyebrow"><i data-lucide="${prizeType === "empty" ? "circle-slash" : "trophy"}"></i> ${prizeType === "empty" ? "TRY AGAIN" : "YOU WON"}</span>
          <h2>${escapeHtml(name)}</h2>
          <p>${escapeHtml(detail)}</p>
          <div class="free-random-result-actions">
            ${prizeType === "product" ? `<a class="primary-button" href="profile.html#inventory"><i data-lucide="archive"></i> เปิดคลังสินค้า</a>` : ""}
            ${prizeType === "points" ? `<a class="primary-button" href="profile.html#info"><i data-lucide="coins"></i> เช็ค Point</a>` : ""}
            ${prizeType === "empty" ? `<button class="primary-button" type="button" data-spin-again><i data-lucide="rotate-cw"></i> สุ่มอีกครั้ง</button>` : ""}
            ${result.order?.id ? `<a class="ghost-button" href="profile.html?order=${encodeURIComponent(result.order.id)}#orders"><i data-lucide="receipt"></i> ดูออเดอร์</a>` : ""}
          </div>
        </div>
      </div>
    `;
    panel.querySelector("[data-spin-again]")?.addEventListener("click", handleSpin);
    window.lucide?.createIcons?.();
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function refreshStatus() {
    try {
      state.user = window.OlafStore?.currentUser?.() || (await window.OlafSupabaseAuth?.getCurrentUser?.());
    } catch (error) {
      state.user = null;
    }
    renderAuthHeader();
    if (!state.user) {
      state.status = { dailyLimit: state.config.settings.dailyLimit || 5, spinsUsedToday: 0, spinsRemaining: state.config.settings.dailyLimit || 5 };
      renderStatus();
      return;
    }
    try {
      state.status = await window.OlafFreeRandom.fetchStatus();
    } catch (error) {
      console.warn("Unable to load free random status", error);
    }
    renderStatus();
  }

  async function loadConfig() {
    try {
      state.config = await window.OlafFreeRandom.fetchConfig();
    } catch (error) {
      console.warn("Unable to load free random config", error);
      state.config = { settings: { dailyLimit: 5, isActive: false, title: "สุ่มเกมฟรี", subtitle: "ยังไม่ได้ตั้งค่ารางวัล" }, slots: [] };
    }
    renderTrack();
    renderPrizeGrid();
    await refreshStatus();
    window.lucide?.createIcons?.();
  }

  function animateToWinner(result) {
    const track = $("#free-random-track");
    const winnerSlot = Number(result.slot?.slotNumber || result.claim?.slotNumber || 0);
    const baseSlots = state.config.slots.length ? state.config.slots : [];
    if (!track || !baseSlots.length || !winnerSlot) return Promise.resolve();

    const repeated = [];
    for (let loop = 0; loop < 7; loop += 1) repeated.push(...baseSlots);
    const winnerIndex = repeated.findIndex((slot, index) => index > baseSlots.length * 5 && Number(slot.slotNumber) === winnerSlot);
    track.style.transition = "none";
    track.style.transform = "translate3d(0,0,0)";
    track.innerHTML = repeated.map((slot) => cardHtml(slot, true)).join("");
    const cards = $$(".free-random-card", track);
    const targetCard = cards[winnerIndex >= 0 ? winnerIndex : cards.length - 1];
    if (!targetCard) return Promise.resolve();
    const viewport = $(".free-random-viewport");
    const viewportWidth = viewport?.clientWidth || 0;
    const left = targetCard.offsetLeft - viewportWidth / 2 + targetCard.offsetWidth / 2;
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        track.style.transition = "transform 4.8s cubic-bezier(.12,.82,.12,1)";
        track.style.transform = `translate3d(${-Math.max(left, 0)}px,0,0)`;
        window.setTimeout(resolve, 5000);
      });
    });
  }

  function errorMessage(error) {
    const message = String(error?.message || error || "");
    if (message.includes("AUTH_REQUIRED")) return "กรุณาเข้าสู่ระบบก่อนสุ่มฟรี";
    if (message.includes("FREE_RANDOM_DAILY_LIMIT_REACHED")) return "วันนี้สุ่มครบจำนวนแล้ว กลับมาใหม่พรุ่งนี้นะครับ";
    if (message.includes("FREE_RANDOM_NO_AVAILABLE_PRIZES")) return "ยังไม่มีของรางวัลที่พร้อมแจก หรือสต็อกหมด";
    if (message.includes("INSUFFICIENT_STOCK")) return "ของรางวัลช่องนี้สต็อกหมดพอดี กรุณาลองใหม่อีกครั้ง";
    if (message.includes("FREE_RANDOM_DISABLED")) return "ระบบสุ่มฟรีปิดอยู่ชั่วคราว";
    return "สุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }

  function userName(user) {
    return clean(user?.displayName || user?.fullName || user?.username || user?.email?.split("@")[0] || "Member");
  }

  function userInitial(user) {
    return userName(user).trim().charAt(0).toUpperCase() || "U";
  }

  async function hydrateAuthPoint(popover) {
    const target = popover?.querySelector("[data-free-auth-points]");
    if (!target || !window.OlafOrders?.fetchPointBalance) return;
    try {
      const wallet = await window.OlafOrders.fetchPointBalance();
      target.textContent = `${Number(wallet?.balance || 0).toLocaleString("th-TH")} Points`;
    } catch (error) {
      target.textContent = "0 Points";
    }
  }

  function renderAuthHeader() {
    const button = $("#open-auth");
    const label = $("#account-label");
    const popover = $("#user-popover");
    const register = $(".register-button");
    const user = window.OlafStore?.currentUser?.() || state.user || null;
    if (!button || !label) return;

    button.classList.remove("is-auth-loading");
    button.removeAttribute("aria-busy");

    if (!user) {
      button.innerHTML = `<i data-lucide="log-in"></i><span id="account-label">เข้าสู่ระบบ</span>`;
      button.onclick = () => {
        window.location.href = `login.html?return=${encodeURIComponent("free-random.html")}`;
      };
      if (register) register.style.display = "inline-flex";
      if (popover) popover.hidden = true;
      window.lucide?.createIcons?.();
      return;
    }

    if (register) register.style.display = "none";
    button.innerHTML = `<span class="free-auth-avatar">${escapeHtml(userInitial(user))}</span><span id="account-label">${escapeHtml(userName(user))}</span>`;
    button.onclick = (event) => {
      event.stopPropagation();
      if (!popover) return;
      popover.hidden = !popover.hidden;
      if (!popover.hidden) {
        hydrateAuthPoint(popover);
        window.OlafNavigation?.positionTopbarPopover?.(popover, button);
      }
    };

    if (popover) {
      popover.innerHTML = `
        <div class="user-profile-card">
          <a class="user-popover-header user-popover-header-link" href="profile.html#info">
            <span class="user-popover-avatar">${escapeHtml(userInitial(user))}</span>
            <span class="user-popover-info">
              <strong>${escapeHtml(userName(user))}</strong>
              <span>${escapeHtml(user.email || "")}</span>
            </span>
          </a>
          <div class="user-popover-badge-row">
            <span class="user-badge-role">${escapeHtml(user.role || "member")}</span>
            <a class="user-badge-points" href="profile.html#info" data-free-auth-points data-topbar-point-balance>กำลังโหลด Point</a>
          </div>
        </div>
        <div class="user-popover-menu">
          <div class="user-popover-menu-title">หน้าหลัก</div>
          ${user.role === "admin" ? '<a href="olaf-control.html"><i data-lucide="shield"></i><span>หลังบ้าน (Admin)</span></a>' : ""}
          <a href="profile.html#info"><i data-lucide="user"></i><span>ข้อมูลส่วนตัว</span></a>
          <a href="profile.html#inventory"><i data-lucide="archive"></i><span>คลังสินค้า</span></a>
          <a href="profile.html#orders"><i data-lucide="receipt-text"></i><span>ประวัติคำสั่งซื้อ</span></a>
          <a href="free-random.html"><i data-lucide="dice-5"></i><span>สุ่มเกมฟรี</span></a>
          <div class="user-popover-divider"></div>
          <button class="danger-item" type="button" data-free-auth-logout><i data-lucide="log-out"></i><span>ออกจากระบบ</span></button>
        </div>
      `;
      popover.querySelector("[data-free-auth-logout]")?.addEventListener("click", async () => {
        await window.OlafStore?.logout?.();
        state.user = null;
        popover.hidden = true;
        window.OlafNavigation?.closeTopbarPopovers?.();
        renderAuthHeader();
        renderStatus();
      });
      hydrateAuthPoint(popover);
    }
    window.lucide?.createIcons?.();
  }

  function bindAuthHeader() {
    if (document.body.dataset.freeRandomAuthBound === "true") return;
    document.body.dataset.freeRandomAuthBound = "true";
    document.addEventListener("click", (event) => {
      const popover = $("#user-popover");
      if (!popover || popover.hidden) return;
      if (event.target.closest("#open-auth, #user-popover")) return;
      popover.hidden = true;
    });
  }

  async function handleSpin() {
    if (state.spinning) return;
    if (!(window.OlafStore?.currentUser?.() || state.user)) {
      window.location.href = `login.html?return=${encodeURIComponent("free-random.html")}`;
      return;
    }
    const button = $("#free-random-spin");
    state.spinning = true;
    renderStatus();
    try {
      const result = await window.OlafFreeRandom.claimSpin();
      state.status = {
        today: result.today,
        dailyLimit: result.dailyLimit,
        spinsUsedToday: result.spinsUsedToday,
        spinsRemaining: result.spinsRemaining
      };
      await animateToWinner(result);
      showResult(result);
      await loadConfig();
    } catch (error) {
      console.error("Free random spin failed", error);
      alert(errorMessage(error));
    } finally {
      state.spinning = false;
      renderStatus();
      if (button) button.blur();
    }
  }

  async function init() {
    await window.OlafStore?.ready?.catch?.(() => null);
    bindAuthHeader();
    renderAuthHeader();
    $("#free-random-spin")?.addEventListener("click", handleSpin);
    await loadConfig();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
