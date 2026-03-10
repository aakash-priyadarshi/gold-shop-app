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

// Request interceptor to add auth token and currency header
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Add auth token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/auth/login";
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
  }) => api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  refresh: () => api.post("/auth/refresh"),
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
  getSettings: () => api.get("/shops/my-shop/settings"),
  updateSettings: (data: any) => api.patch("/shops/my-shop/settings", data),
  getAnalytics: (params?: any) =>
    api.get("/shops/my-shop/analytics", { params }),
  // Inventory materials management
  getMaterials: () => api.get("/shops/my-shop/materials"),
  updateMaterials: (data: any) => api.put("/shops/my-shop/materials", data),
  // Capabilities management
  getKyc: () => api.get("/shops/my-shop/kyc"),
  updateKyc: (data: {
    panNumber?: string;
    vatNumber?: string;
    bisLicenseNumber?: string;
    verificationDocuments?: Record<string, any>;
  }) => api.patch("/shops/my-shop/kyc", data),
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
  update: (id: string, data: any) => api.patch(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  getShopInventory: (shopId: string, params?: any) =>
    api.get(`/inventory/shop/${shopId}/items`, { params }),
  getStats: (shopId: string) => api.get(`/inventory/shop/${shopId}/stats`),
  updateVisibility: (itemId: string, visibility: string) =>
    api.patch(`/catalogues/inventory/${itemId}/visibility`, { visibility }),
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

  // Verifications
  getVerifications: (status?: string) =>
    api.get("/admin/verifications", {
      params: status ? { status } : undefined,
    }),
  approveVerification: (id: string) =>
    api.patch(`/admin/verifications/${id}/approve`),
  rejectVerification: (id: string, reason: string) =>
    api.patch(`/admin/verifications/${id}/reject`, { reason }),

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

  // KYC Review
  getShopKyc: (shopId: string) => api.get(`/shops/${shopId}/kyc`),
  updateShopKycStatus: (
    shopId: string,
    action: "approve" | "reject",
    reason?: string,
  ) => api.patch(`/shops/${shopId}/kyc-status`, { action, reason }),

  // Email settings
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
  updateStatus: (id: string, data: { status: string; cancelReason?: string }) =>
    api.put(`/shop-quotes/${id}/status`, data),

  // Payment recording
  recordPayment: (id: string, data: { amountNpr: number; notes?: string }) =>
    api.post(`/shop-quotes/${id}/payment`, data),

  // Statistics and analytics
  getStats: () => api.get("/shop-quotes/stats"),

  // Customer history
  getCustomerHistory: (customerId: string) =>
    api.get(`/shop-quotes/customer/${customerId}`),
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
  createReferral: (data: { refereeEmail: string; rewardType: string }) =>
    api.post("/seller-performance/referrals", data),
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
    proMonths?: number;
    proPlusMonths?: number;
    expirationDays?: number;
    maxReferralsPerShop?: number;
    isActive?: boolean;
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
  void: (id: string) => api.post(`/invoices/${id}/void`),
  getStats: () => api.get("/invoices/stats"),
  getSettings: () => api.get("/invoices/settings"),
  updateSettings: (data: any) => api.patch("/invoices/settings", data),
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
  getPendingVerifications: () => api.get("/support/pending-verifications"),
  getRecentActivity: (limit = 50) =>
    api.get("/support/activity", { params: { limit } }),
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
  getCustomerPicks: (customerId: string) =>
    api.get(`/pos/customer-picks/${customerId}`),
  getActiveSession: () => api.get("/pos/session/active"),
  createSession: (data: { customerId?: string; conversationId?: string }) =>
    api.post("/pos/session", data),
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
      notes?: string;
      taxRate?: number;
      discountAmount?: number;
    },
  ) => api.post(`/pos/session/${sessionId}/checkout`, data),
  cancelSession: (sessionId: string) => api.delete(`/pos/session/${sessionId}`),
  getSession: (sessionId: string) => api.get(`/pos/session/${sessionId}`),
};

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
  }) => api.post("/seller-subscriptions/subscribe", data),
  cancel: (id: string, data?: { reason?: string; immediate?: boolean }) =>
    api.post(`/seller-subscriptions/${id}/cancel`, data || {}),
  getMySubscription: () => api.get("/seller-subscriptions/my-subscription"),
  getMyHistory: () => api.get("/seller-subscriptions/my-history"),
  getMyUsage: () => api.get("/seller-subscriptions/my-usage"),
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
  payOrder: (orderId: string, preferredGateway?: string) =>
    api.post(`/orders/${orderId}/pay`, { preferredGateway }),
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
  }) => api.post("/crash-reports", data),

  /** Get paginated crash reports (admin) */
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    platform?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    if (params?.platform) query.set("platform", params.platform);
    const qs = query.toString();
    return api.get(`/crash-reports${qs ? `?${qs}` : ""}`);
  },

  /** Get crash report stats (admin) */
  getStats: () => api.get("/crash-reports/stats"),

  /** Get a single report */
  getById: (id: string) => api.get(`/crash-reports/${id}`),

  /** Update status or admin notes */
  update: (id: string, data: { status?: string; adminNotes?: string }) =>
    api.patch(`/crash-reports/${id}`, data),

  /** Delete a crash report */
  remove: (id: string) => api.delete(`/crash-reports/${id}`),
};

// ── Testing (admin-only) ────────────────────────────────
export const testingApi = {
  // Smoke tests
  runSmokeTests: () => api.get("/testing/smoke"),
  triggerSmokeTests: () => api.post("/testing/smoke"),
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

export default api;
