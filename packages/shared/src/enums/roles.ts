// ══════════════════════════════════════════════════════════════════════════════
// GOLD SHOP MARKETPLACE - USER ROLES & PERMISSIONS
// FIVE ROLES: ADMIN, SHOPKEEPER, CUSTOMER, SUPPORT, SALES
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// USER ROLES
// ──────────────────────────────────────────────────────────────────────────────
export enum UserRole {
  ADMIN = 'ADMIN',
  SHOPKEEPER = 'SHOPKEEPER',
  CUSTOMER = 'CUSTOMER',
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
}

// ──────────────────────────────────────────────────────────────────────────────
// RESOURCE TYPES FOR RBAC
// ──────────────────────────────────────────────────────────────────────────────
export enum Resource {
  // User management
  USER = 'USER',
  USER_SELF = 'USER_SELF',
  
  // Shop management
  SHOP = 'SHOP',
  SHOP_SELF = 'SHOP_SELF',
  SHOP_RATES = 'SHOP_RATES',
  
  // Products
  INVENTORY_ITEM = 'INVENTORY_ITEM',
  
  // Orders & RFQs
  ORDER = 'ORDER',
  ORDER_SELF = 'ORDER_SELF',
  RFQ = 'RFQ',
  RFQ_SELF = 'RFQ_SELF',
  OFFER = 'OFFER',
  
  // Payments
  PAYMENT = 'PAYMENT',
  
  // System
  AUDIT_LOG = 'AUDIT_LOG',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  MARKET_RATE = 'MARKET_RATE',
  MATERIAL = 'MATERIAL',
  
  // Notifications
  NOTIFICATION = 'NOTIFICATION',
  
  // Reports
  REPORT = 'REPORT',
}

// ──────────────────────────────────────────────────────────────────────────────
// ACTIONS
// ──────────────────────────────────────────────────────────────────────────────
export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  
  // Special actions
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  
  // Order-specific
  CANCEL = 'CANCEL',
  REFUND = 'REFUND',
  UPDATE_STATUS = 'UPDATE_STATUS',
  
  // RFQ-specific
  BROADCAST = 'BROADCAST',
  RESPOND = 'RESPOND',
  SELECT_OFFER = 'SELECT_OFFER',
  
  // Price-specific (Support CANNOT do these)
  MODIFY_PRICE = 'MODIFY_PRICE',
  MODIFY_MATERIAL = 'MODIFY_MATERIAL',
}

// ──────────────────────────────────────────────────────────────────────────────
// PERMISSION MATRIX
// Admin overrides everything
// Support cannot modify prices or materials
// Shopkeeper cannot modify platform rules
// Customers cannot see internal cost logic of shops
// ──────────────────────────────────────────────────────────────────────────────

export type Permission = `${Resource}:${Action}`;

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admin can do EVERYTHING
    '*:*' as Permission,
  ],
  
  [UserRole.SHOPKEEPER]: [
    // Self management
    'USER_SELF:READ',
    'USER_SELF:UPDATE',
    
    // Shop management (own shop only)
    'SHOP_SELF:READ',
    'SHOP_SELF:UPDATE',
    'SHOP_RATES:READ',
    'SHOP_RATES:UPDATE',
    'SHOP_RATES:MODIFY_PRICE',
    
    // Inventory management (own)
    'INVENTORY_ITEM:CREATE',
    'INVENTORY_ITEM:READ',
    'INVENTORY_ITEM:UPDATE',
    'INVENTORY_ITEM:DELETE',
    'INVENTORY_ITEM:LIST',
    'INVENTORY_ITEM:MODIFY_PRICE',
    'INVENTORY_ITEM:MODIFY_MATERIAL',
    
    // Orders (own shop)
    'ORDER:READ',
    'ORDER:LIST',
    'ORDER:UPDATE_STATUS',
    
    // RFQ responses
    'RFQ:READ',
    'RFQ:LIST',
    'OFFER:CREATE',
    'OFFER:READ',
    'OFFER:UPDATE',
    'OFFER:RESPOND',
    
    // Market rates (read only)
    'MARKET_RATE:READ',
    
    // Materials (read only)
    'MATERIAL:READ',
    'MATERIAL:LIST',
    
    // Notifications
    'NOTIFICATION:READ',
    'NOTIFICATION:LIST',
    
    // Reports (own)
    'REPORT:READ',
  ] as Permission[],
  
  [UserRole.CUSTOMER]: [
    // Self management
    'USER_SELF:READ',
    'USER_SELF:UPDATE',
    
    // Browse shops and inventory
    'SHOP:READ',
    'SHOP:LIST',
    'INVENTORY_ITEM:READ',
    'INVENTORY_ITEM:LIST',
    
    // Own orders
    'ORDER_SELF:CREATE',
    'ORDER_SELF:READ',
    'ORDER_SELF:LIST',
    'ORDER_SELF:CANCEL',
    
    // RFQ management (own)
    'RFQ_SELF:CREATE',
    'RFQ_SELF:READ',
    'RFQ_SELF:UPDATE',
    'RFQ_SELF:LIST',
    'RFQ_SELF:BROADCAST',
    'RFQ_SELF:SELECT_OFFER',
    
    // View offers (on own RFQs)
    'OFFER:READ',
    'OFFER:LIST',
    
    // Payments (own)
    'PAYMENT:CREATE',
    'PAYMENT:READ',
    
    // Market rates (read)
    'MARKET_RATE:READ',
    
    // Materials (read)
    'MATERIAL:READ',
    'MATERIAL:LIST',
    
    // Notifications
    'NOTIFICATION:READ',
    'NOTIFICATION:LIST',
  ] as Permission[],
  
  [UserRole.SUPPORT]: [
    // User management (read, cannot modify sensitive data)
    'USER:READ',
    'USER:LIST',
    
    // Shop viewing
    'SHOP:READ',
    'SHOP:LIST',
    
    // Inventory viewing
    'INVENTORY_ITEM:READ',
    'INVENTORY_ITEM:LIST',
    
    // Order management (cannot refund)
    'ORDER:READ',
    'ORDER:LIST',
    'ORDER:UPDATE_STATUS',
    
    // RFQ viewing
    'RFQ:READ',
    'RFQ:LIST',
    'OFFER:READ',
    'OFFER:LIST',
    
    // Cannot modify prices or materials!
    // 'MODIFY_PRICE' and 'MODIFY_MATERIAL' are NOT included
    
    // Audit logs (read)
    'AUDIT_LOG:READ',
    'AUDIT_LOG:LIST',
    
    // Notifications
    'NOTIFICATION:READ',
    'NOTIFICATION:LIST',
    'NOTIFICATION:CREATE',  // Can send notifications
    
    // Market rates (read)
    'MARKET_RATE:READ',
    
    // Materials (read)
    'MATERIAL:READ',
    'MATERIAL:LIST',
  ] as Permission[],

  [UserRole.SALES]: [
    // User management (read-only for CRM)
    'USER:READ',
    'USER:LIST',

    // Shop viewing & seller management
    'SHOP:READ',
    'SHOP:LIST',

    // Inventory viewing
    'INVENTORY_ITEM:READ',
    'INVENTORY_ITEM:LIST',

    // Orders (view + status for escalation handling)
    'ORDER:READ',
    'ORDER:LIST',
    'ORDER:UPDATE_STATUS',

    // RFQ management (assist customers)
    'RFQ:READ',
    'RFQ:LIST',
    'OFFER:READ',
    'OFFER:LIST',

    // Cannot modify prices or materials!

    // Notifications (read + send)
    'NOTIFICATION:READ',
    'NOTIFICATION:LIST',
    'NOTIFICATION:CREATE',

    // Market rates (read)
    'MARKET_RATE:READ',

    // Materials (read)
    'MATERIAL:READ',
    'MATERIAL:LIST',

    // Reports
    'REPORT:READ',
    'REPORT:LIST',
  ] as Permission[],
};

