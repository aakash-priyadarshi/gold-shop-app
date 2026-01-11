import axios from 'axios';

// Ensure the API URL always ends with /api
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

// Export for use in other files that need the base URL
export const getApiUrl = () => API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and currency header
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add currency header from preferences store
    try {
      const prefsJson = localStorage.getItem('gold-shop-preferences');
      if (prefsJson) {
        const prefs = JSON.parse(prefsJson);
        if (prefs.state?.currency) {
          config.headers['X-Currency'] = prefs.state.currency;
        }
      }
    } catch {
      // Fallback to NPR if preferences can't be read
      config.headers['X-Currency'] = 'NPR';
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// Users API
export const usersApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/users/me/password', data),
};

// Shops API
export const shopsApi = {
  getAll: (params?: any) => api.get('/shops', { params }),
  getById: (id: string) => api.get(`/shops/${id}`),
  create: (data: any) => api.post('/shops', data),
  update: (id: string, data: any) => api.patch(`/shops/${id}`, data),
  updateRates: (id: string, data: any) => api.patch(`/shops/${id}/rates`, data),
  getDashboard: (id: string) => api.get(`/shops/${id}/dashboard`),
};

// Inventory API
export const inventoryApi = {
  getAll: (params?: any) => api.get('/inventory', { params }),
  getById: (id: string) => api.get(`/inventory/${id}`),
  create: (shopId: string, data: any) => api.post(`/inventory/shop/${shopId}`, data),
  update: (id: string, data: any) => api.patch(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  getShopInventory: (shopId: string, params?: any) =>
    api.get(`/inventory/shop/${shopId}/items`, { params }),
  getStats: (shopId: string) => api.get(`/inventory/shop/${shopId}/stats`),
};

// RFQ API
export const rfqApi = {
  create: (data: any) => api.post('/rfq', data),
  getMyRequests: (params?: any) => api.get('/rfq/my-requests', { params }),
  getById: (id: string) => api.get(`/rfq/${id}`),
  update: (id: string, data: any) => api.patch(`/rfq/${id}`, data),
  broadcast: (id: string, data: any) => api.post(`/rfq/${id}/broadcast`, data),
  getOffers: (id: string) => api.get(`/rfq/${id}/offers`),
  selectOffer: (id: string, offerId: string) =>
    api.post(`/rfq/${id}/select-offer`, { offerId }),
  // For shopkeepers
  getReceivedRequests: (shopId: string, params?: any) =>
    api.get(`/rfq/shop/${shopId}`, { params }),
};

// Offers API
export const offersApi = {
  create: (rfqId: string, data: any) => api.post(`/offers/rfq/${rfqId}`, data),
  update: (id: string, data: any) => api.patch(`/offers/${id}`, data),
  accept: (id: string) => api.post(`/offers/${id}/accept`),
  counter: (id: string, data: any) => api.post(`/offers/${id}/counter`, data),
  decline: (id: string) => api.post(`/offers/${id}/decline`),
};

// Orders API
export const ordersApi = {
  createInventoryOrder: (data: any) => api.post('/orders/inventory', data),
  createCustomOrder: (data: any) => api.post('/orders/custom', data),
  getMyOrders: (params?: any) => api.get('/orders/my-orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  cancel: (id: string, reason: string) => api.post(`/orders/${id}/cancel`, { reason }),
  // For shopkeepers
  getShopOrders: (shopId: string, params?: any) =>
    api.get(`/orders/shop/${shopId}`, { params }),
  updateStatus: (id: string, data: any) => api.patch(`/orders/${id}/status`, data),
  addMilestone: (id: string, data: any) => api.post(`/orders/${id}/milestones`, data),
  completeMilestone: (orderId: string, milestoneId: string) =>
    api.patch(`/orders/${orderId}/milestones/${milestoneId}/complete`),
};

// Payments API
export const paymentsApi = {
  initiatePayment: (data: any) => api.post('/payments/initiate', data),
  initiateBookingPayment: (data: any) => api.post('/payments/booking', data),
  verifyPayment: (data: any) => api.post('/payments/verify', data),
  getOrderPayments: (orderId: string) => api.get(`/payments/order/${orderId}`),
  getMyPayments: (params?: any) => api.get('/payments/my-payments', { params }),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// OTP API
export const otpApi = {
  send: (type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET', target?: string) =>
    api.post('/otp/send', { type, target }),
  verify: (type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET', code: string) =>
    api.post('/otp/verify', { type, code }),
  resend: (type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET') =>
    api.post('/otp/resend', { type }),
};

// Admin API
export const adminApi = {
  // Stats
  getStats: () => api.get('/admin/stats'),
  
  // Verifications
  getVerifications: (status?: string) => 
    api.get('/admin/verifications', { params: status ? { status } : undefined }),
  approveVerification: (id: string) => api.patch(`/admin/verifications/${id}/approve`),
  rejectVerification: (id: string, reason: string) => 
    api.patch(`/admin/verifications/${id}/reject`, { reason }),
  
  // Reports
  getReports: (status?: string) => 
    api.get('/admin/reports', { params: status ? { status } : undefined }),
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
  }) => api.post('/admin/users', data),
  
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
  }) => api.post('/admin/shops', data),
  
  // Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: Record<string, any>) => api.patch('/admin/settings', data),
  refreshMarketRates: () => api.post('/admin/settings/refresh-rates'),
  clearCache: () => api.post('/admin/settings/clear-cache'),
  
  // System notifications
  broadcastNotification: (data: {
    title: string;
    message: string;
    type: string;
    targetRoles?: string[];
  }) => api.post('/admin/notifications/broadcast', data),
  getSystemNotifications: () => api.get('/admin/notifications/system'),
};

// Materials API
export const materialsApi = {
  getAll: () => api.get('/materials'),
  getPreciousMetals: () => api.get('/materials/precious-metals'),
  getBaseMetals: () => api.get('/materials/base-metals'),
  getJewelleryTypes: () => api.get('/materials/jewellery-types'),
  getBuildMethods: () => api.get('/materials/build-methods'),
  getMarketRates: () => api.get('/materials/market-rates'),
};

export default api;
