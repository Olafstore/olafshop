(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = (value) => `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
  const clean = (value) => window.OlafText?.clean?.(value) || String(value || "");

  const state = {
    config: { settings: { dailyLimit: 5, isActive: true }, slots: [] },
    status: { dailyLimit: 5, spinsUsedToday: 0, spinsRemaining: 0 },
    spinning: false,
    user: null
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
    return state.config.slots.filter((slot) => slot.productId && slot.isActive && slot.productIsActive && slot.stock > 0);
  }

  function cardHtml(slot, compact = false) {
    const name = clean(slot.label || slot.productName || `ช่องที่ ${slot.slotNumber}`);
    return `
      <article class="free-random-card${compact ? " is-compact" : ""}" data-slot-number="${slot.slotNumber}">
        <div class="free-random-card-image">
          <img src="${escapeHtml(prizeImage(slot))}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" />
        </div>
        <div class="free-random-card-body">
          <span>ช่อง ${slot.slotNumber}</span>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(clean(slot.category || "สินค้า"))} · ${money(slot.price)}</p>
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
  }

  function showResult(result) {
    const panel = $("#free-random-result");
    if (!panel) return;
    const product = result.product || {};
    const name = clean(product.name || result.slot?.label || "รางวัลของคุณ");
    panel.hidden = false;
    panel.innerHTML = `
      <div class="free-random-result-card">
        <div class="free-random-result-image">
          <img src="${escapeHtml(product.imageUrl || result.slot?.imageUrl || "assets/placeholder.svg")}" alt="${escapeHtml(name)}" />
        </div>
        <div>
          <span class="eyebrow"><i data-lucide="trophy"></i> YOU WON</span>
          <h2>${escapeHtml(name)}</h2>
          <p>ระบบสร้างออเดอร์ฟรีให้แล้ว ${result.order?.status === "delivered" ? "และจัดส่งเข้าคลังเรียบร้อย" : "รอแอดมินจัดส่งตามประเภทสินค้า"}</p>
          <div class="free-random-result-actions">
            <a class="primary-button" href="profile.html#inventory"><i data-lucide="box"></i> เปิดคลังสินค้า</a>
            ${result.order?.id ? `<a class="ghost-button" href="profile.html?order=${encodeURIComponent(result.order.id)}#orders"><i data-lucide="receipt"></i> ดูออเดอร์</a>` : ""}
          </div>
        </div>
      </div>
    `;
    window.lucide?.createIcons?.();
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function refreshStatus() {
    try {
      state.user = window.OlafStore?.currentUser?.() || (await window.OlafSupabaseAuth?.getCurrentUser?.());
    } catch (error) {
      state.user = null;
    }
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

  async function handleSpin() {
    if (state.spinning) return;
    if (!window.OlafStore?.currentUser?.()) {
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
    $("#free-random-spin")?.addEventListener("click", handleSpin);
    await loadConfig();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
