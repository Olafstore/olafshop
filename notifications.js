(function () {
  const emptyIcon = "bell";
  const readStoragePrefix = "olafshop_read_delivery_notifications";

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => {
      const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return entities[char];
    });
  }

  function createIconSet() {
    window.requestAnimationFrame(() => {
      if (window.OlafIcons?.refresh) {
        window.OlafIcons.refresh();
        return;
      }
      window.lucide?.createIcons?.();
    });
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  }

  function orderLabel(order) {
    return order?.orderNumber || order?.id || "ออเดอร์";
  }

  function orderProductText(order) {
    const names = (order?.items || [])
      .map((item) => item.productName || item.name || item.productId)
      .filter(Boolean);
    return names.length ? names.join(", ") : "สินค้าในออเดอร์";
  }

  function orderProductImage(order) {
    const firstItem = (order?.items || []).find((item) => item.productImageUrl || item.image);
    return firstItem?.productImageUrl || firstItem?.image || "";
  }

  function currentUser() {
    return window.OlafStore?.currentUser?.() || null;
  }

  function readStorageKey(user) {
    return `${readStoragePrefix}:${user?.id || "guest"}`;
  }

  function readDeliveryNotificationIds(user) {
    try {
      const value = JSON.parse(localStorage.getItem(readStorageKey(user)) || "[]");
      return new Set(Array.isArray(value) ? value.map(String) : []);
    } catch (error) {
      return new Set();
    }
  }

  function writeDeliveryNotificationIds(user, ids) {
    try {
      localStorage.setItem(readStorageKey(user), JSON.stringify([...ids].slice(-300)));
    } catch (error) {
      console.warn("Unable to save notification read state", error);
    }
  }

  function markDeliveryNotificationRead(orderId) {
    const user = currentUser();
    if (!user || !orderId) return;
    const readIds = readDeliveryNotificationIds(user);
    readIds.add(String(orderId));
    writeDeliveryNotificationIds(user, readIds);

    const item = [...document.querySelectorAll("[data-delivery-notification]")]
      .find((node) => node.dataset.deliveryNotification === String(orderId));
    if (item) item.classList.remove("unread");
    setBadge(document.querySelectorAll("[data-delivery-notification].unread").length);
  }

  function setBadge(count) {
    const badge = document.querySelector("#notification-badge");
    const button = document.querySelector("#open-notifications");
    if (!badge || !button) return;

    if (count > 0) {
      badge.hidden = false;
      badge.textContent = "";
      badge.title = `${count} แจ้งเตือน`;
      button.classList.add("has-notifications");
      button.setAttribute("aria-label", `แจ้งเตือน ${count} รายการ`);
    } else {
      badge.hidden = true;
      badge.textContent = "";
      badge.removeAttribute("title");
      button.classList.remove("has-notifications");
      button.setAttribute("aria-label", "แจ้งเตือน");
    }
  }

  function renderEmpty(message) {
    const list = document.querySelector("#notification-list");
    if (!list) return;
    list.innerHTML = `
      <div class="notification-empty">
        <i data-lucide="${emptyIcon}"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
    createIconSet();
  }

  function renderDeliveredNotifications(orders, user) {
    const list = document.querySelector("#notification-list");
    if (!list) return;

    const deliveredOrders = orders
      .filter((order) => order?.status === "delivered")
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const readIds = readDeliveryNotificationIds(user);
    const unreadCount = deliveredOrders.filter((order) => !readIds.has(String(order.id))).length;
    setBadge(unreadCount);

    if (!deliveredOrders.length) {
      renderEmpty("ยังไม่มีแจ้งเตือนออเดอร์สำเร็จ");
      return;
    }

    list.innerHTML = deliveredOrders
      .map((order) => {
        const imageUrl = orderProductImage(order);
        const isUnread = !readIds.has(String(order.id));
        const mediaHtml = imageUrl
          ? `<span class="notification-thumb"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(orderProductText(order))}" /></span>`
          : `<span class="notification-icon"><i data-lucide="check-circle"></i></span>`;
        return `
        <a class="notification-item ${isUnread ? "unread" : ""} notification-delivered" href="orders.html?order=${encodeURIComponent(order.id)}" data-delivery-notification="${escapeHtml(order.id)}">
          ${mediaHtml}
          <span class="notification-content">
            <strong>ออเดอร์จัดส่งสำเร็จแล้ว</strong>
            <p>${escapeHtml(orderProductText(order))}</p>
            <span>${escapeHtml(orderLabel(order))}${formatDate(order.updatedAt || order.createdAt) ? ` · ${escapeHtml(formatDate(order.updatedAt || order.createdAt))}` : ""}</span>
          </span>
        </a>
      `;
      })
      .join("");
    createIconSet();
  }

  async function refreshDeliveryNotifications() {
    if (!document.querySelector("#notification-list")) return;

    await window.OlafStore?.ready;
    const user = currentUser();
    if (!user) {
      setBadge(0);
      renderEmpty("เข้าสู่ระบบเพื่อดูแจ้งเตือนออเดอร์");
      return;
    }

    try {
      if (!window.OlafOrders?.fetchMyOrders) throw new Error("Supabase order client is not ready");
      const orders = await window.OlafOrders.fetchMyOrders();
      renderDeliveredNotifications(Array.isArray(orders) ? orders : [], user);
    } catch (error) {
      console.warn("Delivery notifications unavailable", error);
      setBadge(0);
      renderEmpty("โหลดแจ้งเตือนไม่สำเร็จ");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const loadNotifications = () => refreshDeliveryNotifications();
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadNotifications, { timeout: 2500 });
    } else {
      window.setTimeout(loadNotifications, 900);
    }
    document.addEventListener("click", (event) => {
      const notificationLink = event.target.closest("[data-delivery-notification]");
      if (notificationLink) markDeliveryNotificationRead(notificationLink.dataset.deliveryNotification);
    });
  });

  window.OlafNotifications = {
    refreshDeliveryNotifications
  };
})();
