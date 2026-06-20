(function () {
  const ORDER_DESTINATION = "profile.html#inventory";
  const NAV_ITEMS = [
    { href: "index.html", label: "หน้าแรก", match: ["index.html", ""] },
    { href: "index.html#catalog", label: "สินค้า", matchHash: "#catalog" },
    { href: "more-products.html", label: "สินค้าเพิ่มเติม", match: ["more-products.html"] },
    { href: ORDER_DESTINATION, label: "คลังสินค้า", match: ["profile.html"], matchHash: "#inventory" },
    { href: "https://www.facebook.com/byOlafshop", label: "ติดต่อเรา", external: true }
  ];

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
      <i data-lucide="search"></i>
      <input type="search" placeholder="ค้นหาเกม..." aria-label="ค้นหาสินค้า" />
    `;
    wrapper.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = wrapper.querySelector("input")?.value.trim() || "";
      if (query) window.location.href = `index.html?search=${encodeURIComponent(query)}#catalog`;
    });
    actions.insertBefore(wrapper, actions.firstChild);
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
    });
    setupStickyState(headers);
    let resizeQueued = false;
    window.addEventListener("resize", () => {
      if (resizeQueued) return;
      resizeQueued = true;
      window.requestAnimationFrame(() => {
        resizeQueued = false;
        if (window.innerWidth > 1120) {
          headers.forEach((header) => {
            header.classList.remove("is-mobile-nav-open");
            header.querySelector(".mobile-nav-toggle")?.setAttribute("aria-expanded", "false");
          });
        }
      });
    }, { passive: true });
    window.lucide?.createIcons?.();
  }

  document.addEventListener("DOMContentLoaded", setupSiteNavigation);
})();
