(function () {
  function setupMobileNavigation() {
    document.querySelectorAll(".topbar").forEach((header, index) => {
      const nav = header.querySelector(".main-nav");
      if (!nav || header.querySelector(".mobile-nav-toggle")) return;

      const navId = nav.id || `main-nav-${index + 1}`;
      nav.id = navId;

      const toggle = document.createElement("button");
      toggle.className = "mobile-nav-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", navId);
      toggle.innerHTML = '<i data-lucide="layout-grid"></i><span>หมวดหมู่</span><i data-lucide="chevron-down" class="mobile-nav-chevron"></i>';

      header.insertBefore(toggle, nav);

      toggle.addEventListener("click", () => {
        const isOpen = header.classList.toggle("is-mobile-nav-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });

      nav.addEventListener("click", (event) => {
        if (!event.target.closest("a")) return;
        header.classList.remove("is-mobile-nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    window.lucide?.createIcons?.();
  }

  document.addEventListener("DOMContentLoaded", setupMobileNavigation);
})();