// ──────────────────────────────────────────────────────────────────────────────
// PERMISSION CHECKING FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

export function hasPermission(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  // Admin can do everything
  if (role === UserRole.ADMIN) {
    return true;
  }
  
  const permissions = ROLE_PERMISSIONS[role];
  const requiredPermission = `${resource}:${action}` as Permission;
  
  return permissions.includes(requiredPermission);
}

export function canModifyPrices(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SHOPKEEPER;
}

export function canModifyMaterials(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SHOPKEEPER;
}

export function canAccessInternalCostLogic(role: UserRole): boolean {
  // Customers cannot see internal cost logic of shops
  return role !== UserRole.CUSTOMER;
}

export function canModifyPlatformRules(role: UserRole): boolean {
  // Only Admin can modify platform rules
  return role === UserRole.ADMIN;
}

// ──────────────────────────────────────────────────────────────────────────────
// ROLE DESCRIPTIONS
// ──────────────────────────────────────────────────────────────────────────────
export const ROLE_DESCRIPTIONS: Record<UserRole, { en: string; ne: string; hi: string }> = {
  [UserRole.ADMIN]: {
    en: 'Platform Administrator - Full system access',
    ne: 'प्लेटफर्म प्रशासक - पूर्ण प्रणाली पहुँच',
    hi: 'प्लेटफ़ॉर्म व्यवस्थापक - पूर्ण सिस्टम एक्सेस',
  },
  [UserRole.SHOPKEEPER]: {
    en: 'Shopkeeper / Goldsmith / Vendor - Manage shop and orders',
    ne: 'पसले / सुनार / विक्रेता - पसल र अर्डर व्यवस्थापन',
    hi: 'दुकानदार / सुनार / विक्रेता - दुकान और ऑर्डर प्रबंधन',
  },
  [UserRole.CUSTOMER]: {
    en: 'Customer - Browse, order, and request custom jewellery',
    ne: 'ग्राहक - हेर्नुहोस्, अर्डर गर्नुहोस्, र कस्टम गहना अनुरोध गर्नुहोस्',
    hi: 'ग्राहक - ब्राउज़ करें, ऑर्डर करें, और कस्टम गहने का अनुरोध करें',
  },
  [UserRole.SUPPORT]: {
    en: 'Support Staff - Customer service and order tracking',
    ne: 'सहायता कर्मचारी - ग्राहक सेवा र अर्डर ट्र्याकिङ',
    hi: 'सहायता कर्मचारी - ग्राहक सेवा और ऑर्डर ट्रैकिंग',
  },
  [UserRole.SALES]: {
    en: 'Sales Agent - Seller onboarding, CRM, and escalation handling',
    ne: 'बिक्री एजेन्ट - विक्रेता अनबोर्डिङ, CRM, र एस्केलेसन ह्यान्डलिङ',
    hi: 'बिक्री एजेंट - विक्रेता ऑनबोर्डिंग, CRM, और एस्केलेशन हैंडलिंग',
  },
};
