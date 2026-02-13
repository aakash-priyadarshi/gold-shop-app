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
  getCapabilities: () => api.get("/shops/my-shop/capabilities"),
  updateCapabilities: (data: any) =>
    api.put("/shops/my-shop/capabilities", data),
  // Gemstone pricing management
  getGemstonePricing: () => api.get("/shops/my-shop/gemstone-pricing"),
  updateGemstonePricing: (data: any) =>
    api.put("/shops/my-shop/gemstone-pricing", data),
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
  // For shopkeepers - use the correct endpoint
  getShopRequests: (params?: any) => api.get("/rfq/shop-requests", { params }),
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

// Seller Performance API
export const sellerPerformanceApi = {
  getMyDashboard: () => api.get("/seller-performance/my-dashboard"),
  getShopPerformance: (shopId: string) =>
    api.get(`/seller-performance/${shopId}`),
  recalculate: (shopId: string) =>
    api.post(`/seller-performance/recalculate/${shopId}`),
  recalculateAll: () => api.post("/seller-performance/recalculate-all"),
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
  addCustomerNote: (customerId: string, data: { note: string; category?: string }) =>
    api.post(`/users/customers/${customerId}/notes`, data),
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
};

export default api;
