(function () {
  const SUPABASE_URL = "https://wtvfgwacodfrzxapwoxj.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Y35cKy0qv4wC077QO21nXQ_MpIjaB5P";
  const PAYMENT_SLIP_BUCKET = "payment-slips";
  const PAYMENT_QR_BUCKET = "payment-qr";
  const MAX_PAYMENT_SLIP_SIZE = 5 * 1024 * 1024;
  const MAX_PAYMENT_QR_SIZE = 5 * 1024 * 1024;

  const isConfigured =
    SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    !SUPABASE_URL.includes("PASTE_") &&
    !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");

  const client =
    isConfigured && window.supabase?.createClient
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
      : null;

  function requireClient() {
    if (!client) {
      throw new Error("กรุณาตั้งค่า Supabase Project URL และ Publishable key ใน supabase-client.js ก่อนใช้งานระบบสมาชิก");
    }
    return client;
  }

  const OAUTH_RETURN_KEY = "olafshop_oauth_return_to";

  function normalizeReturnPath(value, fallback = "index.html") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return fallback;
      return `${url.pathname.replace(/^\//, "")}${url.search}${url.hash}` || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveOAuthReturnTo(returnTo) {
    const safeReturnTo = normalizeReturnPath(returnTo, "index.html");
    try {
      window.sessionStorage.setItem(OAUTH_RETURN_KEY, safeReturnTo);
    } catch (error) {
      console.warn("Unable to store OAuth return path", error);
    }
    return safeReturnTo;
  }

  function getOAuthReturnTo(fallback = "index.html") {
    try {
      const saved = window.sessionStorage.getItem(OAUTH_RETURN_KEY);
      if (saved) {
        window.sessionStorage.removeItem(OAUTH_RETURN_KEY);
        return normalizeReturnPath(saved, fallback);
      }
    } catch (error) {
      console.warn("Unable to read OAuth return path", error);
    }
    const urlReturn = new URLSearchParams(window.location.search).get("return");
    return normalizeReturnPath(urlReturn, fallback);
  }

  function buildOAuthRedirectUrl({ returnTo = "index.html" } = {}) {
    if (!/^https?:$/.test(window.location.protocol)) {
      throw new Error("GOOGLE_OAUTH_REQUIRES_HTTP");
    }
    saveOAuthReturnTo(returnTo);
    const redirectUrl = new URL("login.html", window.location.href);
    redirectUrl.search = "";
    redirectUrl.hash = "";
    return redirectUrl.toString();
  }

  function publicUserFrom(user, profile = {}) {
    if (!user) return null;
    const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
    const profileEmail = profile.email || user.email || "";
    const username = profile.username || profileEmail?.split("@")[0] || user.email?.split("@")[0] || "member";
    const fullName = profile.full_name || profile.fullName || profile.displayName || metadataName || username || "Member";
    return {
      id: user.id,
      email: profileEmail,
      username,
      displayName: fullName,
      fullName,
      role: profile.role || "customer",
      position: profile.position || "Member",
      partnerLevel: profile.partner_level || profile.partnerLevel || "none",
      status: profile.status || "active",
      provider: "supabase",
      updatedAt: profile.updated_at || user.updated_at || ""
    };
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function getProfile(user, retries = 0) {
    if (!user) return null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const { data, error } = await requireClient()
        .from("profiles")
        .select("id, email, username, full_name, role, position, partner_level, status, updated_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data || attempt === retries) return data;
      await wait(300 * (attempt + 1));
    }
    return null;
  }

  async function getCurrentUser() {
    const auth = requireClient().auth;
    const { data: sessionData, error: sessionError } = await auth.getSession();
    if (sessionError) return null;
    const sessionUser = sessionData.session?.user || null;
    const { data, error } = await auth.getUser();
    if (error && !sessionUser) return null;
    const user = data?.user || sessionUser;
    if (!user) return null;
    const profile = await getProfile(user, 2).catch(() => null);
    return publicUserFrom(user, profile || {});
  }

  async function signUp({ email, password, fullName }) {
    const { data, error } = await requireClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    if (error) throw error;
    const user = data.user || data.session?.user || null;
    const profile = user ? await getProfile(user, 2).catch(() => null) : null;
    return publicUserFrom(user, profile || { full_name: fullName, email });
  }

  async function signIn({ email, password }) {
    const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = data.user ? await getProfile(data.user, 2).catch(() => null) : null;
    return publicUserFrom(data.user, profile || {});
  }

  async function signInWithGoogle({ returnTo = "index.html" } = {}) {
    const redirectTo = buildOAuthRedirectUrl({ returnTo });
    const { data, error } = await requireClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await requireClient().auth.signOut();
    if (error) throw error;
  }

  async function updateProfile({ fullName }) {
    const { data: userData, error: userError } = await requireClient().auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์");

    const updatedAt = new Date().toISOString();
    const { data, error } = await requireClient()
      .from("profiles")
      .update({
        full_name: fullName,
        updated_at: updatedAt
      })
      .eq("id", user.id)
      .select("id, email, username, full_name, role, position, partner_level, status, updated_at")
      .single();
    if (error) throw error;
    return publicUserFrom(user, data);
  }

  function mapProfilePayload(row = {}) {
    const email = row.email || row.authEmail || "";
    const username = row.username || email.split("@")[0] || "member";
    const fullName = row.fullName || row.displayName || row.full_name || username || "Member";
    return {
      id: row.id || "",
      email,
      authEmail: row.authEmail || "",
      username,
      displayName: fullName,
      fullName,
      role: row.role || "customer",
      position: row.position || "Member",
      partnerLevel: row.partnerLevel || row.partner_level || "none",
      status: row.status || "active",
      provider: row.provider || "supabase",
      isAdminAccount: row.isAdminAccount === true || row.is_admin_account === true,
      createdAt: row.createdAt || row.created_at || "",
      updatedAt: row.updatedAt || row.updated_at || ""
    };
  }

  async function fetchAdminUsers() {
    const { data, error } = await requireClient().rpc("admin_list_profiles");
    if (error) throw error;
    return normalizeArray(data).map(mapProfilePayload).filter((user) => user.id);
  }

  async function saveAdminUser(user) {
    if (String(user.password || "").trim()) {
      throw new Error("PASSWORD_MANAGED_IN_SUPABASE_AUTH");
    }

    const { data, error } = await requireClient().rpc("admin_save_profile", {
      p_id: user.id || null,
      p_email: user.email || "",
      p_username: user.username || "",
      p_full_name: user.fullName || user.displayName || "",
      p_role: user.role || "customer",
      p_position: user.position || "Member",
      p_partner_level: user.partnerLevel || "none",
      p_status: user.status || "active"
    });
    if (error) throw error;
    return mapProfilePayload(data);
  }

  async function disableAdminUser(userId) {
    const { data, error } = await requireClient().rpc("admin_set_profile_status", {
      p_id: userId,
      p_status: "banned"
    });
    if (error) throw error;
    return mapProfilePayload(data);
  }

  async function updatePassword({ email, oldPassword, newPassword }) {
    const auth = requireClient().auth;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const currentPassword = String(oldPassword || "");
    const nextPassword = String(newPassword || "");

    if (!normalizedEmail) throw new Error("กรุณาเข้าสู่ระบบอีกครั้งก่อนเปลี่ยนรหัสผ่าน");
    if (!currentPassword) throw new Error("กรุณากรอกรหัสผ่านเดิม");
    if (nextPassword.length < 6) throw new Error("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");

    const { error: verifyError } = await auth.signInWithPassword({
      email: normalizedEmail,
      password: currentPassword
    });
    if (verifyError) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");

    const { data, error } = await auth.updateUser({ password: nextPassword });
    if (error) throw error;

    const user = data.user;
    const profile = user ? await getProfile(user, 2).catch(() => null) : null;
    return publicUserFrom(user, profile || {});
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function mergePaymentChannelsIntoSettings(settings, channels = []) {
    const next = normalizeObject(settings);
    const payment = {
      ...normalizeObject(next.payment)
    };
    const normalizedChannels = normalizeArray(channels);
    const promptpay = normalizedChannels.find((channel) => channel.id === "promptpay" || channel.method === "promptpay");
    const wallet = normalizedChannels.find((channel) => channel.id === "wallet" || channel.method === "wallet");

    if (promptpay) {
      payment.manualQrUrl = promptpay.qrUrl || payment.manualQrUrl || "";
      payment.manualQrPath = promptpay.qrPath || payment.manualQrPath || "";
      payment.bankName = promptpay.bankName || payment.bankName || "";
      payment.bankAccountNumber = promptpay.accountNumber || payment.bankAccountNumber || "";
      payment.bankAccountName = promptpay.accountName || payment.bankAccountName || "";
      payment.paymentNote = promptpay.note || payment.paymentNote || "";
    }

    if (wallet) {
      payment.trueMoneyQrUrl = wallet.qrUrl || payment.trueMoneyQrUrl || "";
      payment.trueMoneyQrPath = wallet.qrPath || payment.trueMoneyQrPath || "";
      payment.walletName = wallet.walletName || payment.walletName || "";
      if (!payment.paymentNote && wallet.note) payment.paymentNote = wallet.note;
    }

    return {
      ...next,
      payment,
      paymentChannels: normalizedChannels
    };
  }

  async function fetchStoreSettings() {
    const { data, error } = await requireClient()
      .from("store_settings")
      .select("settings, updated_at")
      .eq("id", "main")
      .maybeSingle();
    if (error) throw error;
    const settings = {
      ...normalizeObject(data?.settings),
      updatedAt: data?.updated_at || ""
    };
    const channels = await fetchPaymentChannels({ activeOnly: false }).catch((channelError) => {
      console.warn("Payment channels unavailable", channelError);
      return [];
    });
    return mergePaymentChannelsIntoSettings(settings, channels);
  }

  async function saveStoreSettings(settings) {
    const { data, error } = await requireClient().rpc("admin_save_store_settings", {
      p_settings: normalizeObject(settings)
    });
    if (error) throw error;
    return normalizeObject(data);
  }

  function mapProductRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      publisher: row.publisher,
      category: row.category || "all",
      label: row.label || "",
      price: Number(row.price || 0),
      compareAt: row.compare_at == null ? null : Number(row.compare_at),
      stock: Number(row.stock || 0),
      sold: Number(row.sold || 0),
      rating: row.rating || "",
      delivery: row.delivery || "",
      warranty: row.warranty || "",
      image: row.image_url || "",
      heroImage: row.hero_image_url || row.image_url || "",
      tags: normalizeArray(row.tags),
      description: row.description || "",
      gallery: normalizeArray(row.gallery),
      platformLinks: normalizeArray(row.platform_links),
      featureBlocks: normalizeArray(row.feature_blocks),
      detailSections: normalizeArray(row.detail_sections),
      systemRequirements: row.system_requirements || { minimum: [], recommended: [] },
      isActive: row.is_active !== false,
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  function mapProductPackageRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      productId: row.product_id || row.productId || "",
      title: row.title || "",
      subtitle: row.subtitle || "",
      description: row.description || "",
      price: Number(row.price || 0),
      compareAt: row.compare_at == null ? null : Number(row.compare_at),
      stock: Number(row.stock || 0),
      sold: Number(row.sold || 0),
      status: row.status || "active",
      sortOrder: Number(row.sort_order || 0),
      badge: row.badge || "",
      metadata: normalizeObject(row.metadata),
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  function mapOfflineStockItemRow(row) {
    if (!row) return null;
    return {
      id: row.id || "",
      productId: row.product_id || row.productId || "",
      content: row.content || "",
      status: row.status || "available",
      orderId: row.order_id || "",
      orderItemId: row.order_item_id || "",
      reservedBy: row.reserved_by || "",
      reservedAt: row.reserved_at || "",
      deliveredAt: row.delivered_at || "",
      createdBy: row.created_by || "",
      updatedBy: row.updated_by || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  function packageToRpcPayload(productId, pkg = {}) {
    const normalizedProductId = String(productId || pkg.productId || "").trim();
    const title = String(pkg.title || "").trim();
    if (!normalizedProductId) throw new Error("PRODUCT_REQUIRED");
    if (!title) throw new Error("PACKAGE_TITLE_REQUIRED");

    const price = Number(pkg.price || 0);
    const compareAt = pkg.compareAt === "" || pkg.compareAt == null ? null : Number(pkg.compareAt);
    const stock = Number(pkg.stock || 0);
    const sold = Number(pkg.sold || 0);
    const sortOrder = Number(pkg.sortOrder || 0);

    if (!Number.isFinite(price) || price < 0) throw new Error("INVALID_PACKAGE_PRICE");
    if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < 0)) throw new Error("INVALID_PACKAGE_COMPARE_AT");
    if (!Number.isInteger(stock) || stock < 0) throw new Error("INVALID_PACKAGE_STOCK");
    if (!Number.isInteger(sold) || sold < 0) throw new Error("INVALID_PACKAGE_SOLD");
    if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new Error("INVALID_PACKAGE_SORT_ORDER");

    return {
      p_product_id: normalizedProductId,
      p_id: pkg.id || null,
      p_title: title,
      p_subtitle: pkg.subtitle || null,
      p_description: pkg.description || null,
      p_price: price,
      p_compare_at: compareAt,
      p_stock: stock,
      p_sold: sold,
      p_status: pkg.status || "active",
      p_sort_order: sortOrder,
      p_badge: pkg.badge || null,
      p_metadata: normalizeObject(pkg.metadata)
    };
  }

  function productToRow(product) {
    return {
      id: String(product.id || "").trim(),
      name: String(product.name || "").trim(),
      publisher: product.publisher || null,
      category: product.category || "all",
      label: product.label || null,
      price: Number(product.price || 0),
      compare_at: product.compareAt == null ? null : Number(product.compareAt || 0),
      stock: Number(product.stock || 0),
      sold: Number(product.sold || 0),
      rating: product.rating || null,
      delivery: product.delivery || null,
      warranty: product.warranty || null,
      image_url: product.image || null,
      hero_image_url: product.heroImage || product.image || null,
      tags: normalizeArray(product.tags),
      description: product.description || null,
      gallery: normalizeArray(product.gallery),
      platform_links: normalizeArray(product.platformLinks),
      feature_blocks: normalizeArray(product.featureBlocks),
      detail_sections: normalizeArray(product.detailSections),
      system_requirements: product.systemRequirements || { minimum: [], recommended: [] },
      is_active: product.isActive !== false,
      sort_order: Number(product.sortOrder || 0)
    };
  }

  async function fetchActiveProducts() {
    const { data, error } = await requireClient()
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return normalizeArray(data).map(mapProductRow).filter(Boolean);
  }

  async function fetchProductById(productId) {
    const { data, error } = await requireClient()
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return mapProductRow(data);
  }

  async function fetchAdminProducts() {
    const { data, error } = await requireClient()
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return normalizeArray(data).map(mapProductRow).filter(Boolean);
  }

  async function upsertAdminProduct(product) {
    const row = productToRow(product);
    if (!row.id || !row.name) throw new Error("กรุณากรอก Product ID และชื่อสินค้า");
    delete row.stock;
    const { data, error } = await requireClient()
      .from("products")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return mapProductRow(data);
  }

  async function deactivateAdminProduct(productId) {
    const { data, error } = await requireClient()
      .from("products")
      .update({ is_active: false })
      .eq("id", productId)
      .select("*")
      .single();
    if (error) throw error;
    return mapProductRow(data);
  }

  async function setAdminProductStock({ productId, stock, note }) {
    const normalizedProductId = String(productId || "").trim();
    const normalizedStock = Number(stock);
    if (!normalizedProductId) throw new Error("PRODUCT_REQUIRED");
    if (!Number.isInteger(normalizedStock) || normalizedStock < 0) throw new Error("INVALID_STOCK");
    const client = requireClient();
    const { data, error } = await client.rpc("admin_set_product_stock", {
      p_product_id: normalizedProductId,
      p_stock: normalizedStock,
      p_note: note || "Admin stock adjustment"
    });
    if (!error) return mapProductRow(data);

    const message = String(error.message || "");
    const missingRpc =
      error.code === "PGRST202" ||
      error.code === "42883" ||
      message.includes("admin_set_product_stock") ||
      message.toLowerCase().includes("schema cache");
    if (!missingRpc) throw error;

    const { data: fallbackData, error: fallbackError } = await client
      .from("products")
      .update({ stock: normalizedStock })
      .eq("id", normalizedProductId)
      .select("*")
      .single();
    if (fallbackError) throw fallbackError;
    const mapped = mapProductRow(fallbackData);
    if (mapped) mapped._stockFallback = true;
    return mapped;
  }

  async function fetchProductPackages(productId) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) throw new Error("PRODUCT_REQUIRED");
    const { data, error } = await requireClient()
      .from("product_packages")
      .select("*")
      .eq("product_id", normalizedProductId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return normalizeArray(data).map(mapProductPackageRow).filter(Boolean);
  }

  async function fetchActiveProductPackages(productId) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) throw new Error("PRODUCT_REQUIRED");
    const { data, error } = await requireClient()
      .from("product_packages")
      .select("*")
      .eq("product_id", normalizedProductId)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return normalizeArray(data).map(mapProductPackageRow).filter(Boolean);
  }

  async function adminFetchProductPackages(productId) {
    return fetchProductPackages(productId);
  }

  async function adminSaveProductPackages(productId, packages = []) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) throw new Error("PRODUCT_REQUIRED");
    if (!Array.isArray(packages)) throw new Error("INVALID_PACKAGES_PAYLOAD");

    const saved = [];
    for (const pkg of packages) {
      if (pkg?._delete || pkg?.deleted) {
        if (pkg.id) await adminDeleteProductPackage(pkg.id);
        continue;
      }
      const payload = packageToRpcPayload(normalizedProductId, pkg);
      const { data, error } = await requireClient().rpc("admin_save_product_package", payload);
      if (error) throw error;
      const mapped = mapProductPackageRow(data);
      if (mapped) saved.push(mapped);
    }
    return saved.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }

  async function adminDeleteProductPackage(packageId) {
    const normalizedPackageId = String(packageId || "").trim();
    if (!normalizedPackageId) throw new Error("PACKAGE_REQUIRED");
    const { data, error } = await requireClient().rpc("admin_delete_product_package", {
      p_package_id: normalizedPackageId
    });
    if (error) throw error;
    return normalizeObject(data);
  }

  async function adminFetchOfflineStockItems(productId) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) throw new Error("PRODUCT_REQUIRED");
    const { data, error } = await requireClient().rpc("admin_fetch_offline_stock_items", {
      p_product_id: normalizedProductId
    });
    if (error) throw error;
    return normalizeArray(data).map(mapOfflineStockItemRow).filter(Boolean);
  }

  async function adminReplaceOfflineStockItems(productId, lines = []) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) throw new Error("PRODUCT_REQUIRED");
    const items = normalizeArray(lines)
      .map((line) => String(line || "").trim())
      .filter(Boolean);
    const { data, error } = await requireClient().rpc("admin_replace_offline_stock_items", {
      p_product_id: normalizedProductId,
      p_items: items
    });
    if (error) throw error;
    const payload = normalizeObject(data);
    return {
      product: mapProductRow(payload.product),
      items: normalizeArray(payload.items).map(mapOfflineStockItemRow).filter(Boolean),
      availableCount: Number(payload.availableCount || payload.available_count || 0)
    };
  }

  function mapOrderItemRow(row) {
    return {
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      productName: row.product_name,
      productImageUrl: row.product_image_url || "",
      name: row.product_name,
      image: row.product_image_url || "",
      unitPrice: Number(row.unit_price || 0),
      quantity: Number(row.quantity || 0),
      lineTotal: Number(row.line_total || 0),
      packageId: row.package_id || "",
      packageTitle: row.package_title || "",
      packageSubtitle: row.package_subtitle || "",
      packagePrice: row.package_price == null ? null : Number(row.package_price),
      packageSnapshot: normalizeObject(row.package_snapshot),
      createdAt: row.created_at || ""
    };
  }

  function mapOrderRow(row) {
    if (!row) return null;
    const items = normalizeArray(row.order_items || row.items).map(mapOrderItemRow);
    return {
      id: row.id,
      orderNumber: row.order_number || row.id,
      userId: row.user_id || "",
      customerName: row.customer_name || "",
      customerEmail: row.customer_email || "",
      contact: row.customer_email || "",
      status: row.status || "waiting_admin",
      subtotal: Number(row.subtotal || 0),
      fee: Number(row.fee || 0),
      total: Number(row.total || 0),
      currency: row.currency || "THB",
      paymentMethod: row.payment_method || "promptpay",
      paymentStatus: row.payment_status || "pending",
      paymentReference: row.payment_reference || "",
      paymentSlipPath: row.payment_slip_path || "",
      paymentSlipUrl: row.payment_slip_url || "",
      expiresAt: row.expires_at || "",
      stockReleased: row.stock_released === true,
      deliveryNote: row.delivery_note || "",
      deliveredPayload: row.delivered_payload || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
      items
    };
  }

  function mapRecentPurchaseRow(row) {
    if (!row) return null;
    return {
      orderNumber: row.orderNumber || row.order_number || "",
      buyerNameMasked: row.buyerNameMasked || row.buyer_name_masked || "ลูกค้าxxx",
      productName: row.productName || row.product_name || "",
      productImageUrl: row.productImageUrl || row.product_image_url || "",
      quantity: Number(row.quantity || 1),
      status: row.status || "",
      createdAt: row.createdAt || row.created_at || ""
    };
  }

  function mapOrderRpcPayload(payload) {
    const value = payload && typeof payload === "string" ? JSON.parse(payload) : payload;
    if (value?.order) {
      return mapOrderRow({
        ...value.order,
        order_items: value.items || []
      });
    }
    return mapOrderRow(value);
  }

  async function createPaymentSlipSignedUrl(path) {
    const slipPath = String(path || "").trim();
    if (!slipPath) return "";
    const { data, error } = await requireClient()
      .storage
      .from(PAYMENT_SLIP_BUCKET)
      .createSignedUrl(slipPath, 60 * 30);
    if (error) {
      console.warn("Unable to create payment slip signed URL", error);
      return "";
    }
    return data?.signedUrl || "";
  }

  async function withPaymentSlipUrl(order) {
    if (!order) return null;
    if (!order.paymentSlipPath || order.paymentSlipUrl) return order;
    return {
      ...order,
      paymentSlipUrl: await createPaymentSlipSignedUrl(order.paymentSlipPath)
    };
  }

  async function withPaymentSlipUrls(orders) {
    return Promise.all(normalizeArray(orders).map(withPaymentSlipUrl));
  }

  function mapPaymentChannelRow(row) {
    if (!row) return null;
    return {
      id: row.id || "",
      method: row.method || row.id || "",
      label: row.label || row.id || "",
      isActive: row.is_active !== false,
      sortOrder: Number(row.sort_order || 0),
      bankName: row.bank_name || "",
      accountNumber: row.account_number || "",
      accountName: row.account_name || "",
      walletName: row.wallet_name || "",
      note: row.note || "",
      qrPath: row.qr_path || "",
      qrUrl: row.qr_url || "",
      updatedAt: row.updated_at || ""
    };
  }

  async function createPaymentQrSignedUrl(path) {
    const qrPath = String(path || "").trim();
    if (!qrPath) return "";
    const { data, error } = await requireClient()
      .storage
      .from(PAYMENT_QR_BUCKET)
      .createSignedUrl(qrPath, 60 * 60);
    if (error) {
      console.warn("Unable to create payment QR signed URL", error);
      return "";
    }
    return data?.signedUrl || "";
  }

  async function withPaymentQrUrl(channel) {
    if (!channel) return null;
    if (!channel.qrPath || channel.qrUrl) return channel;
    return {
      ...channel,
      qrUrl: await createPaymentQrSignedUrl(channel.qrPath)
    };
  }

  async function withPaymentQrUrls(channels) {
    return Promise.all(normalizeArray(channels).map(withPaymentQrUrl));
  }

  async function fetchPaymentChannels({ activeOnly = true } = {}) {
    let query = requireClient()
      .from("payment_channels")
      .select("*")
      .order("sort_order", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return withPaymentQrUrls(normalizeArray(data).map(mapPaymentChannelRow).filter(Boolean));
  }

  function paymentChannelPayload(channel) {
    return {
      id: channel.id,
      label: channel.label,
      method: channel.method || channel.id,
      isActive: channel.isActive !== false,
      sortOrder: Number(channel.sortOrder || 0),
      bankName: channel.bankName || "",
      accountNumber: channel.accountNumber || "",
      accountName: channel.accountName || "",
      walletName: channel.walletName || "",
      note: channel.note || "",
      qrPath: channel.qrPath || "",
      qrUrl: channel.qrUrl || ""
    };
  }

  async function savePaymentChannels(channels) {
    const payload = normalizeArray(channels).map(paymentChannelPayload);
    const { data, error } = await requireClient().rpc("admin_save_payment_channels", {
      p_channels: payload
    });
    if (error) throw error;
    return withPaymentQrUrls(normalizeArray(data).map(mapPaymentChannelRow).filter(Boolean));
  }

  async function uploadPaymentQr({ channelId, file }) {
    const normalizedChannel = String(channelId || "").trim().toLowerCase();
    if (!["promptpay", "wallet"].includes(normalizedChannel)) throw new Error("PAYMENT_CHANNEL_REQUIRED");
    if (!file) throw new Error("QR_FILE_REQUIRED");
    if (!String(file.type || "").startsWith("image/")) throw new Error("QR_FILE_MUST_BE_IMAGE");
    if (Number(file.size || 0) > MAX_PAYMENT_QR_SIZE) throw new Error("QR_FILE_TOO_LARGE");

    const path = `${normalizedChannel}/${Date.now()}-${safeStorageFileName(file, "payment-qr.jpg")}`;
    const { error } = await requireClient()
      .storage
      .from(PAYMENT_QR_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
        upsert: false
      });
    if (error) throw error;

    return {
      path,
      signedUrl: await createPaymentQrSignedUrl(path)
    };
  }

  function safeStorageFileName(file, fallback = "payment-slip.jpg") {
    const source = String(file?.name || fallback).toLowerCase();
    const cleaned = source.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    return (cleaned || fallback).slice(0, 90);
  }

  async function uploadPaymentSlip({ orderId, file }) {
    if (!orderId) throw new Error("ORDER_REQUIRED");
    if (!file) throw new Error("SLIP_FILE_REQUIRED");
    if (!String(file.type || "").startsWith("image/")) throw new Error("SLIP_FILE_MUST_BE_IMAGE");
    if (Number(file.size || 0) > MAX_PAYMENT_SLIP_SIZE) throw new Error("SLIP_FILE_TOO_LARGE");

    const auth = requireClient().auth;
    const { data: userData, error: userError } = await auth.getUser();
    if (userError) throw userError;
    const user = userData?.user;
    if (!user) throw new Error("AUTH_REQUIRED");

    const path = `${user.id}/${orderId}/${Date.now()}-${safeStorageFileName(file)}`;
    const { error: uploadError } = await requireClient()
      .storage
      .from(PAYMENT_SLIP_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
        upsert: false
      });
    if (uploadError) throw uploadError;

    try {
      const { data, error } = await requireClient().rpc("attach_payment_slip", {
        p_order_id: orderId,
        p_slip_path: path
      });
      if (error) throw error;
      return withPaymentSlipUrl(mapOrderRpcPayload(data));
    } catch (error) {
      await requireClient().storage.from(PAYMENT_SLIP_BUCKET).remove([path]).catch(() => {});
      throw error;
    }
  }

  async function createOrder({ productId, quantity, paymentMethod, customerName, packageId }) {
    const payload = {
      p_product_id: productId,
      p_quantity: Number(quantity || 1),
      p_payment_method: paymentMethod || "promptpay",
      p_customer_name: customerName || ""
    };
    if (packageId) payload.p_package_id = packageId;

    const { data, error } = await requireClient().rpc("create_order", payload);
    if (error) throw error;
    return withPaymentSlipUrl(mapOrderRpcPayload(data));
  }

  async function fetchMyOrders() {
    const { data, error } = await requireClient()
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return withPaymentSlipUrls(normalizeArray(data).map(mapOrderRow).filter(Boolean));
  }

  async function fetchRecentPublicPurchases(limit = 10) {
    const safeLimit = Math.max(1, Math.min(20, Number(limit || 10)));
    const { data, error } = await requireClient().rpc("fetch_recent_public_purchases", {
      p_limit: safeLimit
    });
    if (error) throw error;
    return normalizeArray(data).map(mapRecentPurchaseRow).filter(Boolean);
  }

  async function fetchOrderById(orderId) {
    const { data, error } = await requireClient()
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    return withPaymentSlipUrl(mapOrderRow(data));
  }

  async function cancelMyOrder(orderId) {
    const { data, error } = await requireClient().rpc("cancel_my_order", {
      p_order_id: orderId
    });
    if (error) throw error;
    return withPaymentSlipUrl(mapOrderRpcPayload(data));
  }

  async function fetchAdminOrders() {
    const { data, error } = await requireClient()
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return withPaymentSlipUrls(normalizeArray(data).map(mapOrderRow).filter(Boolean));
  }

  async function adminUpdateOrder({ orderId, status, deliveryNote, deliveredPayload }) {
    const { data, error } = await requireClient().rpc("admin_update_order", {
      p_order_id: orderId,
      p_status: status || null,
      p_delivery_note: deliveryNote ?? null,
      p_delivered_payload: deliveredPayload ?? null
    });
    if (error) throw error;
    return withPaymentSlipUrl(mapOrderRpcPayload(data));
  }

  async function fetchStockMovements() {
    const { data, error } = await requireClient()
      .from("stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return normalizeArray(data).map((row) => ({
      id: row.id,
      productId: row.product_id,
      packageId: row.package_id || "",
      orderId: row.order_id,
      movementType: row.movement_type,
      quantityChange: Number(row.quantity_change || 0),
      note: row.note || "",
      createdBy: row.created_by || "",
      createdAt: row.created_at || ""
    }));
  }

  window.olafSupabase = client;
  window.OlafSupabaseAuth = {
    isConfigured,
    getCurrentUser,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    updatePassword,
    buildOAuthRedirectUrl,
    getOAuthReturnTo
  };
  window.OlafProducts = {
    mapProductRow,
    mapProductPackageRow,
    mapOfflineStockItemRow,
    fetchActiveProducts,
    fetchProductById,
    fetchAdminProducts,
    upsertAdminProduct,
    deactivateAdminProduct,
    setAdminProductStock,
    fetchProductPackages,
    fetchActiveProductPackages,
    adminFetchProductPackages,
    adminSaveProductPackages,
    adminDeleteProductPackage,
    adminFetchOfflineStockItems,
    adminReplaceOfflineStockItems
  };
  window.OlafAdminUsers = {
    fetchAdminUsers,
    saveAdminUser,
    disableAdminUser
  };
  window.OlafStoreSettings = {
    fetchStoreSettings,
    saveStoreSettings,
    fetchPaymentChannels,
    savePaymentChannels,
    uploadPaymentQr,
    createPaymentQrSignedUrl
  };
  window.OlafOrders = {
    mapOrderRow,
    createOrder,
    fetchMyOrders,
    fetchOrderById,
    cancelMyOrder,
    fetchRecentPublicPurchases,
    fetchAdminOrders,
    adminUpdateOrder,
    uploadPaymentSlip,
    createPaymentSlipSignedUrl,
    fetchStockMovements
  };
})();
