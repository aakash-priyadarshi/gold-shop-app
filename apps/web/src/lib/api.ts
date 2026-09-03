import { toast } from "@/hooks/use-toast";
import { sanitizeRedirectUrl } from "@/lib/redirect-validation";
import axios from "axios";

// Ensure the API URL always ends with /api
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE_URL = rawApiUrl.endsWith("/api")
  ? rawApiUrl
  : `${rawApiUrl}/api`;

// Export for use in other files that need the base URL
export const getApiUrl = () => API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; path=/; SameSite=Lax${secure}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (window.location.hostname.endsWith("orivraa.com")) {
    document.cookie = `${name}=; path=/; domain=.orivraa.com; SameSite=Lax${secure}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

function setCookie(name: string, value: string, maxAge?: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const domain = window.location.hostname.endsWith("orivraa.com")
    ? "; domain=.orivraa.com"
    : "";
  const expiry = maxAge ? `; max-age=${maxAge}` : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}${domain}${expiry}`;
}

// Routes that are publicly accessible — no login required, no login redirect
// when a session expires. Prefix-matched against window.location.pathname.
const PUBLIC_ROUTE_PREFIXES = [
  "/about",
  "/ai-sales-team",
  "/auth/",
  "/blog",
  "/c/",
  "/compare/",
  "/contact",
  "/demo",
  "/designs",
  "/download",
  "/for-sellers",
  "/jewellery-ecommerce-software",
  "/jewellery-inventory-software",
  "/jewellery-pos-software",
  "/jewellery-shop-billing-software",
  "/jewellery-shop-software",
  "/jewellery-store-management-software",
  "/np/",
  "/partner",
  "/platform-guidelines",
  "/pricing",
  "/privacy",
  "/refund",
  "/seller-guide",
  "/shop",
  "/shops",
  "/support",
  "/terms",
  "/track/",
  "/verify-bill/",
  "/tutorial",
  "/uae/",
  "/uk/",
  "/us/",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

function clearTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("orivraa_remember_me");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("refreshToken");
  clearCookie("token");
  clearCookie("refreshToken");
}

function forceLogout() {
  clearTokens();

  // On public pages, don't redirect to login — just silently clear the expired
  // session so the user sees the page as a guest. Redirecting Googlebot (and
  // real users) to the login page from public routes is the #1 SEO killer.
  if (
    typeof window !== "undefined" &&
    isPublicRoute(window.location.pathname)
  ) {
    return;
  }

  toast({
    title: "Session Expired",
    description: "Your session timed out. Please log in to continue.",
    variant: "destructive",
  });

  const returnTo = encodeURIComponent(
    sanitizeRedirectUrl(window.location.pathname + window.location.search),
  );
  window.location.href = `/auth/login?returnTo=${returnTo}`;
}

// Track whether a token refresh is already in-flight so parallel 401s
// queue up behind it instead of each triggering their own refresh.
let refreshPromise: Promise<string> | null = null;

async function attemptTokenRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const storedRefresh =
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("refreshToken") ||
      readCookie("refreshToken");
    if (!storedRefresh) throw new Error("no_refresh_token");

    // Use a plain axios call (not the intercepted `api`) to avoid loops.
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: storedRefresh,
    });

    const { accessToken, refreshToken, expiresIn } = response.data as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };

    // Preserve "remember me" routing: use the flag set by storeTokens/storeOAuthTokens.
    const rememberMeMaxAge = 60 * 60 * 24 * 30;
    const hadRememberMe = localStorage.getItem("orivraa_remember_me") === "1";
    const maxAge = hadRememberMe ? rememberMeMaxAge : undefined;

    if (hadRememberMe) {
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("refreshToken");
    } else {
      sessionStorage.setItem("token", accessToken);
      sessionStorage.setItem("refreshToken", refreshToken);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
    setCookie("token", accessToken, maxAge);
    setCookie("refreshToken", refreshToken, maxAge);

    return accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Request interceptor to add auth token and currency header
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Add auth token — check both persistent (localStorage) and session storage
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      readCookie("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Blob downloads (PDF/CSV) must not send JSON Content-Type — that forces a
    // CORS preflight and some mobile browsers then fail to read the body.
    if (config.responseType === "blob") {
      const headers = config.headers as {
        delete?: (name: string) => void;
        Accept?: string;
      };
      if (typeof headers.delete === "function") {
        headers.delete("Content-Type");
      } else {
        delete (config.headers as Record<string, unknown>)["Content-Type"];
      }
      if (!headers.Accept) {
        headers.Accept = "*/*";
      }
    }

    // Add currency header from preferences store
    try {
      const prefsJson = localStorage.getItem("gold-shop-preferences");
      if (prefsJson) {
        const prefs = JSON.parse(prefsJson);
        if (prefs.state?.currency) {
          config.headers["X-Currency"] = prefs.state.currency;
        }
      }
    } catch {
      // Fallback to NPR if preferences can't be read
      config.headers["X-Currency"] = "NPR";
    }
  }
  return config;
});

// Response interceptor — try a silent token refresh before giving up.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/auth/login"
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await attemptTokenRefresh();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh token is also expired / missing — hard logout.
        forceLogout();
      }
    }

    if (typeof window !== "undefined") {
      const status = error.response?.status as number | undefined;
      const url = String(error.config?.url || "");
      if (!url.includes("/crash-reports")) {
        if (status && status >= 500) {
          window.dispatchEvent(new CustomEvent("orivraa:api_error"));
        }
        if (!status || status >= 500) {
          void import("@/lib/reportUserFacingError").then(
            ({ reportApiFailure }) => {
              reportApiFailure(error);
            },
          );
        }
      }
    }

    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    referralCode?: string;
  }) => api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),
  checkEmail: (email: string) =>
    api.get<{ exists: boolean }>("/auth/check-email", { params: { email } }),
  checkPhone: (phone: string) =>
    api.get<{ exists: boolean }>("/auth/check-phone", { params: { phone } }),
};

// Users API
export const usersApi = {
  getProfile: () => api.get("/users/me"),
  updateProfile: (data: any) => api.patch("/users/me", data),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch("/users/me/password", data),
  createPassword: (data: { newPassword: string }) =>
    api.post("/users/me/create-password", data),
};

// Shops API
export const shopsApi = {
  getAll: (params?: any) => api.get("/shops", { params }),
  getById: (id: string) => api.get(`/shops/${id}`),
  getComponentPricingPublic: (shopId: string) =>
    api.get(`/shops/${shopId}/component-pricing`),
  getMyShop: () => api.get("/shops/my-shop"),
  create: (data: any) => api.post("/shops", data),
  update: (id: string, data: any) => api.patch(`/shops/${id}`, data),
  updateRates: (id: string, data: any) =>
    api.patch(`/shops/${id}/metal-rates`, data),
  getDashboard: () => api.get("/shops/my-shop/dashboard"),
  hydrateDemoStore: () => api.post("/shops/my-shop/demo-hydrate"),
  getSettings: () => api.get("/shops/my-shop/settings"),
  updateSettings: (data: any) => api.patch("/shops/my-shop/settings", data),
  getManagerPinStatus: () => api.get("/shops/my-shop/manager-pin"),
  setupManagerPin: (data: { pin: string; discountThreshold?: number }) =>
    api.post("/shops/my-shop/manager-pin", data),
  verifyManagerPin: (pin: string) =>
    api.post("/shops/my-shop/manager-pin/verify", { pin }),
  removeManagerPin: (pin: string) =>
    api.post("/shops/my-shop/manager-pin/remove", { pin }),
  updateManagerPinThreshold: (discountThreshold: number) =>
    api.patch("/shops/my-shop/manager-pin/threshold", { discountThreshold }),
  getAnalytics: (params?: any) =>
    api.get("/shops/my-shop/analytics", { params }),
  // Inventory materials management
  getMaterials: () => api.get("/shops/my-shop/materials"),
  updateMaterials: (data: any) => api.put("/shops/my-shop/materials", data),
  // Business and tax details (legacy /kyc route retained for compatibility)
  getKyc: () => api.get("/shops/my-shop/kyc"),
  updateKyc: (data: {
    panNumber?: string;
    vatNumber?: string;
    bisLicenseNumber?: string;
    verificationDocuments?: Record<string, string | null>;
  }) => api.patch("/shops/my-shop/kyc", data),
  // Capabilities management
  getCapabilities: () => api.get("/shops/my-shop/capabilities"),
  updateCapabilities: (data: any) =>
    api.put("/shops/my-shop/capabilities", data),
  // Gemstone pricing management
  getGemstonePricing: () => api.get("/shops/my-shop/gemstone-pricing"),
  updateGemstonePricing: (data: any) =>
    api.put("/shops/my-shop/gemstone-pricing", data),
  // Component pricing (base metals, plating, finishes)
  getComponentPricing: () => api.get("/shops/my-shop/component-pricing"),
  updateComponentPricing: (data: any) =>
    api.put("/shops/my-shop/component-pricing", data),
  // Profile
  updateProfile: (data: {
    about?: string;
    profileImage?: string;
    coverImage?: string;
    shopName?: string;
  }) => api.patch("/shops/my-shop/profile", data),
  moderateAbout: (text: string) =>
    api.post("/shops/my-shop/moderate-about", { text }),
  // Reviews
  getMyReviews: (params?: { page?: number; pageSize?: number }) =>
    api.get("/shops/my-shop/reviews", { params }),
  replyToReview: (reviewId: string, reply: string) =>
    api.patch(`/shops/my-shop/reviews/${reviewId}/reply`, { reply }),
  requestReviewDeletion: (reviewId: string, reason: string) =>
    api.post(`/shops/my-shop/reviews/${reviewId}/request-delete`, { reason }),
};

