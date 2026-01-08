// ══════════════════════════════════════════════════════════════════════════════
// GOLD SHOP MARKETPLACE - ORDER STATUS STATE MACHINES
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// INVENTORY ORDER STATUS FLOW
// ──────────────────────────────────────────────────────────────────────────────
export enum InventoryOrderStatus {
  CREATED = 'CREATED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

// Valid transitions for inventory orders
export const INVENTORY_ORDER_TRANSITIONS: Record<InventoryOrderStatus, InventoryOrderStatus[]> = {
  [InventoryOrderStatus.CREATED]: [InventoryOrderStatus.PAYMENT_PENDING, InventoryOrderStatus.CANCELLED],
  [InventoryOrderStatus.PAYMENT_PENDING]: [InventoryOrderStatus.PAID, InventoryOrderStatus.CANCELLED],
  [InventoryOrderStatus.PAID]: [InventoryOrderStatus.PACKED, InventoryOrderStatus.CANCELLED],
  [InventoryOrderStatus.PACKED]: [InventoryOrderStatus.SHIPPED],
  [InventoryOrderStatus.SHIPPED]: [InventoryOrderStatus.OUT_FOR_DELIVERY],
  [InventoryOrderStatus.OUT_FOR_DELIVERY]: [InventoryOrderStatus.DELIVERED],
  [InventoryOrderStatus.DELIVERED]: [InventoryOrderStatus.REFUNDED],
  [InventoryOrderStatus.CANCELLED]: [],
  [InventoryOrderStatus.REFUNDED]: [],
};

// ──────────────────────────────────────────────────────────────────────────────
// CUSTOM ORDER STATUS FLOW
// ──────────────────────────────────────────────────────────────────────────────
export enum CustomOrderStatus {
  CREATED = 'CREATED',
  BOOKING_PENDING = 'BOOKING_PENDING',
  BOOKING_PAID = 'BOOKING_PAID',
  EXPIRED = 'EXPIRED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  QC_PENDING = 'QC_PENDING',
  QC_PASSED = 'QC_PASSED',
  QC_FAILED = 'QC_FAILED',
  READY_TO_SHIP = 'READY_TO_SHIP',
  BALANCE_PENDING = 'BALANCE_PENDING',
  FULLY_PAID = 'FULLY_PAID',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

// Valid transitions for custom orders
export const CUSTOM_ORDER_TRANSITIONS: Record<CustomOrderStatus, CustomOrderStatus[]> = {
  [CustomOrderStatus.CREATED]: [CustomOrderStatus.BOOKING_PENDING],
  [CustomOrderStatus.BOOKING_PENDING]: [CustomOrderStatus.BOOKING_PAID, CustomOrderStatus.EXPIRED, CustomOrderStatus.CANCELLED],
  [CustomOrderStatus.BOOKING_PAID]: [CustomOrderStatus.IN_PRODUCTION],
  [CustomOrderStatus.EXPIRED]: [],
  [CustomOrderStatus.IN_PRODUCTION]: [CustomOrderStatus.QC_PENDING],
  [CustomOrderStatus.QC_PENDING]: [CustomOrderStatus.QC_PASSED, CustomOrderStatus.QC_FAILED],
  [CustomOrderStatus.QC_PASSED]: [CustomOrderStatus.READY_TO_SHIP],
  [CustomOrderStatus.QC_FAILED]: [CustomOrderStatus.IN_PRODUCTION],  // Rework
  [CustomOrderStatus.READY_TO_SHIP]: [CustomOrderStatus.BALANCE_PENDING],
  [CustomOrderStatus.BALANCE_PENDING]: [CustomOrderStatus.FULLY_PAID],
  [CustomOrderStatus.FULLY_PAID]: [CustomOrderStatus.SHIPPED],
  [CustomOrderStatus.SHIPPED]: [CustomOrderStatus.OUT_FOR_DELIVERY],
  [CustomOrderStatus.OUT_FOR_DELIVERY]: [CustomOrderStatus.DELIVERED],
  [CustomOrderStatus.DELIVERED]: [CustomOrderStatus.REFUNDED],
  [CustomOrderStatus.CANCELLED]: [],
  [CustomOrderStatus.REFUNDED]: [],
};

// ──────────────────────────────────────────────────────────────────────────────
// RFQ STATUS FLOW
// ──────────────────────────────────────────────────────────────────────────────
export enum RfqStatus {
  DRAFT = 'DRAFT',
  SENT_TO_SHOPS = 'SENT_TO_SHOPS',
  OFFERS_RECEIVED = 'OFFERS_RECEIVED',
  OFFER_SELECTED = 'OFFER_SELECTED',
  BOOKING_PENDING = 'BOOKING_PENDING',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const RFQ_TRANSITIONS: Record<RfqStatus, RfqStatus[]> = {
  [RfqStatus.DRAFT]: [RfqStatus.SENT_TO_SHOPS, RfqStatus.CANCELLED],
  [RfqStatus.SENT_TO_SHOPS]: [RfqStatus.OFFERS_RECEIVED, RfqStatus.EXPIRED],
  [RfqStatus.OFFERS_RECEIVED]: [RfqStatus.OFFER_SELECTED, RfqStatus.EXPIRED],
  [RfqStatus.OFFER_SELECTED]: [RfqStatus.BOOKING_PENDING],
  [RfqStatus.BOOKING_PENDING]: [RfqStatus.CONFIRMED, RfqStatus.EXPIRED],
  [RfqStatus.CONFIRMED]: [],  // Terminal - order created
  [RfqStatus.EXPIRED]: [],
  [RfqStatus.CANCELLED]: [],
};

// ──────────────────────────────────────────────────────────────────────────────
// OFFER STATUS FLOW
// ──────────────────────────────────────────────────────────────────────────────
export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  COUNTERED = 'COUNTERED',
  DECLINED = 'DECLINED',
  SELECTED = 'SELECTED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OfferStatus.PENDING]: [OfferStatus.ACCEPTED, OfferStatus.COUNTERED, OfferStatus.DECLINED, OfferStatus.EXPIRED],
  [OfferStatus.ACCEPTED]: [OfferStatus.SELECTED, OfferStatus.EXPIRED],
  [OfferStatus.COUNTERED]: [OfferStatus.SELECTED, OfferStatus.EXPIRED, OfferStatus.WITHDRAWN],
  [OfferStatus.DECLINED]: [],
  [OfferStatus.SELECTED]: [],
  [OfferStatus.EXPIRED]: [],
  [OfferStatus.WITHDRAWN]: [],
};

// ──────────────────────────────────────────────────────────────────────────────
// PRODUCTION MILESTONES
// ──────────────────────────────────────────────────────────────────────────────
export enum ProductionMilestone {
  CAD_APPROVED = 'CAD_APPROVED',
  CASTING_STARTED = 'CASTING_STARTED',
  STONE_SETTING = 'STONE_SETTING',
  POLISHING = 'POLISHING',
  QUALITY_CHECK = 'QUALITY_CHECK',
  PACKAGING = 'PACKAGING',
  DISPATCHED = 'DISPATCHED',
}

export const PRODUCTION_MILESTONE_ORDER: ProductionMilestone[] = [
  ProductionMilestone.CAD_APPROVED,
  ProductionMilestone.CASTING_STARTED,
  ProductionMilestone.STONE_SETTING,
  ProductionMilestone.POLISHING,
  ProductionMilestone.QUALITY_CHECK,
  ProductionMilestone.PACKAGING,
  ProductionMilestone.DISPATCHED,
];

export interface MilestoneRecord {
  milestone: ProductionMilestone;
  timestamp: Date;
  actor: 'SHOP' | 'ADMIN' | 'SYSTEM';
  actorId?: string;
  evidence?: string[];  // URLs to photos/videos
  notes?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// STATE MACHINE HELPERS
// ──────────────────────────────────────────────────────────────────────────────
export function canTransitionInventoryOrder(
  from: InventoryOrderStatus,
  to: InventoryOrderStatus
): boolean {
  return INVENTORY_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionCustomOrder(
  from: CustomOrderStatus,
  to: CustomOrderStatus
): boolean {
  return CUSTOM_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionRfq(from: RfqStatus, to: RfqStatus): boolean {
  return RFQ_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionOffer(from: OfferStatus, to: OfferStatus): boolean {
  return OFFER_TRANSITIONS[from]?.includes(to) ?? false;
}

// ──────────────────────────────────────────────────────────────────────────────
// STATUS LABELS (Localized)
// ──────────────────────────────────────────────────────────────────────────────
export const ORDER_STATUS_LABELS: Record<string, { en: string; ne: string; hi: string }> = {
  CREATED: { en: 'Order Created', ne: 'अर्डर सिर्जना भयो', hi: 'ऑर्डर बनाया गया' },
  PAYMENT_PENDING: { en: 'Payment Pending', ne: 'भुक्तानी बाँकी', hi: 'भुगतान लंबित' },
  PAID: { en: 'Payment Received', ne: 'भुक्तानी प्राप्त', hi: 'भुगतान प्राप्त' },
  PACKED: { en: 'Order Packed', ne: 'अर्डर प्याक भयो', hi: 'ऑर्डर पैक किया गया' },
  SHIPPED: { en: 'Shipped', ne: 'पठाइयो', hi: 'भेज दिया गया' },
  OUT_FOR_DELIVERY: { en: 'Out for Delivery', ne: 'डेलिभरीमा', hi: 'डिलीवरी के लिए निकला' },
  DELIVERED: { en: 'Delivered', ne: 'पुर्‍याइयो', hi: 'पहुंचा दिया' },
  IN_PRODUCTION: { en: 'In Production', ne: 'उत्पादनमा', hi: 'उत्पादन में' },
  QC_PENDING: { en: 'Quality Check Pending', ne: 'गुणस्तर जाँच बाँकी', hi: 'गुणवत्ता जांच लंबित' },
  QC_PASSED: { en: 'Quality Check Passed', ne: 'गुणस्तर जाँच पास', hi: 'गुणवत्ता जांच पास' },
  QC_FAILED: { en: 'Quality Check Failed', ne: 'गुणस्तर जाँच असफल', hi: 'गुणवत्ता जांच विफल' },
  READY_TO_SHIP: { en: 'Ready to Ship', ne: 'पठाउन तयार', hi: 'भेजने के लिए तैयार' },
  CANCELLED: { en: 'Cancelled', ne: 'रद्द गरियो', hi: 'रद्द कर दिया गया' },
  REFUNDED: { en: 'Refunded', ne: 'फिर्ता गरियो', hi: 'वापस कर दिया गया' },
  EXPIRED: { en: 'Expired', ne: 'म्याद सकियो', hi: 'समाप्त हो गया' },
};
