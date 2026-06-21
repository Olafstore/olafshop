(function () {
  const ORDER_DESTINATION = "profile.html#inventory";
  const NAV_ITEMS = [
    { href: "index.html", label: "หน้าแรก", match: ["index.html", ""] },
    { href: "index.html#catalog", label: "สินค้า", matchHash: "#catalog" },
    { href: "more-products.html", label: "หมวดหมู่", match: ["more-products.html"] },
    { href: ORDER_DESTINATION, label: "คลังสินค้า", match: ["profile.html"], matchHash: "#inventory" },
    { href: "https://www.facebook.com/byOlafshop", label: "ติดต่อเรา", external: true }
  ];

  function createDisplayTextCleaner() {
    const windows1252Bytes = new Map([
      [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
      [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
      [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
      [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
      [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
      [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
      [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f]
    ]);
    const mojibakePattern = /(?:à¸|à¹|Ã|Â|â(?:€|„|™)|ã€|ï¿½)/g;
    const score = (text) => (String(text || "").match(mojibakePattern) || []).length;

    function legacyBytes(text) {
      const bytes = [];
      for (const char of Array.from(text)) {
        const code = char.codePointAt(0);
        if (code <= 0xff) bytes.push(code);
        else if (windows1252Bytes.has(code)) bytes.push(windows1252Bytes.get(code));
        else return null;
      }
      return Uint8Array.from(bytes);
    }

    return (value = "") => {
      let next = String(value || "");
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const currentScore = score(next);
        if (!currentScore) break;
        try {
          const bytes = legacyBytes(next);
          if (!bytes) break;
          const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          if (!decoded || decoded === next || score(decoded) >= currentScore) break;
          next = decoded;
        } catch (error) {
          break;
        }
      }
      return next
        .replace(/Â®/g, "®")
        .replace(/Â©/g, "©")
        .replace(/Â/g, "")
        .replace(/â„¢/g, "™")
        .replace(/â€¢/g, "•")
        .replace(/â€“/g, "–")
        .replace(/â€”/g, "—")
        .replace(/â€¦/g, "…")
        .replace(/ã€€/g, " ")
        .replace(/\uFFFD/g, "")
        .trim();
    };
  }

  const cleanDisplayText = window.OlafText?.clean || createDisplayTextCleaner();
  window.OlafText = {
    ...(window.OlafText || {}),
    clean: cleanDisplayText
  };

  function currentFile() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function inventoryUrlFromLegacyLink(link) {
    try {
      const url = new URL(link.getAttribute("href") || "", window.location.href);
      const orderId = url.searchParams.get("order");
      return orderId
        ? `profile.html?order=${encodeURIComponent(orderId)}#inventory`
        : ORDER_DESTINATION;
    } catch (error) {
      return ORDER_DESTINATION;
    }
  }

  function replaceLegacyOrderLinks() {
    document.querySelectorAll('a[href*="orders.html"], a[href="/orders"], a[href="orders"]').forEach((link) => {
      link.href = inventoryUrlFromLegacyLink(link);
      if (/ออเดอร์|คำสั่งซื้อ/i.test(link.textContent || "")) {
        const label = link.querySelector("span");
        if (label) label.textContent = "คลังสินค้า";
        else if (!link.querySelector("svg, i")) link.textContent = "คลังสินค้า";
      }
    });
  }

  function navLinkHtml(item) {
    const file = currentFile();
    const hash = window.location.hash;
    const matchesFile = item.match?.includes(file);
    const matchesHash = item.matchHash && hash === item.matchHash;
    const active = item.href === "index.html#catalog"
      ? file === "index.html" && hash === "#catalog"
      : item.href === ORDER_DESTINATION
        ? file === "profile.html" && hash === "#inventory"
        : Boolean(matchesFile && !hash);
    const external = item.external ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${item.href}"${external}${active || matchesHash ? ' class="is-active"' : ""}>${item.label}</a>`;
  }

  function normalizeMainNavigation(header, index) {
    const nav = header.querySelector(".main-nav");
    if (!nav) return;

    nav.innerHTML = NAV_ITEMS.map(navLinkHtml).join("");
    const navId = nav.id || `main-nav-${index + 1}`;
    nav.id = navId;

    let toggle = header.querySelector(".mobile-nav-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.className = "mobile-nav-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-controls", navId);
      toggle.innerHTML = '<i data-lucide="layout-grid"></i><span>เมนู</span><i data-lucide="chevron-down" class="mobile-nav-chevron"></i>';
      header.insertBefore(toggle, nav);
    }
    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("is-mobile-nav-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    nav.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      header.classList.remove("is-mobile-nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", (event) => {
      if (header.contains(event.target)) return;
      header.classList.remove("is-mobile-nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      header.classList.remove("is-mobile-nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  function setupUniversalSearch(header) {
    if (header.querySelector(".topbar-search-wrap, .site-global-search")) return;
    const actions = header.querySelector(".topbar-actions");
    if (!actions) return;

    const wrapper = document.createElement("form");
    wrapper.className = "site-global-search";
    wrapper.setAttribute("role", "search");
    wrapper.innerHTML = `
      <button class="site-global-search-toggle" type="button" aria-label="เปิดช่องค้นหาสินค้า">
        <i data-lucide="search"></i>
      </button>
      <input type="search" placeholder="ค้นหาเกม..." aria-label="ค้นหาสินค้า" />
    `;
    wrapper.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = wrapper.querySelector("input")?.value.trim() || "";
      if (query) window.location.href = `index.html?search=${encodeURIComponent(query)}#catalog`;
    });
    actions.insertBefore(wrapper, actions.firstChild);
  }

  function setupResponsiveSearch(header) {
    const search = header.querySelector(".topbar-search-wrap, .site-global-search");
    const input = search?.querySelector('input[type="search"]');
    const toggle = search?.querySelector(".topbar-search-toggle, .site-global-search-toggle");
    if (!search || !input || !toggle) return;

    const setOpen = (open, focus = false) => {
      search.classList.toggle("is-search-open", open);
      header.classList.toggle("is-search-active", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (focus) window.requestAnimationFrame(() => input.focus());
    };

    toggle.addEventListener("click", () => {
      if (window.innerWidth > 1180) return;
      const isOpen = search.classList.contains("is-search-open");
      if (isOpen && search.classList.contains("site-global-search") && input.value.trim()) {
        search.requestSubmit();
        return;
      }
      const shouldOpen = !isOpen;
      setOpen(shouldOpen, shouldOpen);
    });
    input.addEventListener("focus", () => {
      if (window.innerWidth <= 1180) setOpen(true);
    });
    document.addEventListener("click", (event) => {
      if (window.innerWidth > 1180 || search.contains(event.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  function setupStickyState(headers) {
    let queued = false;
    const update = () => {
      queued = false;
      const scrolled = window.scrollY > 8;
      headers.forEach((header) => header.classList.toggle("is-scrolled", scrolled));
    };
    window.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function setupSiteNavigation() {
    replaceLegacyOrderLinks();
    const headers = [...document.querySelectorAll(".topbar")];
    headers.forEach((header, index) => {
      header.classList.add("site-topbar-unified");
      normalizeMainNavigation(header, index);
      setupUniversalSearch(header);
      setupResponsiveSearch(header);
    });
    setupStickyState(headers);
    let resizeQueued = false;
    window.addEventListener("resize", () => {
      if (resizeQueued) return;
      resizeQueued = true;
      window.requestAnimationFrame(() => {
        resizeQueued = false;
        if (window.innerWidth > 1180) {
          headers.forEach((header) => {
            header.classList.remove("is-mobile-nav-open");
            header.classList.remove("is-search-active");
            header.querySelector(".mobile-nav-toggle")?.setAttribute("aria-expanded", "false");
            header.querySelector(".is-search-open")?.classList.remove("is-search-open");
          });
        }
      });
    }, { passive: true });
    window.lucide?.createIcons?.();
  }

  document.addEventListener("DOMContentLoaded", setupSiteNavigation);
})();