// Inventory API
export const inventoryApi = {
  getAll: (params?: any) => api.get("/inventory", { params }),
  getById: (id: string) => api.get(`/inventory/${id}`),
  create: (shopId: string, data: any) =>
    api.post(`/inventory/shop/${shopId}`, data),
  generateDescription: (
    shopId: string,
    data: {
      jewelleryType?: string;
      metalType?: string;
      purity?: string;
      weightGrams?: number;
      weightUnit?: "GRAM" | "TOLA";
      gemstones?: Array<{ type?: string; cut?: string; caratWeight?: number }>;
      idempotencyKey?: string;
    },
  ) => api.post(`/inventory/shop/${shopId}/generate-description`, data),
  update: (id: string, data: any) => api.patch(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  getShopInventory: (shopId: string, params?: any) =>
    api.get(`/inventory/shop/${shopId}/items`, { params }),
  getStats: (shopId: string) => api.get(`/inventory/shop/${shopId}/stats`),
  lookupByCode: (shopId: string, code: string) =>
    api.get(`/inventory/shop/${shopId}/lookup`, { params: { code } }),
  prepareMultiTagPrint: (shopId: string, itemIds: string[], copies: number) =>
    api.post(`/inventory/shop/${shopId}/tag-print/multi`, { itemIds, copies }),
  updateVisibility: (itemId: string, visibility: string) =>
    api.patch(`/catalogues/inventory/${itemId}/visibility`, { visibility }),
  // Storage locations
  getStorageLocations: (shopId: string) =>
    api.get(`/inventory/shop/${shopId}/storage-locations`),
  createStorageLocation: (shopId: string, data: any) =>
    api.post(`/inventory/shop/${shopId}/storage-locations`, data),
  updateStorageLocation: (shopId: string, locationId: string, data: any) =>
    api.patch(`/inventory/shop/${shopId}/storage-locations/${locationId}`, data),
  archiveStorageLocation: (shopId: string, locationId: string) =>
    api.delete(`/inventory/shop/${shopId}/storage-locations/${locationId}`),
  transferLocation: (
    shopId: string,
    data: { itemIds: string[]; locationId?: string | null },
  ) => api.post(`/inventory/shop/${shopId}/transfer-location`, data),
  // Sets
  createSet: (shopId: string, data: any) =>
    api.post(`/inventory/shop/${shopId}/sets`, data),
  getSet: (shopId: string, setId: string) =>
    api.get(`/inventory/shop/${shopId}/sets/${setId}`),
  updateSet: (shopId: string, setId: string, data: any) =>
    api.patch(`/inventory/shop/${shopId}/sets/${setId}`, data),
  breakSet: (shopId: string, setId: string) =>
    api.post(`/inventory/shop/${shopId}/sets/${setId}/break`),
  // Stock audit (RFID / barcode)
  startStockAudit: (shopId: string, data?: { notes?: string }) =>
    api.post(`/inventory/shop/${shopId}/stock-audits`, data || {}),
  listStockAudits: (shopId: string) =>
    api.get(`/inventory/shop/${shopId}/stock-audits`),
  getStockAudit: (shopId: string, auditId: string) =>
    api.get(`/inventory/shop/${shopId}/stock-audits/${auditId}`),
  scanStockAudit: (shopId: string, auditId: string, code: string) =>
    api.post(`/inventory/shop/${shopId}/stock-audits/${auditId}/scan`, { code }),
  completeStockAudit: (shopId: string, auditId: string) =>
    api.post(`/inventory/shop/${shopId}/stock-audits/${auditId}/complete`),
  cancelStockAudit: (shopId: string, auditId: string) =>
    api.post(`/inventory/shop/${shopId}/stock-audits/${auditId}/cancel`),
  repricePreview: (
    shopId: string,
    data: {
      itemIds?: string[];
      metalTypes?: string[];
      mode?: "FROM_SHOP_RATES" | "FROM_MARKET_RATES";
      makingChargeMode?: "KEEP" | "RECALC_PERCENT";
      makingChargePercent?: number;
    },
  ) => api.post(`/inventory/shop/${shopId}/reprice/preview`, data),
  repriceApply: (
    shopId: string,
    data: {
      updates: Array<{
        itemId: string;
        metalValueNpr: number;
        makingChargeNpr: number;
        gemstoneValueNpr?: number;
        taxNpr?: number;
        totalPriceNpr: number;
      }>;
      reason?: string;
      rateSnapshot?: Record<string, number>;
    },
  ) => api.post(`/inventory/shop/${shopId}/reprice/apply`, data),
};

// Girvi / Gold Loan (pawn lending) API
export const goldLoansApi = {
  list: (limit?: number) =>
    api.get("/gold-loans", { params: limit ? { limit } : undefined }),
  create: (data: {
    clientId?: string;
    loanNumber?: string;
    customerName: string;
    customerPhone?: string;
    principal: number;
    interestRate: number;
    rateType?: string;
    interestType?: string;
    compoundFrequency?: string;
    pawnedItems: Array<{
      name: string;
      purity: string;
      grossWeight: number;
      netWeight: number;
    }>;
    currency?: string;
    loanDate?: string;
    notes?: string;
  }) => api.post("/gold-loans", data),
  updateStatus: (
    id: string,
    data: { status: string; redeemedDate?: string },
  ) => api.patch(`/gold-loans/${id}/status`, data),
};

export const chitApi = {
  list: (status?: string) =>
    api.get("/chit-groups", { params: status ? { status } : undefined }),
  get: (id: string) => api.get(`/chit-groups/${id}`),
  create: (data: {
    name: string;
    chitValue: number;
    memberSlots: number;
    installmentAmount?: number;
    foremanCommissionPercent?: number;
    currency?: string;
    startDate?: string;
  }) => api.post("/chit-groups", data),
  addMember: (
    id: string,
    data: { customerName: string; customerPhone?: string; ticketNumber?: number },
  ) => api.post(`/chit-groups/${id}/members`, data),
  openCycle: (id: string, data?: { dueDate?: string }) =>
    api.post(`/chit-groups/${id}/cycles`, data ?? {}),
  listCycles: (id: string) => api.get(`/chit-groups/${id}/cycles`),
  arrears: (id: string) => api.get(`/chit-groups/${id}/arrears`),
  recordPayment: (
    id: string,
    cycleId: string,
    data: { memberId: string; amount?: number; clientId?: string },
  ) => api.post(`/chit-groups/${id}/cycles/${cycleId}/payments`, data),
  declareWinner: (
    id: string,
    cycleId: string,
    data: { winnerMemberId: string },
  ) => api.post(`/chit-groups/${id}/cycles/${cycleId}/winner`, data),
};

// Karigar / supply-chain API
export const karigarApi = {
  getSnapshot: () => api.get("/karigar/snapshot"),
  saveSnapshot: (data: {
    vaultReserves: Record<string, number>;
    workshops: any[];
    jobs?: any[];
    customMaterials?: Array<{ key: string; label: string; vaultKey: string }>;
  }) => api.put("/karigar/snapshot", data),
  createJob: (data: {
    product: string;
    artisan: string;
    workshopId: string;
    grossWeight?: number;
    metalKey?: string;
    allowedWastagePercent?: number;
    dueAt?: string;
    priority?: string;
    qty?: number;
    sizeLabel?: string;
    purity?: string;
    metalColor?: string;
    notes?: string;
  }) => api.post("/karigar/jobs", data),
  updateJob: (jobId: string, data: Record<string, unknown>) =>
    api.patch(`/karigar/jobs/${jobId}`, data),
  deleteJob: (jobId: string) => api.delete(`/karigar/jobs/${jobId}`),
  deleteWorkshop: (workshopId: string) =>
    api.delete(`/karigar/workshops/${workshopId}`),
  addMovement: (
    data: {
      type: string;
      weightGrams: number;
      workshopId?: string;
      stage?: string;
      metalKey?: string;
      note?: string;
      lotId?: string;
    },
    jobId?: string,
  ) =>
    jobId
      ? api.post(`/karigar/jobs/${jobId}/movements`, data)
      : api.post("/karigar/movements", data),
  updateStage: (
    jobId: string,
    stage: string,
    data: {
      goldInGrams?: number;
      goldOutGrams?: number;
      scrapGrams?: number;
      dustGrams?: number;
      allowedWastagePercent?: number;
      workshopId?: string;
      status?: string;
    },
  ) => api.patch(`/karigar/jobs/${jobId}/stages/${stage}`, data),
  createTree: (
    jobId: string,
    data: { label?: string; issuedGrams: number; allowedWastagePercent?: number; purity?: string },
  ) => api.post(`/karigar/jobs/${jobId}/trees`, data),
  updateTree: (
    jobId: string,
    treeId: string,
    data: {
      issuedGrams?: number;
      finishedGrams?: number;
      sprueButtonGrams?: number;
      recoverableGrams?: number;
      allowedWastagePercent?: number;
      lines?: Array<{ label: string; weightGrams: number }>;
    },
  ) => api.patch(`/karigar/jobs/${jobId}/trees/${treeId}`, data),
  goldLoss: (params?: { from?: string; to?: string }) =>
    api.get("/karigar/gold-loss", { params }),
  loadSampleJob: () => api.post("/karigar/sample-job"),
  getJob: (jobId: string) => api.get(`/karigar/jobs/${jobId}`),
  workshopTower: () => api.get("/karigar/workshop/tower"),
  workshopFloor: (dept?: string) =>
    api.get("/karigar/workshop/floor", { params: dept ? { dept } : {} }),
  advanceFloor: (
    jobId: string,
    data: { goldOutGrams?: number; notes?: string; photos?: string[] },
  ) => api.post(`/karigar/jobs/${jobId}/advance`, data),
  inspectQc: (
    jobId: string,
    data: {
      decision: "APPROVED" | "REWORK" | "REJECTED";
      rejectionReason?: string;
      reworkToStage?: string;
      notes?: string;
    },
  ) => api.post(`/karigar/jobs/${jobId}/qc`, data),
  receiveFg: (
    jobId: string,
    data?: { sku?: string; nameEn?: string; jewelleryType?: string },
  ) => api.post(`/karigar/jobs/${jobId}/receive-fg`, data ?? {}),
  getAccount: (workshopId: string) =>
    api.get(`/karigar/workshops/${workshopId}/account`),
  getStatement: (
    workshopId: string,
    params?: {
      type?: string;
      from?: string;
      to?: string;
      jobId?: string;
      limit?: number;
      cursor?: string;
    },
  ) =>
    api.get(`/karigar/workshops/${workshopId}/account/statement`, { params }),
  recordPayment: (
    workshopId: string,
    data: {
      amount: number;
      paymentMethod?: string;
      reference?: string;
      note?: string;
      idempotencyKey: string;
      allocations?: Array<{ jobId: string; amount: number }>;
    },
  ) => api.post(`/karigar/workshops/${workshopId}/account/payment`, data),
  recordAdvance: (
    workshopId: string,
    data: {
      amount: number;
      paymentMethod?: string;
      reference?: string;
      note?: string;
      idempotencyKey: string;
    },
  ) => api.post(`/karigar/workshops/${workshopId}/account/advance`, data),
  recordAdjustment: (
    workshopId: string,
    data: {
      type: "ADJUSTMENT_INCREASE" | "ADJUSTMENT_DECREASE";
      amount: number;
      note: string;
      idempotencyKey: string;
    },
  ) => api.post(`/karigar/workshops/${workshopId}/account/adjustment`, data),
  recordMetalReturn: (
    workshopId: string,
    data: {
      type: "RETURN_FINISHED" | "RETURN_UNUSED" | "RETURN_SPRUE" | "SCRAP" | "DUST";
      weightGrams: number;
      metalKey: string;
      jobId?: string;
      note?: string;
      idempotencyKey: string;
    },
  ) => api.post(`/karigar/workshops/${workshopId}/account/metal-return`, data),
  getJobCostSummary: (jobId: string) =>
    api.get(`/karigar/jobs/${jobId}/cost-summary`),
};

// RFQ API
export const rfqApi = {
  create: (data: any) => api.post("/rfq", data),
  getMyRequests: (params?: any) => api.get("/rfq/my-requests", { params }),
  getById: (id: string) => api.get(`/rfq/${id}`),
  update: (id: string, data: any) => api.patch(`/rfq/${id}`, data),
  broadcast: (id: string, data: any) => api.post(`/rfq/${id}/broadcast`, data),
  getOffers: (id: string) => api.get(`/offers/rfq/${id}`),
  selectOffer: (id: string, offerId: string) =>
    api.post(`/rfq/${id}/select-offer`, { offerId }),
  getEligibleShops: (id: string, customerCity?: string) =>
    api.get(`/rfq/${id}/eligible-shops`, { params: { customerCity } }),
  getShopRequests: (params?: any) => api.get("/rfq/shop-requests", { params }),
  createWalkInRfq: (data: any) => api.post("/rfq/walk-in", data),
};

// Catalogue API
export const catalogueApi = {
  // Seller CRUD
  create: (data: any) => api.post("/catalogues", data),
  getMyCatalogues: (params?: any) => api.get("/catalogues/my", { params }),
  getById: (id: string) => api.get(`/catalogues/${id}`),
  update: (id: string, data: any) => api.patch(`/catalogues/${id}`, data),
  delete: (id: string) => api.delete(`/catalogues/${id}`),
  // Items
  addItem: (catalogueId: string, data: any) =>
    api.post(`/catalogues/${catalogueId}/items`, data),
  updateItem: (catalogueId: string, itemId: string, data: any) =>
    api.patch(`/catalogues/${catalogueId}/items/${itemId}`, data),
  removeItem: (catalogueId: string, itemId: string) =>
    api.delete(`/catalogues/${catalogueId}/items/${itemId}`),
  reorderItems: (catalogueId: string, data: any) =>
    api.post(`/catalogues/${catalogueId}/items/reorder`, data),
  // Analytics
  getAnalytics: (id: string) => api.get(`/catalogues/${id}/analytics`),
  // Public
  getPublicCatalogue: (slug: string) => api.get(`/public/catalogues/${slug}`),
  unlockCatalogue: (slug: string, password: string) =>
    api.post(`/public/catalogues/${slug}/unlock`, { password }),
  getPublicItems: (slug: string, token?: string) =>
    api.get(`/public/catalogues/${slug}/items`, {
      headers: token ? { "x-catalogue-token": token } : {},
    }),
  recordView: (slug: string) => api.post(`/public/catalogues/${slug}/view`),
  requestQuote: (slug: string, data: any) =>
    api.post(`/public/catalogues/${slug}/request-quote`, data),
  messageShop: (slug: string) =>
    api.post(`/public/catalogues/${slug}/message-shop`),
};

// Chat Catalogue Integration API
export const chatCatalogueApi = {
  shareCatalogue: (
    conversationId: string,
    data: { catalogueSlug: string; mode?: string },
  ) => api.post(`/chat/conversations/${conversationId}/share-catalogue`, data),
  shareProducts: (
    conversationId: string,
    data: { items: { inventoryItemId: string; variantId?: string }[] },
  ) => api.post(`/chat/conversations/${conversationId}/share-products`, data),
  createWalkInRfq: (conversationId: string, data: any) =>
    api.post(`/chat/conversations/${conversationId}/walk-in-rfq`, data),
};

// Offers API
export const offersApi = {
  create: (data: any) => api.post("/offers", data),
  update: (id: string, data: any) => api.patch(`/offers/${id}`, data),
  accept: (id: string) => api.post(`/offers/${id}/accept`),
  counter: (id: string, data: any) => api.post(`/offers/${id}/counter`, data),
  decline: (id: string, reason?: string) =>
    api.post(`/offers/${id}/decline`, { reason }),
  getByRfq: (rfqId: string) => api.get(`/offers/rfq/${rfqId}`),
  withdraw: (id: string) => api.patch(`/offers/${id}/withdraw`),
};

// Orders API
export const ordersApi = {
  createInventoryOrder: (data: any) => api.post("/orders/inventory", data),
  createCustomOrder: (data: any) => api.post("/orders/custom", data),
  getMyOrders: (params?: any) => api.get("/orders/my-orders", { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  payOrder: (
    id: string,
    preferredGateway: string | undefined,
    idempotencyKey: string,
  ) => api.post(`/orders/${id}/pay`, { preferredGateway, idempotencyKey }),
  cancel: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  // For shopkeepers
  getShopOrders: (shopId: string, params?: any) =>
    api.get(`/orders/shop/${shopId}`, { params }),
  updateStatus: (id: string, data: any) =>
    api.patch(`/orders/${id}/status`, data),
  addMilestone: (id: string, data: any) =>
    api.post(`/orders/${id}/milestones`, data),
  completeMilestone: (orderId: string, milestoneId: string) =>
    api.patch(`/orders/${orderId}/milestones/${milestoneId}/complete`),
};

// Payments API
export const paymentsApi = {
  initiatePayment: (data: any) => api.post("/payments/initiate", data),
  initiateBookingPayment: (data: any) => api.post("/payments/booking", data),
  verifyPayment: (data: any) => api.post("/payments/verify", data),
  getOrderPayments: (orderId: string) => api.get(`/payments/order/${orderId}`),
  getMyPayments: (params?: any) => api.get("/payments/my-payments", { params }),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: any) => api.get("/notifications", { params }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  getTestScenarios: () => api.get("/notifications/test/scenarios"),
  sendTest: (data: { scenario: string; targetRole?: "ADMIN" | "SHOPKEEPER" }) =>
    api.patch("/notifications/test/send", data),
};

// OTP API
export const otpApi = {
  send: (
    type: "EMAIL_VERIFICATION" | "PHONE_VERIFICATION" | "PASSWORD_RESET",
    target?: string,
  ) => api.post("/otp/send", { type, target }),
  verify: (
    type: "EMAIL_VERIFICATION" | "PHONE_VERIFICATION" | "PASSWORD_RESET",
    code: string,
  ) => api.post("/otp/verify", { type, code }),
  resend: (
    type: "EMAIL_VERIFICATION" | "PHONE_VERIFICATION" | "PASSWORD_RESET",
  ) => api.post("/otp/resend", { type }),
};

// Admin API
export const adminApi = {
  // Stats
  getStats: () => api.get("/admin/stats"),

  // Reports
  getReports: (status?: string) =>
    api.get("/admin/reports", { params: status ? { status } : undefined }),
  resolveReport: (id: string, resolution: string) =>
    api.patch(`/admin/reports/${id}/resolve`, { resolution }),

  // User management
  createUser: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
  }) => api.post("/admin/users", data),

  getUserDetails: (userId: string) => api.get(`/users/${userId}/details`),
  getUserSessions: (userId: string, page = 1) =>
    api.get(`/users/${userId}/sessions`, { params: { page } }),
  getUserAuthSessions: (userId: string) =>
    api.get(`/users/${userId}/auth-sessions`),
  revokeAuthSession: (userId: string, sessionId: string) =>
    api.delete(`/users/${userId}/auth-sessions/${sessionId}`),
  getUserAuditLog: (userId: string, page = 1) =>
    api.get(`/users/${userId}/audit-log`, { params: { page } }),
  getOnlineNow: () => api.get("/users/stats/online-now"),

  updateUser: (
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      role?: string;
      status?: string;
    },
  ) => api.patch(`/users/${userId}/admin-update`, data),

  setPhoneVerified: (userId: string, verified: boolean) =>
    api.patch(`/users/${userId}/admin-phone-verify`, { verified }),

  deleteUser: (userId: string) => api.delete(`/users/${userId}`),

  // Shop management
  createShop: (data: {
    ownerEmail: string;
    ownerPassword: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerPhone?: string;
    shopName: string;
    city: string;
    address: string;
    contactPhone: string;
    contactEmail?: string;
    country?: string;
  }) => api.post("/admin/shops", data),

  // Settings
  getSettings: () => api.get("/admin/settings"),
  updateSettings: (data: Record<string, any>) =>
    api.patch("/admin/settings", data),
  refreshMarketRates: () => api.post("/admin/settings/refresh-rates"),
  clearCache: () => api.post("/admin/settings/clear-cache"),

  // System notifications
  broadcastNotification: (data: {
    title: string;
    message: string;
    type: string;
    targetRoles?: string[];
  }) => api.post("/admin/notifications/broadcast", data),
  getSystemNotifications: () => api.get("/admin/notifications/system"),

  // Email settings
  getEmailLogs: (params?: { page?: number; limit?: number; type?: string; direction?: string }) =>
    api.get("/admin/emails", { params }),
  aiComposeEmail: (data: { prompt: string; recipientName?: string; recipientRole?: string }) =>
    api.post<{ success: boolean; subject: string; message: string }>("/admin/messages/ai-compose", data),
  getEmailTriggers: () => api.get("/admin/email/triggers"),
  getEmailTemplates: () => api.get("/admin/email/templates"),
  getEmailTemplate: (id: string) => api.get(`/admin/email/templates/${id}`),
  createEmailTemplate: (data: Record<string, any>) =>
    api.post("/admin/email/templates", data),
  updateEmailTemplate: (id: string, data: Record<string, any>) =>
    api.patch(`/admin/email/templates/${id}`, data),
  deleteEmailTemplate: (id: string) => api.delete(`/admin/email/templates/${id}`),
  previewEmailTemplate: (id: string, context?: Record<string, any>) =>
    api.post(`/admin/email/templates/${id}/preview`, { context }),
  previewEmailTemplateDraft: (data: Record<string, any>) =>
    api.post("/admin/email/templates/preview", data),
  searchUsers: (q: string) =>
    api.get<{ users: { id: string; firstName: string; lastName: string; email: string; role: string }[] }>(
      "/admin/users/search",
      { params: { q } },
    ),
  sendMessage: (data: {
    recipientId?: string;
    recipientEmail?: string;
    recipientName?: string;
    content: string;
    subject?: string;
    threadId?: string;
  }) => api.post<{ success: boolean; messageId?: string; threadId: string }>("/admin/messages/send", data),
  getEmailStatus: () => api.get("/admin/email/status"),

  sendTestEmail: (email: string) => api.post("/admin/email/test", { email }),
  updateAdminEmail: (data: { email: string; currentPassword: string }) =>
    api.patch("/admin/email/admin-address", data),

  // AI Description Service
  getAiDescriptionServiceStatus: () =>
    api.get("/designs/admin/description-service-status"),
  updateAiDescriptionDailyLimit: (limit: number) =>
    api.patch("/designs/admin/description-service/daily-limit", { limit }),
  resetAiDescriptionRateLimit: () =>
    api.post("/designs/admin/description-service/reset-rate-limit"),
  clearAiDescriptionQueue: () =>
    api.post("/designs/admin/description-service/clear-queue"),
  processAiDescriptionQueue: () =>
    api.post("/designs/admin/description-service/process-queue"),

  // Customer CRM (admin-level, cross-shop)
  getCustomers: (params: {
    query?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => api.get("/admin/customers", { params }),
  getCustomerProfile: (customerId: string) =>
    api.get(`/admin/customers/${customerId}`),
  addCustomerNote: (
    customerId: string,
    data: { note: string; category?: string },
  ) => api.post(`/admin/customers/${customerId}/notes`, data),
  getCustomerNotes: (customerId: string) =>
    api.get(`/admin/customers/${customerId}/notes`),
  // Seller CRM
  getSellers: (params?: {
    search?: string;
    tier?: string;
    status?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) => api.get("/admin/sellers", { params }),
  getSellerStats: () => api.get("/admin/sellers/stats"),
  getSellerExport: () => api.get("/admin/sellers/export"),
  getSellerProfile: (shopId: string) => api.get(`/admin/sellers/${shopId}`),
  getSellerHealthScore: (shopId: string) =>
    api.get(`/admin/sellers/${shopId}/health-score`),
  getSellerOnboarding: (shopId: string) =>
    api.get(`/admin/sellers/${shopId}/onboarding`),
  getSellerMilestones: (shopId: string) =>
    api.get(`/admin/sellers/${shopId}/milestones`),
  getSellerRfqFunnel: (shopId: string, days?: number) =>
    api.get(
      `/admin/sellers/${shopId}/rfq-funnel${days ? `?days=${days}` : ""}`,
    ),
  addSellerNote: (shopId: string, data: { note: string; category?: string }) =>
    api.post(`/admin/sellers/${shopId}/notes`, data),
  getSellerNotes: (shopId: string) => api.get(`/admin/sellers/${shopId}/notes`),
  updateSeller: (shopId: string, data: Record<string, any>) =>
    api.patch(`/admin/sellers/${shopId}`, data),

  // Health & Monitoring
  checkApisHealth: () => api.get("/admin/health/apis"),
  testSmsSendingWithTwilio: (phoneNumber: string) =>
    api.post("/admin/health/test-sms", { phoneNumber }),

  // Backups
  backups: {
    list: () => api.get("/backups"),
    triggerManual: () => api.post("/backups/trigger"),
    delete: (filename: string) =>
      api.delete(`/backups/${encodeURIComponent(filename)}`),
    downloadUrl: (filename: string) =>
      `${API_BASE_URL}/backups/download/${encodeURIComponent(filename)}`,
    getSchedules: () => api.get("/backups/schedules"),
    createSchedule: (data: { name: string; cronExp: string }) =>
      api.post("/backups/schedules", data),
    toggleSchedule: (id: string, isActive: boolean) =>
      api.patch(`/backups/schedules/${id}/toggle`, { isActive }),
    deleteSchedule: (id: string) => api.delete(`/backups/schedules/${id}`),
  },
};

// Materials API
export const materialsApi = {
  getAll: () => api.get("/materials"),
  getPreciousMetals: () => api.get("/materials/precious-metals"),
  getBaseMetals: () => api.get("/materials/base-metals"),
  getJewelleryTypes: () => api.get("/materials/jewellery-types"),
  getBuildMethods: () => api.get("/materials/build-methods"),
  getMarketRates: (params?: { currency?: string; country?: string }) =>
    api.get("/market-rates", { params }),
};

// Shop Quotes API (Walk-in customers)
export const shopQuotesApi = {
  // Customer lookup with Redis cache
  lookupCustomer: (data: { phoneCountryCode: string; phone: string }) =>
    api.post("/shop-quotes/lookup-customer", data),

  // Customer search (partial phone, returns up to 5 suggestions)
  searchCustomers: (data: { phoneCountryCode: string; phone: string }) =>
    api.post("/shop-quotes/search-customers", data),

  // CRUD operations
  create: (data: any) => api.post("/shop-quotes", data),
  getAll: (params?: { status?: string }) => api.get("/shop-quotes", { params }),
  getById: (id: string) => api.get(`/shop-quotes/${id}`),
  update: (id: string, data: any) => api.put(`/shop-quotes/${id}`, data),

  // Status management
  updateStatus: (
    id: string,
    data: { status: string; cancelReason?: string; wastagePercent?: number },
  ) => api.put(`/shop-quotes/${id}/status`, data),

  // Payment recording
  recordPayment: (
    id: string,
    data: {
      amountNpr: number;
      notes?: string;
      paymentMethod?: string;
      reference?: string;
      idempotencyKey?: string;
    },
  ) =>
    api.post(`/shop-quotes/${id}/payment`, data),

  checkout: (
    id: string,
    data: {
      amountNpr: number;
      notes?: string;
      invoiceNotes?: string;
      paymentMethod?: string;
      reference?: string;
      idempotencyKey?: string;
    },
  ) => api.post(`/shop-quotes/${id}/checkout`, data),

  // Invoice conversion
  convertToInvoice: (id: string, data?: { notes?: string }) =>
    api.post(`/shop-quotes/${id}/invoice`, data ?? {}),

  // Tracking link
  sendTrackingLink: (id: string, method: "email" | "sms") =>
    api.post(`/shop-quotes/${id}/send-tracking-link`, { method }),

  // Public: track by token (no auth)
  trackByToken: (token: string) => api.get(`/shop-quotes/track/${token}`),

  // Statistics and analytics
  getStats: () => api.get("/shop-quotes/stats"),

  // Customer history
  getCustomerHistory: (customerId: string) =>
    api.get(`/shop-quotes/customer/${customerId}`),
};

// Pricing API
export const pricingApi = {
  getTaxRules: (region: string) =>
    api.get("/pricing/tax-rules", { params: { region } }),
  resolve: (data: {
    shopId: string;
    inventoryItemId?: string;
    composition?: any;
    makingOverride?: number;
    wastagePercent?: number;
  }) => api.post("/pricing/resolve", data),
  resolveBulk: (shopId: string, itemIds: string[]) =>
    api.post("/pricing/resolve/bulk", { shopId, itemIds }),
  resolveGemstone: (data: {
    shopId: string;
    stoneType: string;
    caratWeight?: number;
    sizeMm?: number;
    qualityTier: "BUDGET" | "STANDARD" | "PREMIUM";
    origin?: string;
    count: number;
  }) => api.post("/pricing/resolve/gemstone", data),
};

export const adminTaxSyncApi = {
  getSources: () => api.get("/pricing/tax-sync/sources"),
  getRuns: (limit = 10) =>
    api.get("/pricing/tax-sync/runs", { params: { limit } }),
  getProposals: (params?: {
    status?: string;
    region?: string;
    limit?: number;
  }) => api.get("/pricing/tax-sync/proposals", { params }),
  runSync: (data?: { region?: string }) =>
    api.post("/pricing/tax-sync/run", data || {}),
  approveProposal: (id: string, note?: string) =>
    api.post(`/pricing/tax-sync/proposals/${id}/approve`, note ? { note } : {}),
  rejectProposal: (id: string, note?: string) =>
    api.post(`/pricing/tax-sync/proposals/${id}/reject`, note ? { note } : {}),
};

// Platform Config API
export const platformConfigApi = {
  getAll: () => api.get("/platform-config"),
  getPublic: () => api.get("/platform-config/public"),
  update: (data: Record<string, number>) => api.patch("/platform-config", data),
};

// Market Config Admin API
export const marketConfigApi = {
  list: () => api.get("/market/admin/list"),
  update: (countryCode: string, data: Record<string, any>) =>
    api.patch(`/market/admin/${countryCode}`, data),
  seed: () => api.get("/market/admin/seed"),
};

// Static Pages CMS API
export const pagesApi = {
  // Public
  getBySlug: (slug: string) => api.get(`/pages/${slug}`),
  // Admin
  list: () => api.get("/pages/admin/list"),
  create: (data: {
    slug: string;
    title: string;
    content: string;
    metaDescription?: string;
    isPublished?: boolean;
  }) => api.post("/pages/admin", data),
  update: (id: string, data: Record<string, any>) =>
    api.patch(`/pages/admin/${id}`, data),
  delete: (id: string) => api.delete(`/pages/admin/${id}`),
  seed: () => api.get("/pages/admin/seed"),
};

// Blog Posts API
export const blogApi = {
  // Public
  list: () => api.get("/blog"),
  getBySlug: (slug: string) => api.get(`/blog/${slug}`),
  // Admin
  adminList: () => api.get("/blog/admin/list"),
  adminGet: (id: string) => api.get(`/blog/admin/${id}`),
  create: (data: {
    slug: string;
    title: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
    category?: string;
    tags?: string[];
    author?: string;
    authorRole?: string;
    readTime?: string;
    isPublished?: boolean;
    featured?: boolean;
    publishedAt?: string;
  }) => api.post("/blog/admin", data),
  update: (id: string, data: Record<string, any>) =>
    api.patch(`/blog/admin/${id}`, data),
  delete: (id: string) => api.delete(`/blog/admin/${id}`),
  seed: () => api.get("/blog/admin/seed"),
};

// Seller Performance API
export const sellerPerformanceApi = {
  getMyDashboard: (targetTier?: string) =>
    api.get(
      `/seller-performance/my-dashboard${targetTier ? `?targetTier=${targetTier}` : ""}`,
    ),
  getShopPerformance: (shopId: string) =>
    api.get(`/seller-performance/${shopId}`),
  recalculate: (shopId: string) =>
    api.post(`/seller-performance/recalculate/${shopId}`),
  recalculateAll: () => api.post("/seller-performance/recalculate-all"),
  // Engagement features
  getHealthScore: () => api.get("/seller-performance/health-score"),
  getOnboarding: () => api.get("/seller-performance/onboarding"),
  getMilestones: () => api.get("/seller-performance/milestones"),
  getRfqFunnel: (days?: number) =>
    api.get(`/seller-performance/rfq-funnel${days ? `?days=${days}` : ""}`),
  // Platform reviews (Review & Earn)
  getMyReviews: () => api.get("/seller-performance/reviews"),
  submitReview: (data: {
    platform: string;
    proofScreenshot: string;
    reviewUrl?: string;
  }) => api.post("/seller-performance/reviews", data),
  // Admin: reviews
  getAdminReviews: (status?: string) =>
    api.get(
      `/seller-performance/admin/reviews${status ? `?status=${status}` : ""}`,
    ),
  processReview: (
    reviewId: string,
    action: "approve" | "reject",
    adminNotes?: string,
  ) =>
    api.post(`/seller-performance/admin/reviews/${reviewId}/${action}`, {
      adminNotes,
    }),
  sendReviewReminders: () =>
    api.post("/seller-performance/admin/reviews/send-reminders"),
  // Referrals (seller)
  getMyReferrals: () => api.get("/seller-performance/referrals"),
  createReferral: (data: { refereeEmail: string }) =>
    api.post("/seller-performance/referrals", data),
  startReferralConnect: () =>
    api.post("/seller-performance/referrals/connect/onboarding"),
  refreshReferralConnect: () =>
    api.post("/seller-performance/referrals/connect/refresh"),
  saveReferralPayoutBank: (data: {
    bankHolderName: string;
    bankName: string;
    bankAccountNumber: string;
    bankRoutingCode?: string;
    bankCountry?: string;
  }) => api.post("/seller-performance/referrals/payout-profile", data),
  cashOutReferralWallet: () =>
    api.post("/seller-performance/referrals/cash-out"),
  redeemReferralAsPro: () =>
    api.post("/seller-performance/referrals/redeem-subscription"),
  getAdminReferralPayouts: (status?: string) =>
    api.get(
      `/seller-performance/admin/referral-payouts${status ? `?status=${status}` : ""}`,
    ),
  getAdminReferralPayoutBankDetails: (id: string) =>
    api.get(`/seller-performance/admin/referral-payouts/${id}/bank-details`),
  resolveReferralPayout: (
    id: string,
    data: {
      action: "paid" | "rejected" | "grant_sub";
      payoutReference?: string;
      adminNote?: string;
      months?: number;
    },
  ) => api.post(`/seller-performance/admin/referral-payouts/${id}/resolve`, data),
  adminGrantReferralPro: (
    shopId: string,
    data: { months?: number; adminNote?: string },
  ) => api.post(`/seller-performance/admin/shops/${shopId}/grant-pro`, data),
  getAdminReferralCommissions: (status?: string) =>
    api.get(
      `/seller-performance/admin/referral-commissions${status ? `?status=${status}` : ""}`,
    ),
  // Admin: referrals
  getAdminReferrals: (status?: string) =>
    api.get(
      `/seller-performance/admin/referrals${status ? `?status=${status}` : ""}`,
    ),
  completeReferral: (referralId: string) =>
    api.post(`/seller-performance/admin/referrals/${referralId}/complete`),
  getReferralSettings: () =>
    api.get("/seller-performance/admin/referral-settings"),
  updateReferralSettings: (data: {
    freeMonths?: number;
    aiCreditsReward?: number;
    expirationDays?: number;
    maxReferralsPerShop?: number;
    isActive?: boolean;
    commissionPercent?: number;
    applyToInvoiceFirst?: boolean;
    minCashoutAmount?: number;
  }) => api.post("/seller-performance/admin/referral-settings", data),
  expireOldReferrals: () =>
    api.post("/seller-performance/admin/referrals/expire-old"),
};

// Designs API (AI Image Generation)
export const designsApi = {
  create: (data: any) => api.post("/designs", data),
  getAll: (params?: any) => api.get("/designs", { params }),
  getById: (id: string) => api.get(`/designs/${id}`),
  getMy: () => api.get("/designs/my"),
  getFeatured: () => api.get("/designs/featured"),
  getSimilar: (params: any) => api.get("/designs/similar", { params }),
  like: (id: string) => api.post(`/designs/${id}/like`),
  unlike: (id: string) => api.delete(`/designs/${id}/like`),
  buildFromDesign: (id: string) => api.post(`/designs/${id}/build`),
  updateVisibility: (id: string, data: { visibility: string }) =>
    api.patch(`/designs/${id}/visibility`, data),
  delete: (id: string) => api.delete(`/designs/${id}`),
};

// Customer CRM API
export const customerCrmApi = {
  // Customer directory
  search: (params: { query?: string; page?: number; limit?: number }) =>
    api.get("/users/customers/search", { params }),
  upsertWalkIn: (data: {
    name: string;
    phoneCountryCode: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    notes?: string;
  }) => api.post("/users/customers/walk-in", data),
  getCustomerProfile: (customerId: string) =>
    api.get(`/users/customers/${customerId}/profile`),
  getCustomerOrders: (customerId: string) =>
    api.get(`/users/customers/${customerId}/orders`),
  getCustomerStats: (customerId: string) =>
    api.get(`/users/customers/${customerId}/stats`),
  addCustomerNote: (
    customerId: string,
    data: { note: string; category?: string },
  ) => api.post(`/users/customers/${customerId}/notes`, data),
  getCustomerNotes: (customerId: string) =>
    api.get(`/users/customers/${customerId}/notes`),
};

// Invoices / Billing API
export const invoicesApi = {
  create: (data: any) => api.post("/invoices", data),
  getAll: (params?: any) => api.get("/invoices", { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  getByOrder: (orderId: string) => api.get(`/invoices/order/${orderId}`),
  updatePaymentStatus: (id: string, data: any) =>
    api.patch(`/invoices/${id}/payment`, data),
  recordPayment: (id: string, data: any) =>
    api.patch(`/invoices/${id}/payment`, data),
  confirmPayment: (id: string, paymentId: string, data?: any) =>
    api.post(`/invoices/${id}/payments/${paymentId}/confirm`, data || {}),
  void: (id: string) => api.post(`/invoices/${id}/void`),
  getStats: () => api.get("/invoices/stats"),
  getSettings: () => api.get("/invoices/settings"),
  updateSettings: (data: any) => api.patch("/invoices/settings", data),
  // Public: verify bill by QR token (no auth)
  verifyBill: (token: string) => api.get(`/invoices/public/verify/${token}`),
  shareEmail: (id: string, data: { to?: string; message?: string }) =>
    api.post(`/invoices/${id}/share/email`, data),
  shareSms: (id: string, data: { to?: string; message?: string }) =>
    api.post(`/invoices/${id}/share/sms`, data),
  /** On-demand PDF (authenticated; uses axios interceptors for token + refresh). */
  getPdf: (id: string) =>
    api.get<Blob>(`/invoices/${id}/pdf`, {
      responseType: "blob",
      timeout: 45000,
      headers: {
        Accept: "application/pdf",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    }),
};

// Shop double-entry ledger / accounting API
export const accountingApi = {
  accounts: (shopId: string, params?: { from?: string; to?: string }) =>
    api.get(`/accounting/shops/${shopId}/accounts`, { params }),
  trialBalance: (shopId: string, params?: { from?: string; to?: string }) =>
    api.get(`/accounting/shops/${shopId}/trial-balance`, { params }),
  profitLoss: (shopId: string, params?: { from?: string; to?: string }) =>
    api.get(`/accounting/shops/${shopId}/profit-loss`, { params }),
  ledger: (
    shopId: string,
    params?: { from?: string; to?: string; page?: number; limit?: number },
  ) => api.get(`/accounting/shops/${shopId}/ledger`, { params }),
  generalLedger: (
    shopId: string,
    params?: {
      accountId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) => api.get(`/accounting/shops/${shopId}/general-ledger`, { params }),
  journalDetail: (shopId: string, journalId: string) =>
    api.get(`/accounting/shops/${shopId}/journals/${journalId}`),
  openingBalances: (
    shopId: string,
    data: {
      cashAmount?: number;
      bankAmount?: number;
      transactionCurrency?: string;
      asOfDate: string;
      description?: string;
    },
  ) => api.post(`/accounting/shops/${shopId}/opening-balances`, data),
  backfill: (shopId: string) =>
    api.post(`/accounting/shops/${shopId}/backfill`),
};

// Tax filing reports API (GSTR, VAT, MTD, OSS, US state, share)
export const taxReportsApi = {
  summary: (country: string, period: string) =>
    api.get("/tax-reports/summary", { params: { country, period } }),
  // India
  indiaGstr1: (period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/india/gstr1", {
      params: { period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  indiaGstr3b: (period: string) =>
    api.get("/tax-reports/india/gstr3b", { params: { period } }),
  indiaHsn: (period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/india/hsn", {
      params: { period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  indiaTallyXml: (period: string) =>
    api.get("/tax-reports/india/tally.xml", {
      params: { period },
      responseType: "blob",
    }),
  // Nepal
  nepalVat: (period: string) =>
    api.get("/tax-reports/nepal/vat", { params: { period } }),
  nepalAudit: (year?: number) =>
    api.get("/tax-reports/nepal/audit", { params: year ? { year } : {} }),
  // UAE
  uaeVat201: (period: string) =>
    api.get("/tax-reports/uae/vat201", { params: { period } }),
  // Sri Lanka
  lkVat: (period: string) =>
    api.get("/tax-reports/lk/vat", { params: { period } }),
  lkVatRegister: (period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/lk/vat-register", {
      params: { period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  // UK
  ukMtd: (period: string) =>
    api.get("/tax-reports/uk/mtd", { params: { period } }),
  // EU
  euOss: (period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/eu/oss", {
      params: { period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  // US
  usState: (period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/us/state", {
      params: { period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  // CA share
  createShareLink: (data: {
    country: string;
    period: string;
    ttlDays?: number;
  }) => api.post("/tax-reports/share-link", data),
};

// Admin Tax Reports API (admin-only, accepts shopId as query param)
export const adminTaxApi = {
  stats: () => api.get("/tax-reports/admin/stats"),
  shopSummary: (shopId: string, country: string, period: string) =>
    api.get("/tax-reports/admin/shop-summary", {
      params: { shopId, country, period },
    }),
  indiaGstr3b: (shopId: string, period: string) =>
    api.get("/tax-reports/admin/india/gstr3b", { params: { shopId, period } }),
  indiaHsn: (shopId: string, period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/admin/india/hsn", {
      params: { shopId, period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  indiaGstr1: (
    shopId: string,
    period: string,
    format: "json" | "csv" = "json",
  ) =>
    api.get("/tax-reports/admin/india/gstr1", {
      params: { shopId, period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  indiaTallyXml: (shopId: string, period: string) =>
    api.get("/tax-reports/admin/india/tally.xml", {
      params: { shopId, period },
      responseType: "blob",
    }),
  nepalVat: (shopId: string, period: string) =>
    api.get("/tax-reports/admin/nepal/vat", { params: { shopId, period } }),
  uaeVat201: (shopId: string, period: string) =>
    api.get("/tax-reports/admin/uae/vat201", { params: { shopId, period } }),
  lkVat: (shopId: string, period: string) =>
    api.get("/tax-reports/admin/lk/vat", { params: { shopId, period } }),
  lkVatRegister: (
    shopId: string,
    period: string,
    format: "json" | "csv" = "json",
  ) =>
    api.get("/tax-reports/admin/lk/vat-register", {
      params: { shopId, period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  ukMtd: (shopId: string, period: string) =>
    api.get("/tax-reports/admin/uk/mtd", { params: { shopId, period } }),
  euOss: (shopId: string, period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/admin/eu/oss", {
      params: { shopId, period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
  usState: (shopId: string, period: string, format: "json" | "csv" = "json") =>
    api.get("/tax-reports/admin/us/state", {
      params: { shopId, period, format },
      responseType: format === "csv" ? "blob" : "json",
    }),
};

// Marketplace Intelligence API
export const intelligenceApi = {
  // AI RFQ Builder
  buildRfq: (data: {
    description: string;
    budgetHint?: string;
    occasion?: string;
    preferredMetal?: string;
    marketRegion?: string;
    currency?: string;
  }) => api.post("/marketplace-intelligence/rfq-builder", data),

  // Budget Feasibility Check
  checkFeasibility: (data: {
    jewelleryType: string;
    buildMethod: string;
    composition?: Record<string, any>;
    targetWeightG?: number;
    budgetNpr?: number;
    marketRegion?: string;
  }) => api.post("/marketplace-intelligence/feasibility-check", data),

  // AI Tooltips
  getTooltips: (category?: string) =>
    api.get("/marketplace-intelligence/tooltips", {
      params: category ? { category } : undefined,
    }),

  // Offer Comparison
  compareOffers: (rfqId: string) =>
    api.get(`/marketplace-intelligence/offers/compare/${rfqId}`),

  // Order Protection Timeline
  getOrderProtection: (orderId: string) =>
    api.get(`/marketplace-intelligence/order-protection/${orderId}`),

  // Trust Profile
  getTrustProfile: (shopId: string) =>
    api.get(`/marketplace-intelligence/trust-profile/${shopId}`),

  // Counter-Offer Suggestions
  getCounterOfferSuggestions: (offerId: string) =>
    api.get(`/marketplace-intelligence/counter-offer-suggestions/${offerId}`),

  // Loss Reasons
  recordLossReason: (data: {
    offerId: string;
    category: string;
    note?: string;
  }) => api.post("/marketplace-intelligence/loss-reason", data),

  // Admin: Intelligence Dashboard
  getDashboard: () => api.get("/marketplace-intelligence/admin/dashboard"),
  getAiCapabilities: () =>
    api.get("/marketplace-intelligence/admin/ai-capabilities"),

  // Admin: AI Phase Milestones
  getMilestones: () => api.get("/marketplace-intelligence/admin/milestones"),
  updateMilestoneAction: (
    id: string,
    data: { actionIndex: number; status: "pending" | "completed" | "skipped" },
  ) =>
    api.patch(`/marketplace-intelligence/admin/milestones/${id}/action`, data),

  // Admin: Quote Anomalies
  getAnomalies: (params?: {
    type?: string;
    severity?: string;
    reviewed?: string;
    limit?: string;
  }) => api.get("/marketplace-intelligence/admin/anomalies", { params }),
  reviewAnomaly: (id: string, data: { note?: string }) =>
    api.patch(`/marketplace-intelligence/admin/anomalies/${id}/review`, data),
};

// ─── Chat API ───
export const chatApi = {
  // Conversations
  createAdminToUserConversation: (data: { targetUserId: string }) =>
    api.post("/chat/admin/start-user-chat", data),
  generateAdminDraft: (data: { prompt: string; context?: string }) =>
    api.post("/chat/admin/generate-draft", data),
  createConversation: (data: {
    shopId: string;
    orderId?: string;
    rfqId?: string;
    buyerId?: string;
  }) => api.post("/chat/conversations", data),
  listConversations: (shopId?: string) =>
    api.get("/chat/conversations", { params: shopId ? { shopId } : {} }),
  getMessages: (conversationId: string, page = 1, limit = 50) =>
    api.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page, limit },
    }),
  sendMessage: (
    conversationId: string,
    data: { content: string; attachmentUrl?: string; attachmentType?: string },
  ) => api.post(`/chat/conversations/${conversationId}/messages`, data),
  markAsRead: (conversationId: string) =>
    api.patch(`/chat/conversations/${conversationId}/read`),
  // Admin — violations & moderation
  getViolationStats: () => api.get("/chat/admin/violations"),
  getUserViolationHistory: (userId: string) =>
    api.get(`/chat/admin/violations/user/${userId}`),
  getBlockedMessage: (messageId: string) =>
    api.get(`/chat/admin/messages/${messageId}`),
  unblockMessage: (messageId: string) =>
    api.patch(`/chat/admin/messages/${messageId}/unblock`),
  unlockConversation: (conversationId: string) =>
    api.patch(`/chat/admin/conversations/${conversationId}/unlock`),
  unblockUser: (userId: string) =>
    api.patch(`/chat/admin/users/${userId}/unblock`),
};

// ─── Refunds API ───
export const refundsApi = {
  requestRefund: (data: { orderId: string; reason: string }) =>
    api.post("/refunds/request", data),
  checkEligibility: (orderId: string) =>
    api.get(`/refunds/eligibility/${orderId}`),
  listRequests: (status?: string) =>
    api.get("/refunds/requests", { params: status ? { status } : {} }),
  approveRefund: (orderId: string) => api.patch(`/refunds/${orderId}/approve`),
  rejectRefund: (orderId: string, data: { rejectionReason: string }) =>
    api.patch(`/refunds/${orderId}/reject`, data),
  processRefund: (orderId: string) => api.patch(`/refunds/${orderId}/process`),
};

// ─── Support API ───
export const supportApi = {
  getDashboard: () => api.get("/support/dashboard"),
  getOrders: (page = 1, limit = 20, status?: string) =>
    api.get("/support/orders", {
      params: { page, limit, ...(status ? { status } : {}) },
    }),
  getFlaggedConversations: () => api.get("/support/flagged-conversations"),
  getRecentActivity: (limit = 50) =>
    api.get("/support/activity", { params: { limit } }),
  getAiAnalytics: () => api.get("/support/ai-analytics"),
  getContacts: () => api.get("/support/contacts"),
  createContact: (data: any) => api.post("/support/contacts", data),
  updateContact: (id: string, data: any) =>
    api.patch(`/support/contacts/${id}`, data),
  deleteContact: (id: string) => api.delete(`/support/contacts/${id}`),
};

// ─── Tickets API ───
export const ticketsApi = {
  // User-facing
  create: (data: {
    type: string;
    subject: string;
    description: string;
    priority?: string;
    orderId?: string;
    conversationId?: string;
  }) => api.post("/tickets", data),
  createGuest: (data: {
    type: string;
    subject: string;
    description: string;
    guestEmail: string;
    guestName?: string;
  }) => api.post("/tickets/guest", data),
  getMyTickets: (page = 1, limit = 10) =>
    api.get("/tickets/my", { params: { page, limit } }),
  getTicket: (id: string) => api.get(`/tickets/${id}`),
  addMessage: (
    ticketId: string,
    data: {
      content: string;
      attachmentUrl?: string;
      attachmentType?: string;
      isInternal?: boolean;
    },
  ) => api.post(`/tickets/${ticketId}/messages`, data),
  // Staff-only
  listAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    priority?: string;
    assigneeId?: string;
    search?: string;
  }) => api.get("/tickets", { params }),
  claim: (id: string) => api.patch(`/tickets/${id}/claim`),
  updateStatus: (id: string, data: { status: string; note?: string }) =>
    api.patch(`/tickets/${id}/status`, data),
  resolve: (id: string, data?: { note?: string }) =>
    api.patch(`/tickets/${id}/resolve`, data || {}),
  close: (id: string) => api.patch(`/tickets/${id}/close`),
  getStats: () => api.get("/tickets/stats/overview"),
  // AI chatbot (public, no auth)
  aiChat: (data: {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }) => api.post("/tickets/ai-chat", data),
  // Admin — bot session history
  getBotSessions: (page = 1, limit = 20) =>
    api.get("/tickets/ai-chat/sessions", { params: { page, limit } }),
  getBotStats: () => api.get("/tickets/ai-chat/stats"),
  getLeads: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    session?: string;
  }) => api.get("/tickets/ai-chat/leads", { params }),
  updateLead: (
    sessionId: string,
    data: { leadStatus?: string; leadNotes?: string | null },
  ) => api.patch(`/tickets/ai-chat/leads/${sessionId}`, data),
  getLeadAlertSettings: () =>
    api.get("/tickets/ai-chat/leads/alert-settings"),
  updateLeadAlertSettings: (data: {
    emails: string[];
    digestEnabled?: boolean;
  }) => api.patch("/tickets/ai-chat/leads/alert-settings", data),
  // Public contacts
  getPublicContacts: () => api.get("/tickets/contacts"),
};

// ─── Product Variants API ───
export const variantsApi = {
  toggleSizes: (itemId: string, hasSizes: boolean) =>
    api.patch(`/inventory/${itemId}/variants/toggle-sizes`, { hasSizes }),
  listVariants: (itemId: string) => api.get(`/inventory/${itemId}/variants`),
  createVariant: (
    itemId: string,
    data: {
      sizeLabel: string;
      sizeSystem?: string;
      sizeValue?: number;
      sku: string;
      stock: number;
      priceOverride?: number;
    },
  ) => api.post(`/inventory/${itemId}/variants`, data),
  bulkCreateVariants: (
    itemId: string,
    variants: Array<{
      sizeLabel: string;
      sizeSystem?: string;
      sizeValue?: number;
      sku: string;
      stock: number;
      priceOverride?: number;
    }>,
  ) => api.post(`/inventory/${itemId}/variants/bulk`, { variants }),
  updateVariant: (
    itemId: string,
    variantId: string,
    data: { stock?: number; priceOverride?: number; isActive?: boolean },
  ) => api.patch(`/inventory/${itemId}/variants/${variantId}`, data),
  deleteVariant: (itemId: string, variantId: string) =>
    api.delete(`/inventory/${itemId}/variants/${variantId}`),
  getSizeChart: (jewelleryType: string, region?: string) =>
    api.get(`/size-charts/${jewelleryType}`, {
      params: region ? { region } : {},
    }),
};

// ─── POS API ───
export const posApi = {
  // Registers / Counters
  getRegisters: () => api.get("/pos/registers"),
  createRegister: (data: {
    name: string;
    terminalCode?: string;
    active?: boolean;
    hardwareConfig?: Record<string, any>;
  }) => api.post("/pos/registers", data),
  updateRegister: (id: string, data: Record<string, any>) =>
    api.patch(`/pos/registers/${id}`, data),

  // Shifts & Z-Report
  openShift: (data: { registerId: string; openingCash?: number; notes?: string }) =>
    api.post("/pos/shifts/open", data),
  getCurrentShift: (registerId?: string) =>
    api.get("/pos/shifts/current", { params: registerId ? { registerId } : {} }),
  closeShift: (id: string, data: { closingCash: number; notes?: string }) =>
    api.post(`/pos/shifts/${id}/close`, data),
  getZReport: (id: string) => api.get(`/pos/shifts/${id}/z-report`),
  authorizeDrawerOpen: (data: { reason?: string; registerId?: string; managerPin?: string }) =>
    api.post("/pos/drawer/authorize", data),
  auditDrawerOpen: (data: { reason?: string; registerId?: string; success?: boolean; error?: string }) =>
    api.post("/pos/drawer/open", data),

  // Pricing Preview
  previewPricing: (data: {
    items: Array<{
      inventoryItemId: string;
      variantId?: string;
      qty: number;
      unitPrice?: number;
    }>;
    makingChargeRate?: number;
    makingChargesNpr?: number;
    discountAmount?: number;
  }) => api.post("/pos/preview", data),
  previewSession: (sessionId: string, overrides?: Record<string, any>) =>
    api.post(`/pos/session/${sessionId}/preview`, overrides || {}),

  // Returns & Exchanges
  processReturn: (data: {
    invoiceNumber: string;
    lines: Array<{
      inventoryItemId: string;
      variantId?: string;
      qty: number;
      reason: string;
      condition?: string;
      disposition?: string;
      customRefundAmount?: number;
    }>;
    refundMethod?: string;
    idempotencyKey: string;
    notes?: string;
    managerPin?: string;
  }) => api.post("/pos/returns", data),
  confirmRefund: (
    returnId: string,
    refundPaymentId: string,
    data: {
      reference?: string;
      terminalReference?: string;
      bankReference?: string;
      providerTransactionId?: string;
      notes?: string;
    } = {},
  ) => api.post(`/pos/returns/${returnId}/refunds/${refundPaymentId}/confirm`, data),
  processExchange: (data: {
    invoiceNumber: string;
    returnLines: Array<{
      inventoryItemId: string;
      qty: number;
      reason: string;
      condition?: string;
      disposition?: string;
      customRefundAmount?: number;
    }>;
    newItems: Array<{
      inventoryItemId: string;
      variantId?: string;
      qty: number;
      unitPrice?: number;
    }>;
    paymentMethod?: string;
    paymentSplits?: Array<{ method: string; amount: number; reference?: string }>;
    idempotencyKey: string;
    notes?: string;
    managerPin?: string;
  }) => api.post("/pos/exchanges", data),

  // Customer Picks
  getCustomerPicks: (customerId: string) =>
    api.get(`/pos/customer-picks/${customerId}`),
  getActiveSession: (registerId?: string) =>
    api.get("/pos/session/active", { params: registerId ? { registerId } : {} }),
  createSession: (data: {
    customerId?: string;
    conversationId?: string;
    registerId?: string;
  }) => api.post("/pos/session", data),
  updateCustomer: (sessionId: string, customerId?: string) =>
    api.patch(`/pos/session/${sessionId}/customer`, { customerId }),
  addItems: (
    sessionId: string,
    items: Array<{ inventoryItemId: string; variantId?: string; qty: number }>,
  ) => api.post(`/pos/session/${sessionId}/items`, { items }),
  updateItem: (sessionId: string, itemId: string, qty: number) =>
    api.patch(`/pos/session/${sessionId}/items/${itemId}`, { qty }),
  checkout: (
    sessionId: string,
    data: {
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      customerId?: string;
      walkInCustomerId?: string;
      registeredCustomerId?: string;
      notes?: string;
      taxRate?: number;
      discountAmount?: number;
      paymentMethod?: string;
      paymentSplits?: Array<{
        method: string;
        amount: number;
        reference?: string;
        provider?: string;
        providerTransactionId?: string;
        terminalReference?: string;
        bankReference?: string;
        notes?: string;
      }>;
      makingChargeRate?: number;
      makingChargesNpr?: number;
    },
  ) => api.post(`/pos/session/${sessionId}/checkout`, data),
  cancelSession: (sessionId: string) => api.delete(`/pos/session/${sessionId}`),
  getSession: (sessionId: string) => api.get(`/pos/session/${sessionId}`),
  // Single-shot, offline-capable, idempotent sale (replaces the 3-call flow).
  createSale: (data: PosSalePayload) => api.post("/pos/sale", data),
};

export interface PosSalePayload {
  clientId?: string;
  items: Array<{
    inventoryItemId: string;
    variantId?: string;
    qty: number;
    unitPrice?: number;
  }>;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  /** Legacy polymorphic customer reference. Prefer one of the explicit links. */
  customerId?: string;
  walkInCustomerId?: string;
  registeredCustomerId?: string;
  taxRate?: number;
  discountAmount?: number;
  paymentMethod?: string;
  paymentSplits?: Array<{
    method: string;
    amount: number;
    reference?: string;
    provider?: string;
    providerTransactionId?: string;
    terminalReference?: string;
    bankReference?: string;
    notes?: string;
  }>;
  makingChargeRate?: number;
  makingChargesNpr?: number;
  notes?: string;
  occurredOffline?: boolean;
  soldAt?: string;
}

// ─── Subscription Plans API ───
export const subscriptionPlansApi = {
  // Public
  getAvailable: (country: string) =>
    api.get("/subscription-plans/available", { params: { country } }),
  // Admin CRUD
  list: (params?: { country?: string; isActive?: string }) =>
    api.get("/subscription-plans", { params }),
  getById: (id: string) => api.get(`/subscription-plans/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/subscription-plans", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/subscription-plans/${id}`, data),
  toggle: (id: string, isActive: boolean) =>
    api.patch(`/subscription-plans/${id}/toggle`, { isActive }),
  // Plan Lifecycle
  deletePlan: (id: string) => api.delete(`/subscription-plans/${id}`),
  disableWithSuccessor: (id: string, successorPlanId: string) =>
    api.patch(`/subscription-plans/${id}/disable-with-successor`, {
      successorPlanId,
    }),
  getSubscriberCount: (id: string) =>
    api.get(`/subscription-plans/${id}/subscriber-count`),
  triggerMigrationReminders: () =>
    api.post("/subscription-plans/migration-reminders"),
  processRenewalMigrations: () =>
    api.post("/subscription-plans/process-renewal-migrations"),
};

// ─── Seller Subscriptions API ───
export const sellerSubscriptionsApi = {
  // Seller
  getMyFeatures: () => api.get("/seller-subscriptions/my-features"),
  subscribe: (data: {
    shopId: string;
    planId: string;
    country: string;
    billingCycle?: string;
    offerCampaignKey?: string;
  }) => api.post("/seller-subscriptions/subscribe", data),
  cancel: (id: string, data?: { reason?: string; immediate?: boolean }) =>
    api.post(`/seller-subscriptions/${id}/cancel`, data || {}),
  activateTrial: () => api.post("/seller-subscriptions/activate-trial"),
  getMySubscription: () => api.get("/seller-subscriptions/my-subscription"),
  getMyHistory: () => api.get("/seller-subscriptions/my-history"),
  getMyUsage: () => api.get("/seller-subscriptions/my-usage"),
  getConversionSignals: () =>
    api.get("/seller-subscriptions/my-conversion-signals"),
  // Migration
  getMyMigration: () => api.get("/seller-subscriptions/my-migration"),
  respondToMigration: (id: string, accept: boolean) =>
    api.post(`/seller-subscriptions/${id}/migration-response`, { accept }),
  // Stripe Billing Portal
  getBillingPortal: () => api.get("/seller-subscriptions/billing-portal"),
  // Admin
  listAll: (params?: {
    status?: string;
    country?: string;
    page?: number;
    limit?: number;
  }) => api.get("/seller-subscriptions/admin/all", { params }),
  adminOverride: (data: {
    shopId: string;
    planId: string;
    periodEnd?: string;
    reason?: string;
  }) => api.post("/seller-subscriptions/admin/override", data),
  adminActivate: (id: string) =>
    api.post(`/seller-subscriptions/admin/${id}/activate`),
  getStats: () => api.get("/seller-subscriptions/admin/stats"),
  adminSyncStripe: () => api.post("/seller-subscriptions/admin/sync-stripe"),
};

// ─── AI Credits API ───
export const aiCreditsApi = {
  // User
  getBalance: () => api.get("/ai-credits/balance"),
  getLedger: (params?: { page?: number; limit?: number; action?: string }) =>
    api.get("/ai-credits/ledger", { params }),
  purchaseCredits: (data: {
    creditAmount: number;
    pricePerCredit: number;
    currency: string;
    country: string;
    preferredGateway?: string;
  }) => api.post("/ai-credits/purchase", data),
  // Auto-recharge
  getAutoRecharge: () => api.get("/ai-credits/auto-recharge"),
  updateAutoRecharge: (data: {
    autoRechargeEnabled?: boolean;
    autoRechargeThreshold?: number;
    autoRechargePack?: number;
  }) => api.patch("/ai-credits/auto-recharge", data),
  // Admin
  getUserCredits: (userId: string) =>
    api.get(`/ai-credits/admin/user/${userId}`),
  getUserLedger: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/ai-credits/admin/user/${userId}/ledger`, { params }),
  adminAdjust: (data: { userId: string; amount: number; reason: string }) =>
    api.post("/ai-credits/admin/adjust", data),
  triggerMonthlyGrant: () => api.post("/ai-credits/admin/monthly-grant"),
  getCreditStats: () => api.get("/ai-credits/admin/stats"),
  listSellers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/ai-credits/admin/sellers", { params }),
};

// ─── Payment Gateway API ───
export const paymentGatewayApi = {
  /**
   * Resolve the preferred payment gateway for the visitor's/shop's country,
   * plus any alternatives. `country` is an optional override.
   */
  getPreferredGateway: (country?: string) =>
    api.get("/payment-gateway/preferred-gateway", {
      params: country ? { country } : undefined,
    }),
  listConfigs: () => api.get("/payment-gateway/configs"),
  getConfig: (id: string) => api.get(`/payment-gateway/configs/${id}`),
  upsertConfig: (data: Record<string, unknown>) =>
    api.post("/payment-gateway/configs", data),
  toggleGateway: (id: string, isEnabled: boolean) =>
    api.patch(`/payment-gateway/configs/${id}/toggle`, { isEnabled }),
  setDefault: (id: string) =>
    api.patch(`/payment-gateway/configs/${id}/set-default`),
  getAvailableGateways: (country?: string) =>
    api.get(
      `/payment-gateway/available${country ? `?country=${country}` : ""}`,
    ),
  healthCheckAll: () => api.get("/payment-gateway/health"),
  healthCheck: (gatewayName: string) =>
    api.get(`/payment-gateway/health/${gatewayName}`),
  // Webhook status
  getWebhookStatus: () => api.get("/payment-gateway/webhooks/status"),
  // Stripe sandbox testing
  getStripeMode: () => api.get("/payment-gateway/test/stripe-mode"),
  testStripePayment: (data?: { amount?: number; currency?: string }) =>
    api.post("/payment-gateway/test/stripe-payment", data || {}),
  testStripeSubscription: (data?: {
    amount?: number;
    currency?: string;
    interval?: "month" | "year";
  }) => api.post("/payment-gateway/test/stripe-subscription", data || {}),
  // Payment initiation
  initiatePayment: (data: {
    type: "subscription" | "order" | "rfq_booking" | "ai_credits";
    resourceId: string;
    amount: number;
    currency: string;
    country: string;
    metadata?: Record<string, string>;
    preferredGateway?: string;
  }) => api.post("/payment-gateway/initiate", data),
};

// ─── Metrics / Performance API ───
export const metricsApi = {
  getSummary: () => api.get("/metrics/summary"),
  getJson: () => api.get("/metrics/json"),
  getHistory: (hours?: number) =>
    api.get(`/metrics/history${hours ? `?hours=${hours}` : ""}`),
  getGrafanaSettings: () => api.get("/metrics/grafana-settings"),
  updateGrafanaSettings: (data: {
    enabled: boolean;
    cloudUrl?: string;
    orgSlug?: string;
    dashboardUid?: string;
  }) => api.patch("/metrics/grafana-settings", data),
  getDbPerformance: () => api.get("/metrics/db-performance"),
  getCronSummary: () => api.get("/metrics/cron/summary"),
  getCronLogs: (params?: {
    date?: string;
    app?: string;
    jobName?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.date) q.set("date", params.date);
    if (params?.app) q.set("app", params.app);
    if (params?.jobName) q.set("jobName", params.jobName);
    if (params?.limit) q.set("limit", String(params.limit));
    return api.get(`/metrics/cron/logs?${q.toString()}`);
  },
  getCronDateWise: (params?: { days?: number; jobName?: string }) => {
    const q = new URLSearchParams();
    if (params?.days) q.set("days", String(params.days));
    if (params?.jobName) q.set("jobName", params.jobName);
    return api.get(`/metrics/cron/date-wise?${q.toString()}`);
  },
  // Cron config management
  getCronConfigs: () => api.get("/metrics/cron/config"),
  updateCronConfig: (
    jobName: string,
    data: { intervalMinutes?: number; enabled?: boolean },
  ) => api.patch(`/metrics/cron/config/${encodeURIComponent(jobName)}`, data),
  bulkUpdateCronConfigs: (
    updates: Array<{
      jobName: string;
      intervalMinutes?: number;
      enabled?: boolean;
    }>,
  ) => api.patch("/metrics/cron/config", { updates }),
  resetAllCronConfigs: () => api.post("/metrics/cron/config/reset-all"),
  resetCronConfig: (jobName: string) =>
    api.post(`/metrics/cron/config/${encodeURIComponent(jobName)}/reset`),
};

// ─── Security Shield API ───
export const securityApi = {
  getDashboard: () => api.get("/security/dashboard"),
  getEvents: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    severity?: string;
    ip?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.type) query.set("type", params.type);
    if (params?.severity) query.set("severity", params.severity);
    if (params?.ip) query.set("ip", params.ip);
    const qs = query.toString();
    return api.get(`/security/events${qs ? `?${qs}` : ""}`);
  },
  getBlockedIps: () => api.get("/security/blocked-ips"),
  blockIp: (data: { ip: string; reason: string; durationMinutes?: number }) =>
    api.post("/security/block", data),
  unblockIp: (ip: string) => api.delete(`/security/unblock/${ip}`),
  getIpProfile: (ip: string) => api.get(`/security/ip-profile/${ip}`),
  // Whitelist
  getWhitelistedIps: () => api.get("/security/whitelisted-ips"),
  whitelistIp: (data: { ip: string; label?: string }) =>
    api.post("/security/whitelist", data),
  removeWhitelistedIp: (ip: string) => api.delete(`/security/whitelist/${ip}`),
};

// ─── Crash Reports API ──────────────────────────────────
export interface CrashReportFilterParams {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  userTriggered?: boolean;
  since?: string;
}

function crashReportQuery(params?: CrashReportFilterParams) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  if (params?.platform) query.set("platform", params.platform);
  if (params?.userTriggered !== undefined) {
    query.set("userTriggered", String(params.userTriggered));
  }
  if (params?.since) query.set("since", params.since);
  return query.toString();
}

export const crashReportApi = {
  /** Submit a crash report (public — no auth needed) */
  submit: (data: {
    errorMessage: string;
    errorStack?: string;
    page: string;
    userAction?: string;
    platform: "web" | "desktop";
    userRole?: string;
    userId?: string;
    userAgent?: string;
    appVersion?: string;
    userTriggered?: boolean;
    userDescription?: string;
    screenshotUrl?: string;
    frustrationType?: string;
    sessionToken?: string;
  }) => api.post("/crash-reports", data),

  /** Get paginated crash reports (admin) */
  getAll: (params?: CrashReportFilterParams) => {
    const qs = crashReportQuery(params);
    return api.get(`/crash-reports${qs ? `?${qs}` : ""}`);
  },

  /** Get crash report stats (admin) */
  getStats: () => api.get("/crash-reports/stats"),

  /** Get integration status without exposing webhook credentials */
  getIntegrations: () => api.get("/crash-reports/integrations"),

  /** Send a test message to the configured Slack channel */
  testSlack: () => api.post("/crash-reports/integrations/slack/test"),

  /** Export all incidents matching the current admin filters as an AI prompt */
  exportMarkdown: (params?: CrashReportFilterParams) => {
    const qs = crashReportQuery(params);
    return api.get(
      `/crash-reports/export?format=markdown${qs ? `&${qs}` : ""}`,
      { responseType: "text" },
    );
  },

  /** Get a single report */
  getById: (id: string) => api.get(`/crash-reports/${id}`),

  /** Update status or admin notes */
  update: (id: string, data: { status?: string; adminNotes?: string }) =>
    api.patch(`/crash-reports/${id}`, data),

  /** Update several reports from the admin triage queue */
  updateMany: (
    ids: string[],
    data: { status: string; adminNotes?: string },
  ) => api.patch("/crash-reports/bulk/status", { ids, ...data }),

  /** Delete a crash report */
  remove: (id: string) => api.delete(`/crash-reports/${id}`),
};

export interface RecoveryOfferPreview {
  campaignKey: string;
  days: number;
  selectedReports: number;
  eligible: Array<{
    userId: string;
    shopId: string;
    email: string;
    firstName: string;
    shopName: string;
    country: string;
    reportCount: number;
    emailVerified: boolean;
    hasPaidPlan: boolean;
  }>;
  excluded: Array<{ userId?: string; email?: string; reason: string }>;
}

export interface RecoveryAudiencePreview {
  campaignKey: string;
  days: number;
  campaign: OfferCampaign;
  nearbyScheduled: number;
  totalAccounts: number;
  eligible: Array<{
    userId: string;
    shopId: string;
    email: string;
    firstName: string;
    shopName: string;
    country: string;
    lastActiveAt?: string | null;
    activitySegment: "recent" | "dormant" | "lapsed";
    incidentAffected: boolean;
    timeZone: string;
    recommendedSendAt: string | null;
    emailVerified: boolean;
    hasPaidPlan: boolean;
    hasShop: boolean;
    accountStatus: string;
    offerStatus: string | null;
    sentAt?: string | null;
    deliveredAt?: string | null;
    firstOpenedAt?: string | null;
    claimedAt?: string | null;
    openCount?: number;
    clickCount?: number;
    unsubscribed: boolean;
    canSend: boolean;
    cannotSendReason?: string | null;
  }>;
  excluded: Array<{ userId?: string; email?: string; reason: string }>;
}

export interface OfferCampaign {
  id?: string;
  key: string;
  name: string;
  kind: "RECOVERY" | "FESTIVAL";
  complimentaryDays: number;
  discountPercent: number;
  startsAt: string | null;
  endsAt: string | null;
  emailSubject: string;
  emailHeading: string;
  emailBody: string;
  imageUrl?: string | null;
  nextScheduledFor?: string | null;
  isActive?: boolean;
}

export type FestivalReligion =
  | "HINDU"
  | "MUSLIM"
  | "BUDDHIST"
  | "JEWISH"
  | "SIKH"
  | "CHRISTIAN";

export interface FestivalCalendarEvent {
  id: string;
  name: string;
  religion: FestivalReligion;
  date: string;
  countries: Array<"IN" | "NP" | "AE" | "US" | "UK">;
  dateAccuracy: "CALCULATED" | "MOON_SIGHTING" | "FIXED";
  source: "PANCHANGAM" | "DATE_HOLIDAYS" | "FIXED_CALENDAR";
}

export interface FestivalCalendarResult {
  startYear: number;
  endYear: number;
  generatedAt: string;
  events: FestivalCalendarEvent[];
  notices: string[];
}

export interface RecoveryCampaignMetrics {
  scope: "ALL" | "CAMPAIGN";
  campaignKey: string | null;
  totals: {
    targeted: number;
    scheduled: number;
    sent: number;
    delivered: number;
    opened: number;
    totalOpens: number;
    clicked: number;
    totalClicks: number;
    claimed: number;
    rejoined: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
    failed: number;
  };
  rates: {
    delivery: number;
    open: number;
    click: number;
    claim: number;
    rejoin: number;
  };
  byCountry: Array<{
    country: string;
    targeted: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    claimed: number;
    rejoined: number;
  }>;
  byCampaign: Array<{
    campaignKey: string;
    name: string;
    kind: "RECOVERY" | "FESTIVAL";
    totals: RecoveryCampaignMetrics["totals"];
    rates: RecoveryCampaignMetrics["rates"];
  }>;
  webhookConfigured: boolean;
  resendApiConfigured: boolean;
  updatedAt: string;
}

export const recoveryOffersApi = {
  festivalCalendar: (startYear: number, years = 3) =>
    api.get<FestivalCalendarResult>("/recovery-offers/admin/festivals", {
      params: { startYear, years },
    }),
  listCampaigns: () =>
    api.get<OfferCampaign[]>("/recovery-offers/admin/campaigns"),
  createCampaign: (data: Omit<OfferCampaign, "id">) =>
    api.post<OfferCampaign>("/recovery-offers/admin/campaigns", data),
  updateCampaign: (key: string, data: Partial<Omit<OfferCampaign, "id" | "key">>) =>
    api.patch<OfferCampaign>(
      `/recovery-offers/admin/campaigns/${encodeURIComponent(key)}`,
      data,
    ),
  getCampaign: (key: string) =>
    api.get<OfferCampaign>(
      `/recovery-offers/campaigns/${encodeURIComponent(key)}`,
    ),
  preview: (reportIds: string[], campaignKey?: string) =>
    api.post<RecoveryOfferPreview>("/recovery-offers/admin/preview", {
      reportIds,
      campaignKey,
    }),
  send: (data: {
    reportIds: string[];
    campaignKey?: string;
    expiresInDays?: number;
    deliveryTiming?: "IMMEDIATE" | "NEXT_LOCAL_10AM";
  }) =>
    api.post<{
      queued: number;
      scheduled: number;
      failed: number;
      excluded: Array<{ userId?: string; email?: string; reason: string }>;
    }>("/recovery-offers/admin/send", { ...data, confirmed: true }),
  previewAudience: (campaignKey?: string) =>
    api.post<RecoveryAudiencePreview>(
      "/recovery-offers/admin/audience/preview",
      { campaignKey },
    ),
  sendAudience: (data: {
    userIds: string[];
    campaignKey?: string;
    expiresInDays?: number;
    deliveryTiming?: "IMMEDIATE" | "NEXT_LOCAL_10AM" | "CUSTOM";
    scheduledFor?: string;
    recipientSchedules?: Array<{ userId: string; scheduledAt: string }>;
  }) =>
    api.post<{
      campaignKey: string;
      queued: number;
      scheduled: number;
      failed: number;
      excluded: Array<{ userId?: string; email?: string; reason: string }>;
    }>("/recovery-offers/admin/audience/send", {
      ...data,
      confirmed: true,
    }),
  metrics: (campaignKey?: string) =>
    api.get<RecoveryCampaignMetrics>("/recovery-offers/admin/metrics", {
      params: campaignKey ? { campaignKey } : undefined,
    }),
  lookup: (token: string) =>
    api.post<{
      recipient: string;
      days: number;
      status: string;
      expiresAt: string;
      claimedAt?: string;
      claimable: boolean;
      requiresEmailVerification: boolean;
      campaign: OfferCampaign;
    }>("/recovery-offers/lookup", { token }),
  claim: (token: string) =>
    api.post<{
      claimed: boolean;
      alreadyClaimed: boolean;
      days: number;
      currentPeriodEnd?: string;
      planName?: string;
      outcome?: "activated" | "extended" | "already_covered";
    }>("/recovery-offers/claim", { token }),
  unsubscribe: (token: string) =>
    api.post<{ unsubscribed: boolean; alreadyUnsubscribed: boolean }>(
      "/recovery-offers/unsubscribe",
      { token },
    ),
  recent: () =>
    api.get<
      Array<{
        id: string;
        campaignKey: string;
        email: string;
        days: number;
        status: string;
        sentAt?: string;
        deliveredAt?: string;
        firstOpenedAt?: string;
        openCount: number;
        firstClickedAt?: string;
        clickCount: number;
        bouncedAt?: string;
        complainedAt?: string;
        scheduledFor?: string;
        claimedAt?: string;
        expiresAt: string;
        createdAt: string;
      }>
    >("/recovery-offers/admin/recent"),
};

// ── Testing (admin-only) ────────────────────────────────
export const testingApi = {
  // Smoke tests
  runSmokeTests: () => api.get("/testing/smoke"),
  triggerSmokeTests: () => api.post("/testing/smoke"),
  runSellerCoreTests: () => api.post("/testing/seller-core"),
  runAiCreditsTests: () => api.post("/testing/ai-credits"),
  // E2E (Playwright)
  runE2ETests: () => api.post("/testing/e2e"),
  getLatestE2EReport: () => api.get("/testing/e2e"),
  // Integration tests (Jest)
  runIntegrationTests: () => api.post("/testing/integration"),
  getLatestIntegrationReport: () => api.get("/testing/integration"),
  // History
  getTestHistory: () => api.get("/testing/history"),
  clearTestHistory: () => api.delete("/testing/history"),
  // Info
  getGitInfo: () => api.get("/testing/git"),
  getRuntimeInfo: () => api.get("/testing/runtime"),
  // GitHub Actions CI
  getCIStatus: () => api.get("/testing/ci/status"),
  triggerCI: (branch?: string) =>
    api.post(`/testing/ci/trigger${branch ? `?branch=${branch}` : ""}`),
  getCIRuns: (limit?: number) =>
    api.get(`/testing/ci/runs${limit ? `?limit=${limit}` : ""}`),
  getCIRunDetail: (runId: number) => api.get(`/testing/ci/runs/${runId}`),
  rerunCI: (runId: number) => api.post(`/testing/ci/runs/${runId}/rerun`),
  cancelCI: (runId: number) => api.post(`/testing/ci/runs/${runId}/cancel`),
  // GitHub Token Management
  getGitHubTokenStatus: () => api.get("/testing/github-token"),
  registerGitHubToken: (data: {
    tokenName: string;
    tokenPrefix: string;
    expiresAt: string;
  }) => api.post("/testing/github-token", data),
  validateGitHubToken: () => api.post("/testing/github-token/validate"),
  deleteGitHubTokenConfig: () => api.delete("/testing/github-token"),
};

// ─── Contact Form API (public) ───
export const contactApi = {
  submit: (data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    interest?: string;
    message: string;
    source?: string;
  }) => api.post("/public/contact", data),
};

export default api;
