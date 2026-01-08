import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  refresh: () => api.post('/api/auth/refresh'),
};

// Users API
export const usersApi = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (data: any) => api.patch('/api/users/profile', data),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/api/users/password', data),
};

// Shops API
export const shopsApi = {
  getAll: (params?: any) => api.get('/api/shops', { params }),
  getById: (id: string) => api.get(`/api/shops/${id}`),
  create: (data: any) => api.post('/api/shops', data),
  update: (id: string, data: any) => api.patch(`/api/shops/${id}`, data),
  updateRates: (id: string, data: any) => api.patch(`/api/shops/${id}/rates`, data),
  getDashboard: (id: string) => api.get(`/api/shops/${id}/dashboard`),
};

// Inventory API
export const inventoryApi = {
  getAll: (params?: any) => api.get('/api/inventory', { params }),
  getById: (id: string) => api.get(`/api/inventory/${id}`),
  create: (shopId: string, data: any) => api.post(`/api/inventory/shop/${shopId}`, data),
  update: (id: string, data: any) => api.patch(`/api/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/api/inventory/${id}`),
  getShopInventory: (shopId: string, params?: any) =>
    api.get(`/api/inventory/shop/${shopId}/items`, { params }),
  getStats: (shopId: string) => api.get(`/api/inventory/shop/${shopId}/stats`),
};

// RFQ API
export const rfqApi = {
  create: (data: any) => api.post('/api/rfq', data),
  getMyRequests: (params?: any) => api.get('/api/rfq/my-requests', { params }),
  getById: (id: string) => api.get(`/api/rfq/${id}`),
  update: (id: string, data: any) => api.patch(`/api/rfq/${id}`, data),
  broadcast: (id: string, data: any) => api.post(`/api/rfq/${id}/broadcast`, data),
  getOffers: (id: string) => api.get(`/api/rfq/${id}/offers`),
  selectOffer: (id: string, offerId: string) =>
    api.post(`/api/rfq/${id}/select-offer`, { offerId }),
  // For shopkeepers
  getReceivedRequests: (shopId: string, params?: any) =>
    api.get(`/api/rfq/shop/${shopId}`, { params }),
};

// Offers API
export const offersApi = {
  create: (rfqId: string, data: any) => api.post(`/api/offers/rfq/${rfqId}`, data),
  update: (id: string, data: any) => api.patch(`/api/offers/${id}`, data),
  accept: (id: string) => api.post(`/api/offers/${id}/accept`),
  counter: (id: string, data: any) => api.post(`/api/offers/${id}/counter`, data),
  decline: (id: string) => api.post(`/api/offers/${id}/decline`),
};

// Orders API
export const ordersApi = {
  createInventoryOrder: (data: any) => api.post('/api/orders/inventory', data),
  createCustomOrder: (data: any) => api.post('/api/orders/custom', data),
  getMyOrders: (params?: any) => api.get('/api/orders/my-orders', { params }),
  getById: (id: string) => api.get(`/api/orders/${id}`),
  cancel: (id: string, reason: string) => api.post(`/api/orders/${id}/cancel`, { reason }),
  // For shopkeepers
  getShopOrders: (shopId: string, params?: any) =>
    api.get(`/api/orders/shop/${shopId}`, { params }),
  updateStatus: (id: string, data: any) => api.patch(`/api/orders/${id}/status`, data),
  addMilestone: (id: string, data: any) => api.post(`/api/orders/${id}/milestones`, data),
  completeMilestone: (orderId: string, milestoneId: string) =>
    api.patch(`/api/orders/${orderId}/milestones/${milestoneId}/complete`),
};

// Payments API
export const paymentsApi = {
  initiatePayment: (data: any) => api.post('/api/payments/initiate', data),
  initiateBookingPayment: (data: any) => api.post('/api/payments/booking', data),
  verifyPayment: (data: any) => api.post('/api/payments/verify', data),
  getOrderPayments: (orderId: string) => api.get(`/api/payments/order/${orderId}`),
  getMyPayments: (params?: any) => api.get('/api/payments/my-payments', { params }),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: any) => api.get('/api/notifications', { params }),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/api/notifications/read-all'),
};

// Materials API
export const materialsApi = {
  getAll: () => api.get('/api/materials'),
  getPreciousMetals: () => api.get('/api/materials/precious-metals'),
  getBaseMetals: () => api.get('/api/materials/base-metals'),
  getJewelleryTypes: () => api.get('/api/materials/jewellery-types'),
  getBuildMethods: () => api.get('/api/materials/build-methods'),
  getMarketRates: () => api.get('/api/materials/market-rates'),
};

export default api;
