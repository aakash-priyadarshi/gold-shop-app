// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  messageKey: string;  // For i18n
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'SHOPKEEPER';
  preferredLanguage?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  preferredLanguage: string;
  shopId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHOP TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ShopProfile {
  id: string;
  shopName: string;
  shopNameNe?: string;
  shopNameHi?: string;
  description?: string;
  country: string;
  city: string;
  address: string;
  isVerified: boolean;
  isActive: boolean;
  
  supportedJewelleryTypes: string[];
  supportedMethods: string[];
  supportedMaterials: string[];
  supportedFinishes: string[];
  
  codEnabled: boolean;
  makingChargePercent: number;
  
  ratings?: ShopRatingsSummary;
}

export interface ShopRatingsSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ShopMetalRateDto {
  metalType: string;
  ratePerGramNpr: number;
  lastUpdatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// RFQ TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateRfqRequest {
  jewelleryType: string;
  buildMethod: string;
  composition: Record<string, unknown>;
  targetTotalWeightG?: number;
  targetGoldWeightG?: number;
  budgetMinNpr?: number;
  budgetMaxNpr?: number;
  preferredDeliveryDays?: number;
  specialInstructions?: string;
  referenceImages?: string[];
}

export interface RfqDetail {
  id: string;
  customerId: string;
  jewelleryType: string;
  buildMethod: string;
  composition: Record<string, unknown>;
  targetTotalWeightG?: number;
  budgetMinNpr?: number;
  budgetMaxNpr?: number;
  estimatedPriceMinNpr?: number;
  estimatedPriceMaxNpr?: number;
  status: string;
  mandatoryLabels: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface BroadcastRfqRequest {
  rfqId: string;
  shopIds: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFER TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface OfferDetail {
  id: string;
  rfqId: string;
  shopId: string;
  shopName: string;
  offerType: 'ACCEPT' | 'COUNTER' | 'DECLINE';
  declineReason?: string;
  
  confirmedComposition: Record<string, unknown>;
  confirmedTotalWeightG?: number;
  confirmedGoldWeightG?: number;
  
  // Price breakdown
  metalCostNpr: number;
  makingChargeNpr: number;
  finishCostNpr: number;
  gemstoneCostNpr: number;
  taxNpr: number;
  totalPriceNpr: number;
  
  estimatedDays: number;
  bookingFeeNpr: number;
  bookingFeePercent: number;
  
  shopNotes?: string;
  status: string;
  createdAt: string;
}

export interface CreateOfferRequest {
  rfqId: string;
  offerType: 'ACCEPT' | 'COUNTER' | 'DECLINE';
  declineReason?: string;
  
  confirmedComposition?: Record<string, unknown>;
  confirmedTotalWeightG?: number;
  confirmedGoldWeightG?: number;
  
  metalCostNpr?: number;
  makingChargeNpr?: number;
  finishCostNpr?: number;
  gemstoneCostNpr?: number;
  taxNpr?: number;
  
  estimatedDays?: number;
  bookingFeePercent?: number;
  shopNotes?: string;
}

export interface SelectOfferRequest {
  rfqId: string;
  offerId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDER TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface OrderDetail {
  id: string;
  orderNumber: string;
  orderType: 'INVENTORY' | 'CUSTOM';
  customerId: string;
  shopId: string;
  shopName: string;
  
  productSnapshot: Record<string, unknown>;
  
  subtotalNpr: number;
  taxNpr: number;
  shippingNpr: number;
  discountNpr: number;
  totalNpr: number;
  
  paymentMethod: string;
  paymentStatus: string;
  bookingFeePaidNpr?: number;
  balanceDueNpr: number;
  
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  estimatedDelivery?: string;
  
  status: string;
  milestones: MilestoneDto[];
  
  createdAt: string;
  bookingExpiresAt?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  pincode?: string;
}

export interface MilestoneDto {
  type: string;
  title: string;
  description?: string;
  actorType: string;
  evidenceUrls: string[];
  completedAt: string;
}

export interface CreateInventoryOrderRequest {
  inventoryItemId: string;
  shippingAddress: ShippingAddress;
  paymentMethod: 'ONLINE' | 'COD';
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface NotificationDto {
  id: string;
  type: string;
  titleKey: string;
  titleParams?: Record<string, unknown>;
  bodyKey: string;
  bodyParams?: Record<string, unknown>;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER MESSAGE TYPES (System Events)
// ══════════════════════════════════════════════════════════════════════════════

export interface HelperMessage {
  type: string;
  key: string;
  params: Record<string, unknown>;
  timestamp: string;
}

export const HELPER_MESSAGE_KEYS = {
  RFQ_SENT: 'helper.rfqSentToShops',           // "RFQ sent to {count} shops"
  OFFER_RECEIVED: 'helper.offerReceived',       // "Offer received from {shopName}"
  BOOKING_REMINDER: 'helper.bookingExpires',    // "Booking fee expires in {time}"
  ORDER_EXPIRED: 'helper.orderExpired',         // "Order expired due to non-payment"
  PRODUCTION_STARTED: 'helper.productionStarted', // "Production started"
  QC_COMPLETED: 'helper.qcCompleted',           // "QC completed"
} as const;
