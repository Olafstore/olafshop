(function () {
  const ORDER_DESTINATION = "profile.html#inventory";
  const NAV_ITEMS = [
    { href: "index.html", label: "หน้าหลัก", icon: "house", match: ["index.html", ""] },
    { href: "index.html#catalog", label: "สินค้า", icon: "shopping-bag", matchHash: "#catalog" },
    { href: "more-products.html", label: "หมวดหมู่", icon: "layout-grid", match: ["more-products.html"] },
    { href: "free-random.html", label: "สุ่ม 1 Point", icon: "sparkles", match: ["free-random.html"] },
    { href: ORDER_DESTINATION, label: "คลังสินค้า", icon: "archive", match: ["profile.html"], matchHash: "#inventory" },
    { href: "https://www.facebook.com/byOlafshop", label: "ติดต่อเรา", icon: "messages-square", external: true }
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
    return `<a href="${item.href}"${external}${active || matchesHash ? ' class="is-active"' : ""}><i data-lucide="${item.icon || "circle"}" aria-hidden="true"></i><span>${escapeHtml(item.label)}</span></a>`;
  }

  function currentNavUser() {
    try {
      return window.OlafStore?.currentUser?.() || null;
    } catch (error) {
      return null;
    }
  }

  function mobileReturnUrl() {
    return encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}` || "index.html");
  }

  function mobileNavHeaderHtml() {
    return `
      <div class="mobile-menu-head" aria-hidden="false">
        <a class="mobile-menu-brand" href="index.html" aria-label="OLAFSHOP">
          <span class="mobile-menu-brand-mark"><i data-lucide="gamepad-2"></i></span>
          <span class="mobile-menu-brand-text">OLAF<span>SHOP</span></span>
        </a>
        <button class="mobile-menu-close" type="button" data-mobile-menu-close aria-label="ปิดเมนู">
          <i data-lucide="x"></i>
        </button>
      </div>`;
  }

  function mobileNavFooterHtml() {
    const user = currentNavUser();
    if (user) {
      return `
        <div class="mobile-menu-footer">
          <button class="mobile-menu-auth-btn mobile-menu-logout" type="button" data-mobile-nav-logout>
            <i data-lucide="log-out"></i>
            <span>ออกจากระบบ</span>
          </button>
        </div>`;
    }

    const returnUrl = mobileReturnUrl();
    return `
      <div class="mobile-menu-footer mobile-menu-auth">
        <a class="mobile-menu-auth-btn mobile-menu-login" href="login.html?return=${returnUrl}">
          <i data-lucide="log-in"></i>
          <span>เข้าสู่ระบบ</span>
        </a>
        <a class="mobile-menu-auth-btn mobile-menu-register" href="register.html?return=${returnUrl}">
          <i data-lucide="user-plus"></i>
          <span>สมัครสมาชิก</span>
        </a>
      </div>`;
  }

  function mobileDrawerHtml() {
    return `${mobileNavHeaderHtml()}${NAV_ITEMS.map(navLinkHtml).join("")}${mobileNavFooterHtml()}`;
  }

  function renderMainNav(nav) {
    nav.innerHTML = mobileDrawerHtml();
    window.lucide?.createIcons?.();
  }

  function removePortalMobileMenuArtifacts() {
    document.querySelectorAll(".olaf-mobile-drawer, [data-olaf-mobile-backdrop]").forEach((node) => node.remove());
  }

  function renderMobileDrawer(drawer) {
    drawer.innerHTML = mobileDrawerHtml();
    window.lucide?.createIcons?.();
  }

  function ensureMobileBackdrop() {
    let backdrop = document.querySelector("[data-olaf-mobile-backdrop]");
    if (!backdrop) {
      backdrop = document.createElement("button");
      backdrop.type = "button";
      backdrop.className = "olaf-mobile-menu-backdrop";
      backdrop.dataset.olafMobileBackdrop = "true";
      backdrop.setAttribute("aria-label", "ปิดเมนู");
      document.body?.appendChild(backdrop);
    }
    return backdrop;
  }

  function ensureMobileDrawer(index) {
    const drawerId = `olaf-mobile-drawer-${index + 1}`;
    let drawer = document.getElementById(drawerId);
    if (!drawer) {
      drawer = document.createElement("nav");
      drawer.id = drawerId;
      drawer.className = "olaf-mobile-drawer";
      drawer.dataset.mobileMenu = "drawer-v16";
      drawer.setAttribute("aria-hidden", "true");
      document.body?.appendChild(drawer);
    }
    renderMobileDrawer(drawer);
    return drawer;
  }

  function isMobileNavigationViewport() {
    return window.matchMedia?.("(max-width: 768px)")?.matches ?? window.innerWidth <= 768;
  }

  function setMobilePageScrollLock(shouldLock) {
    const body = document.body;
    const root = document.documentElement;
    if (!body) return;

    if (shouldLock) {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (!root.style.getPropertyValue("--olaf-mobile-scroll-y")) {
        root.style.setProperty("--olaf-mobile-scroll-y", `${scrollY}px`);
      }
      if (!isMobileNavigationViewport()) return;
    }

    if (shouldLock && isMobileNavigationViewport()) {
      if (body.dataset.mobileNavScrollLocked === "1") return;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      body.dataset.mobileNavScrollLocked = "1";
      body.dataset.mobileNavScrollY = String(scrollY);
      if (!root.style.getPropertyValue("--olaf-mobile-scroll-y")) {
        root.style.setProperty("--olaf-mobile-scroll-y", `${scrollY}px`);
      }
      root.style.overflow = "hidden";
      root.style.overscrollBehavior = "none";
      root.style.height = "100%";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      body.style.height = "100%";
      return;
    }

    if (body.dataset.mobileNavScrollLocked !== "1") {
      root.style.removeProperty("--olaf-mobile-scroll-y");
      return;
    }
    const restoreScrollY = Number(body.dataset.mobileNavScrollY || "0") || 0;
    delete body.dataset.mobileNavScrollLocked;
    delete body.dataset.mobileNavScrollY;
    root.style.overflow = "";
    root.style.overscrollBehavior = "";
    root.style.height = "";
    root.style.removeProperty("--olaf-mobile-scroll-y");
    body.style.width = "";
    body.style.overflow = "";
    body.style.overscrollBehavior = "";
    body.style.height = "";
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    window.scrollTo(0, restoreScrollY);
  }

  window.OlafNavigation = {
    ...(window.OlafNavigation || {}),
    closeMobileMenus: () => {
      document.querySelectorAll(".topbar.is-mobile-nav-open, .topbar.site-topbar-unified.is-mobile-nav-open").forEach((header) => {
        header.classList.remove("is-mobile-nav-open");
        header.querySelector(".mobile-nav-toggle")?.setAttribute("aria-expanded", "false");
        header.querySelectorAll(".main-nav[data-mobile-menu='clean-v14']").forEach((nav) => {
          nav.style.top = "";
          nav.style.removeProperty("--olaf-mobile-scroll-y");
        });
      });
      document.querySelectorAll(".olaf-mobile-drawer").forEach((drawer) => {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
      });
      document.querySelectorAll("[data-olaf-mobile-backdrop]").forEach((backdrop) => {
        backdrop.classList.remove("is-open");
      });
      document.documentElement.classList.remove("olaf-mobile-nav-open", "olaf-topbar-overlay-open");
      document.body?.classList.remove("olaf-mobile-nav-open", "olaf-topbar-overlay-open");
      setMobilePageScrollLock(false);
    },
    unlockMobileNavScroll: () => setMobilePageScrollLock(false),
    closeTopbarPopovers,
    positionTopbarPopover
  };

  function syncMobileUserPopoverPortal() {
    if (!document.body) return;
    const preferredWrap =
      document.querySelector(".topbar .user-popover-wrap") ||
      document.querySelector(".user-popover-wrap");
    let popover =
      preferredWrap?.querySelector("#user-popover") ||
      document.querySelector("#user-popover");

    if (preferredWrap && popover && popover.parentElement !== preferredWrap) {
      preferredWrap.appendChild(popover);
    }

    document.querySelectorAll("#user-popover").forEach((node) => {
      if (!popover || node === popover) return;
      node.hidden = true;
      node.classList.add("hidden", "olaf-user-popover-duplicate");
      node.remove();
    });

    document.querySelectorAll(".user-popover").forEach((node) => {
      if (!popover || node === popover || popover.contains(node)) return;
      node.hidden = true;
      node.classList.add("hidden", "olaf-user-popover-duplicate");
      node.remove();
    });

    if (!popover) return;
    delete popover.dataset.mobilePortal;
    popover.classList.remove("olaf-user-popover-duplicate");
    popover.classList.add("olaf-user-popover-single");
    popover.removeAttribute("aria-hidden");
    popover.style.position = "";
    popover.style.top = "";
    popover.style.right = "";
    popover.style.bottom = "";
    popover.style.left = "";
    popover.style.width = "";
    popover.style.maxWidth = "";
    popover.style.maxHeight = "";
    popover.style.transform = "";
    popover.style.opacity = "";
    popover.style.pointerEvents = "";
    if (popover.hidden) popover.style.display = "";
  }

  function hideMobileFloatingPanel(node) {
    if (!node) return;
    node.hidden = true;
    node.classList.add("hidden");
    node.classList.remove("show", "open", "is-open", "active", "is-active");
    node.style.display = "";
    node.style.opacity = "";
    node.style.pointerEvents = "";
    node.style.transform = "";
    node.setAttribute("aria-hidden", "true");
  }

  let activeTopbarPopover = null;
  let activeTopbarAnchor = null;
  let topbarPortalCounter = 0;

  function resolveNode(target) {
    if (!target) return null;
    if (typeof target === "string") return document.querySelector(target);
    return target instanceof Element ? target : null;
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clearTopbarPopoverPosition(popoverTarget) {
    const popover = resolveNode(popoverTarget);
    if (!popover) return;
    popover.classList.remove("topbar-popover-fixed");
    popover.style.removeProperty("--olaf-popover-top");
    popover.style.removeProperty("--olaf-popover-left");
    popover.style.removeProperty("--olaf-popover-width");
    popover.style.removeProperty("--olaf-popover-max-height");
    if (activeTopbarPopover === popover) {
      activeTopbarPopover = null;
      activeTopbarAnchor = null;
    }
  }

  function ensureTopbarPortalId(node) {
    if (!node) return "";
    if (!node.dataset.olafTopbarPortalId) {
      topbarPortalCounter += 1;
      node.dataset.olafTopbarPortalId = `topbar-popover-parent-${topbarPortalCounter}`;
    }
    return node.dataset.olafTopbarPortalId;
  }

  function portalTopbarPopover(popover) {
    if (!popover || !document.body || popover.parentElement === document.body) return;
    const parent = popover.parentElement;
    popover.dataset.olafOriginalTopbarParent = ensureTopbarPortalId(parent);
    document.body.appendChild(popover);
  }

  function restoreTopbarPopover(popover) {
    if (!popover?.dataset?.olafOriginalTopbarParent) return;
    const parent = document.querySelector(`[data-olaf-topbar-portal-id="${popover.dataset.olafOriginalTopbarParent}"]`);
    if (parent && popover.parentElement !== parent) parent.appendChild(popover);
    delete popover.dataset.olafOriginalTopbarParent;
  }

  function positionTopbarPopover(popoverTarget, anchorTarget, options = {}) {
    const popover = resolveNode(popoverTarget);
    const anchor = resolveNode(anchorTarget);
    if (!popover || !anchor || popover.hidden) {
      clearTopbarPopoverPosition(popover);
      return;
    }

    const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 360;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;
    const shouldFloat = viewportWidth <= Number(options.breakpoint || 1180);
    if (!shouldFloat) {
      clearTopbarPopoverPosition(popover);
      restoreTopbarPopover(popover);
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const sideGap = viewportWidth <= 420 ? 10 : 12;
    const maxWidth = Number(options.maxWidth || (popover.id === "notification-popover" ? 348 : 336));
    const width = Math.round(Math.min(maxWidth, viewportWidth - sideGap * 2));
    const centerLeft = anchorRect.left + anchorRect.width / 2 - width / 2;
    const left = Math.round(clampNumber(centerLeft, sideGap, Math.max(sideGap, viewportWidth - width - sideGap)));
    const fallbackTop = Math.max(58, Number(options.fallbackTop || 64));
    const top = Math.round(clampNumber(anchorRect.bottom + 10, fallbackTop, Math.max(fallbackTop, viewportHeight - 96)));
    const maxHeight = Math.max(180, viewportHeight - top - Math.max(12, sideGap));

    portalTopbarPopover(popover);
    popover.classList.add("topbar-popover-fixed");
    popover.classList.remove("hidden");
    popover.removeAttribute("aria-hidden");
    popover.style.setProperty("--olaf-popover-top", `${top}px`);
    popover.style.setProperty("--olaf-popover-left", `${left}px`);
    popover.style.setProperty("--olaf-popover-width", `${width}px`);
    popover.style.setProperty("--olaf-popover-max-height", `${Math.round(maxHeight)}px`);
    activeTopbarPopover = popover;
    activeTopbarAnchor = anchor;
  }

  function positionKnownTopbarPopover(popover) {
    if (!popover || popover.hidden) return;
    const header = popover.closest(".topbar") || document.querySelector(".topbar");
    const anchor =
      popover.id === "language-popover"
        ? header?.querySelector("#lang-toggle")
        : popover.id === "notification-popover"
          ? header?.querySelector("#open-notifications")
          : popover.id === "user-popover"
            ? header?.querySelector("#open-auth")
            : null;
    if (anchor) positionTopbarPopover(popover, anchor);
  }

  function scheduleTopbarPopoverPosition(popoverSelector, anchorSelector) {
    window.requestAnimationFrame(() => {
      const popover = document.querySelector(popoverSelector);
      const anchor = document.querySelector(anchorSelector);
      if (popover && anchor && !popover.hidden) positionTopbarPopover(popover, anchor);
    });
  }

  function closeTopbarPopovers(except = "") {
    [
      ["language", "#language-popover", "#lang-toggle"],
      ["notifications", "#notification-popover", "#open-notifications"],
      ["user", "#user-popover", "#open-auth"]
    ].forEach(([key, popoverSelector, buttonSelector]) => {
      if (key === except) return;
      const popover = document.querySelector(popoverSelector);
      const button = document.querySelector(buttonSelector);
      if (popover) {
        popover.hidden = true;
        clearTopbarPopoverPosition(popover);
      }
      button?.classList.remove("is-active");
      button?.setAttribute("aria-expanded", "false");
    });
  }

  function setupTopbarPopoverAnchoring() {
    if (document.body?.dataset.olafTopbarPopoverAnchorBound === "true") return;
    document.body.dataset.olafTopbarPopoverAnchorBound = "true";

    document.addEventListener("click", (event) => {
      const languageButton = event.target.closest("#lang-toggle");
      const notificationButton = event.target.closest("#open-notifications");
      const authButton = event.target.closest("#open-auth");
      if (languageButton) {
        closeTopbarPopovers("language");
        scheduleTopbarPopoverPosition("#language-popover", "#lang-toggle");
      }
      if (notificationButton) {
        closeTopbarPopovers("notifications");
        scheduleTopbarPopoverPosition("#notification-popover", "#open-notifications");
      }
      if (authButton) {
        closeTopbarPopovers("user");
        scheduleTopbarPopoverPosition("#user-popover", "#open-auth");
      }
    }, true);

    const updateActive = () => {
      if (activeTopbarPopover && activeTopbarAnchor && !activeTopbarPopover.hidden) {
        positionTopbarPopover(activeTopbarPopover, activeTopbarAnchor);
        return;
      }
      ["#language-popover", "#notification-popover", "#user-popover"].forEach((selector) => {
        const popover = document.querySelector(selector);
        if (popover && !popover.hidden) positionKnownTopbarPopover(popover);
      });
    };
    window.addEventListener("resize", () => window.requestAnimationFrame(updateActive), { passive: true });
    window.addEventListener("scroll", () => window.requestAnimationFrame(updateActive), { passive: true });
  }

  function setupFallbackTopbarControls(header) {
    if (!document.body?.classList.contains("free-random-page")) return;
    if (header.dataset.olafFallbackTopbarControls === "true") return;
    header.dataset.olafFallbackTopbarControls = "true";

    const langToggle = header.querySelector("#lang-toggle");
    const languagePopover = header.querySelector("#language-popover");
    const notificationToggle = header.querySelector("#open-notifications");
    const notificationPopover = header.querySelector("#notification-popover");

    langToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextOpen = Boolean(languagePopover?.hidden);
      closeTopbarPopovers("language");
      if (!languagePopover) return;
      languagePopover.hidden = !nextOpen;
      langToggle.setAttribute("aria-expanded", String(nextOpen));
      if (nextOpen) positionTopbarPopover(languagePopover, langToggle);
    });

    languagePopover?.addEventListener("click", (event) => {
      event.stopPropagation();
      const button = event.target.closest("[data-lang-option]");
      if (!button) return;
      languagePopover.querySelectorAll("[data-lang-option]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      languagePopover.hidden = true;
      clearTopbarPopoverPosition(languagePopover);
      langToggle?.setAttribute("aria-expanded", "false");
    });

    notificationToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextOpen = Boolean(notificationPopover?.hidden);
      closeTopbarPopovers("notifications");
      if (!notificationPopover) return;
      notificationPopover.hidden = !nextOpen;
      notificationToggle.setAttribute("aria-expanded", String(nextOpen));
      if (nextOpen) positionTopbarPopover(notificationPopover, notificationToggle);
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".language-switcher, .notification-wrap, .user-popover-wrap")) return;
      closeTopbarPopovers("");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeTopbarPopovers("");
    });
  }

  function normalizeMainNavigation(header, index) {
    const nav = header.querySelector(".main-nav");
    if (!nav) return;
    removePortalMobileMenuArtifacts();
    const drawer = ensureMobileDrawer(index);
    const backdrop = ensureMobileBackdrop();

    const syncMobileNavState = () => {
      const isAnyOpen = Boolean(document.querySelector(".olaf-mobile-drawer.is-open"));
      document.documentElement.classList.toggle("olaf-mobile-nav-open", isAnyOpen);
      document.body?.classList.toggle("olaf-mobile-nav-open", isAnyOpen);
      document.body?.classList.toggle("olaf-topbar-overlay-open", isAnyOpen);
      setMobilePageScrollLock(isAnyOpen);
    };

    const setMobileNavOpen = (isOpen) => {
      const shouldOpen = Boolean(isOpen) && isMobileNavigationViewport();

      if (shouldOpen) {
        renderMobileDrawer(drawer);
        ["#user-popover", "#notification-popover", "#language-popover", "#filter-popover"].forEach((selector) => {
          hideMobileFloatingPanel(document.querySelector(selector));
        });
        header.querySelector("#open-auth")?.classList.remove("is-active");
        header.querySelector("#lang-toggle")?.setAttribute("aria-expanded", "false");
      } else {
        nav.style.top = "";
        nav.style.removeProperty("--olaf-mobile-scroll-y");
      }
      header.classList.toggle("is-mobile-nav-open", shouldOpen);
      drawer.classList.toggle("is-open", shouldOpen);
      backdrop.classList.toggle("is-open", shouldOpen);
      drawer.setAttribute("aria-hidden", String(!shouldOpen));
      toggle?.setAttribute("aria-expanded", String(shouldOpen));
      syncMobileNavState();
      if (shouldOpen) window.requestAnimationFrame(() => window.lucide?.createIcons?.());
    };

    nav.dataset.mobileMenu = "clean-v14";
    renderMainNav(nav);
    const navId = nav.id || `main-nav-${index + 1}`;
    nav.id = navId;

    let toggle = header.querySelector(".mobile-nav-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.className = "mobile-nav-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-controls", navId);
      header.insertBefore(toggle, nav);
    }
    toggle.innerHTML = '<i data-lucide="menu"></i><span>menu</span>';
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMobileNavOpen(!drawer.classList.contains("is-open"));
    }, true);
    const handleMobileNavClick = async (event) => {
      if (event.target.closest("[data-mobile-menu-close]")) {
        event.preventDefault();
        setMobileNavOpen(false);
        return;
      }

      const logoutButton = event.target.closest("[data-mobile-nav-logout]");
      if (logoutButton) {
        event.preventDefault();
        logoutButton.disabled = true;
        try {
          await window.OlafStore?.logout?.();
        } catch (error) {
          console.warn("Unable to sign out from mobile menu.", error);
        }
        setMobileNavOpen(false);
        window.location.href = "index.html";
        return;
      }

      if (!event.target.closest("a")) return;
      setMobileNavOpen(false);
    };
    nav.addEventListener("click", handleMobileNavClick);
    drawer.addEventListener("click", handleMobileNavClick);
    backdrop.addEventListener("click", () => setMobileNavOpen(false));

    const refreshNavForAuth = () => {
      renderMainNav(nav);
      renderMobileDrawer(drawer);
    };
    const storeReady = window.OlafStore?.ready;
    if (storeReady && typeof storeReady.finally === "function") storeReady.finally(refreshNavForAuth);
    window.addEventListener("olaf-auth-changed", refreshNavForAuth);
    window.addEventListener("storage", refreshNavForAuth);
    setTimeout(refreshNavForAuth, 700);

    document.addEventListener("click", (event) => {
      if (!event.target.closest("#open-auth, .user-popover-wrap, #user-popover")) return;
      syncMobileUserPopoverPortal();
    }, true);

    document.addEventListener("click", (event) => {
      if (drawer.contains(event.target) || nav.contains(event.target) || toggle?.contains(event.target)) return;
      setMobileNavOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      setMobileNavOpen(false);
    });
  }

  let searchableProductsPromise = null;
  let universalSearchRequest = 0;

  function escapeHtml(value = "") {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizedSearchValue(value = "") {
    return cleanDisplayText(value).trim().toLowerCase();
  }

  function productSearchHaystack(product = {}) {
    return [
      product.name,
      product.publisher,
      product.id,
      product.category,
      product.label,
      ...(Array.isArray(product.tags) ? product.tags : [])
    ]
      .map(normalizedSearchValue)
      .filter(Boolean)
      .join(" ");
  }

  function productImage(product = {}) {
    return product.image || product.heroImage || product.image_url || product.hero_image || "";
  }

  function productPrice(product = {}) {
    const amount = Number(product.price);
    if (!Number.isFinite(amount)) return "";
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: amount % 1 ? 2 : 0
    }).format(amount);
  }

  async function loadSearchableProducts() {
    if (searchableProductsPromise) return searchableProductsPromise;

    searchableProductsPromise = (async () => {
      try {
        if (window.OlafProducts?.fetchActiveProducts) {
          const products = await window.OlafProducts.fetchActiveProducts();
          if (Array.isArray(products) && products.length) return products;
        }
      } catch (error) {
        console.warn("Topbar search is using the local product catalog.", error);
      }

      try {
        const response = await fetch("api/products.json", { cache: "no-store" });
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload) ? payload : Array.isArray(payload?.products) ? payload.products : [];
      } catch (error) {
        console.warn("Unable to load products for topbar search.", error);
        return [];
      }
    })();

    return searchableProductsPromise;
  }

  function findSearchMatches(products, query, limit = 6) {
    const keyword = normalizedSearchValue(query);
    if (!keyword) return [];

    return products
      .map((product) => {
        const name = normalizedSearchValue(product?.name);
        const haystack = productSearchHaystack(product);
        if (!haystack.includes(keyword)) return null;
        return {
          product,
          score:
            (name === keyword ? 100 : 0) +
            (name.startsWith(keyword) ? 40 : 0) +
            (name.includes(keyword) ? 20 : 0) +
            Number(product?.sold || 0) / 10000
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((entry) => entry.product);
  }

  function syncIndexCatalogSearch(query, updateUrl = false) {
    if (currentFile() !== "index.html") return false;
    const catalogInput = document.querySelector("#search-input");
    if (!catalogInput) return false;

    if (catalogInput.value !== query) catalogInput.value = query;
    catalogInput.dispatchEvent(new Event("input", { bubbles: true }));

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (query) url.searchParams.set("search", query);
      else url.searchParams.delete("search");
      url.hash = "catalog";
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    return true;
  }

  function hideUniversalSearchResults(wrapper) {
    universalSearchRequest += 1;
    const panel = wrapper.querySelector(".site-global-search-results");
    if (!panel) return;
    panel.hidden = true;
    panel.innerHTML = "";
  }

  async function renderUniversalSearchResults(wrapper, query) {
    const panel = wrapper.querySelector(".site-global-search-results");
    const keyword = query.trim();
    if (!panel || !keyword) {
      hideUniversalSearchResults(wrapper);
      return;
    }

    const requestId = ++universalSearchRequest;
    const products = await loadSearchableProducts();
    if (requestId !== universalSearchRequest) return;

    const matches = findSearchMatches(products, keyword);
    if (!matches.length) {
      panel.innerHTML = `<div class="search-suggestions-empty">ไม่พบสินค้าที่ตรงกับ “${escapeHtml(keyword)}”</div>`;
      panel.hidden = false;
      return;
    }

    panel.innerHTML = matches
      .map((product) => {
        const image = productImage(product);
        const name = cleanDisplayText(product?.name || "สินค้า");
        const meta = cleanDisplayText(product?.publisher || product?.category || "");
        return `
          <a class="search-suggestion-item" href="product.html?id=${encodeURIComponent(product.id)}" role="option">
            ${image ? `<img class="suggestion-img" src="${escapeHtml(image)}" alt="" loading="lazy" />` : ""}
            <span class="suggestion-info">
              <span class="suggestion-name">${escapeHtml(name)}</span>
              <span class="suggestion-meta">${escapeHtml(meta)}</span>
            </span>
            <strong class="suggestion-price">${escapeHtml(productPrice(product))}</strong>
          </a>
        `;
      })
      .join("");
    panel.hidden = false;
  }

  function setupUniversalSearch(header) {
    const legacySearch = header.querySelector(".topbar-search-wrap");
    if (legacySearch) {
      legacySearch.classList.add("site-unified-search");
      const input = legacySearch.querySelector('input[type="search"]');
      const toggle = legacySearch.querySelector(".topbar-search-toggle");
      if (input) {
        input.placeholder = "ค้นหาเกม...";
        input.setAttribute("aria-label", "ค้นหาสินค้า");
      }
      if (toggle) toggle.setAttribute("aria-label", "เปิดช่องค้นหาสินค้า");
      return;
    }
    if (header.querySelector(".site-global-search")) return;
    const actions = header.querySelector(".topbar-actions");
    if (!actions) return;

    const wrapper = document.createElement("form");
    wrapper.className = "site-global-search";
    wrapper.setAttribute("role", "search");
    wrapper.innerHTML = `
      <button class="site-global-search-toggle" type="button" aria-label="เปิดช่องค้นหาสินค้า">
        <i data-lucide="search"></i>
      </button>
      <input type="search" placeholder="ค้นหาเกม..." aria-label="ค้นหาสินค้า" aria-autocomplete="list" aria-controls="site-global-search-results" />
      <div class="search-suggestions site-global-search-results" id="site-global-search-results" hidden role="listbox"></div>
    `;
    const input = wrapper.querySelector('input[type="search"]');
    const toggle = wrapper.querySelector(".site-global-search-toggle");

    input?.addEventListener("input", () => {
      const query = input.value.trim();
      syncIndexCatalogSearch(query);
      renderUniversalSearchResults(wrapper, query);
    });
    input?.addEventListener("focus", () => {
      renderUniversalSearchResults(wrapper, input.value);
    });
    toggle?.addEventListener("click", () => {
      if (window.innerWidth <= 1180) return;
      if (input?.value.trim()) wrapper.requestSubmit();
      else input?.focus();
    });
    wrapper.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input?.value.trim() || "";
      if (!query) {
        hideUniversalSearchResults(wrapper);
        return;
      }

      if (syncIndexCatalogSearch(query, true)) {
        hideUniversalSearchResults(wrapper);
        document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      window.location.href = `index.html?search=${encodeURIComponent(query)}#catalog`;
    });
    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) hideUniversalSearchResults(wrapper);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideUniversalSearchResults(wrapper);
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
    syncMobileUserPopoverPortal();
    const headers = [...document.querySelectorAll(".topbar")];
    headers.forEach((header, index) => {
      header.classList.add("site-topbar-unified");
      normalizeMainNavigation(header, index);
      setupUniversalSearch(header);
      setupResponsiveSearch(header);
      setupFallbackTopbarControls(header);
    });
    setupTopbarPopoverAnchoring();
    setupStickyState(headers);
    setTimeout(syncMobileUserPopoverPortal, 600);
    let resizeQueued = false;
    window.addEventListener("resize", () => {
      if (resizeQueued) return;
      resizeQueued = true;
      window.requestAnimationFrame(() => {
        resizeQueued = false;
        syncMobileUserPopoverPortal();
        if (window.innerWidth > 1180) {
          window.OlafNavigation?.closeMobileMenus?.();
          headers.forEach((header) => {
            header.classList.remove("is-search-active");
            header.querySelector(".is-search-open")?.classList.remove("is-search-open");
          });
        }
      });
    }, { passive: true });
    window.lucide?.createIcons?.();
  }

  document.addEventListener("DOMContentLoaded", setupSiteNavigation);
})();
