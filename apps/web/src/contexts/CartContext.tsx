'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;
  productId: string;
  shopId: string;
  quantity: number;
  product: {
    name: string;
    sku: string;
    price: number;
    image?: string;
    weight?: number;
  };
  addedAt: Date;
}

export interface DeliveryAddress {
  id: string;
  label: string; // e.g., "Home", "Office"
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  isDefault: boolean;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getItemsByShop: () => Record<string, CartItem[]>;
  // Addresses
  addresses: DeliveryAddress[];
  selectedAddressId: string | null;
  addAddress: (address: Omit<DeliveryAddress, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<DeliveryAddress>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setSelectedAddress: (id: string) => void;
  // Delivery estimation
  estimateDelivery: (
    shopPincode: string,
    deliveryPincode: string,
    shopCountry?: string,
    deliveryCountry?: string,
  ) => DeliveryEstimate;
}

export interface DeliveryEstimate {
  estimatedDays: { min: number; max: number };
  deliveryType: 'same-city' | 'same-country' | 'international';
  estimatedDate: { min: Date; max: Date };
  notes: string[];
  customsInfo?: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'orivraa_cart';
const ADDRESSES_STORAGE_KEY = 'orivraa_addresses';

// Postal codes are only a city hint. Nepal, Sri Lanka, and the US all use
// five-digit codes, so the explicitly selected country must win.
export const getPincodeRegion = (
  pincode: string,
  countryHint?: string,
): { city?: string; country: string } => {
  const normalizedCountry = countryHint?.trim().toUpperCase();
  const prefix = pincode.trim().substring(0, 2);

  if (normalizedCountry) {
    const cityPrefixes: Record<string, Record<string, string>> = {
      NP: {
        '44': 'Kathmandu',
        '45': 'Lalitpur',
        '46': 'Bhaktapur',
        '33': 'Pokhara',
        '56': 'Biratnagar',
        '21': 'Birgunj',
      },
      LK: {
        '00': 'Colombo',
        '01': 'Colombo',
        '20': 'Kandy',
        '40': 'Jaffna',
        '80': 'Galle',
      },
      IN: {
        '11': 'Delhi',
        '40': 'Mumbai',
        '50': 'Hyderabad',
        '56': 'Bengaluru',
        '60': 'Chennai',
        '70': 'Kolkata',
        '38': 'Ahmedabad',
      },
    };
    return {
      city: cityPrefixes[normalizedCountry]?.[prefix],
      country: normalizedCountry,
    };
  }

  // Six numeric digits are unambiguous for India in the supported markets.
  if (/^\d{6}$/.test(pincode)) {
    return getPincodeRegion(pincode, 'IN');
  }
  // ZIP+4 is unambiguous; a plain five-digit code is deliberately not guessed.
  if (/^\d{5}-\d{4}$/.test(pincode)) return { country: 'US' };
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(pincode)) {
    return { country: 'UK' };
  }
  return { country: 'UNKNOWN' };
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setItems(parsed.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
        })));
      }
      
      const savedAddresses = localStorage.getItem(ADDRESSES_STORAGE_KEY);
      if (savedAddresses) {
        const parsedAddresses = JSON.parse(savedAddresses);
        setAddresses(parsedAddresses);
        const defaultAddress = parsedAddresses.find((a: DeliveryAddress) => a.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoading]);

  // Save addresses to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
    }
  }, [addresses, isLoading]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const addToCart = useCallback(async (item: Omit<CartItem, 'id' | 'addedAt'>) => {
    setItems((prev) => {
      // Check if item already exists
      const existingIndex = prev.findIndex(
        (i) => i.productId === item.productId && i.shopId === item.shopId
      );

      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
        };
        return updated;
      }

      // Add new item
      return [
        ...prev,
        {
          ...item,
          id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          addedAt: new Date(),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItemsByShop = useCallback(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.shopId]) {
        acc[item.shopId] = [];
      }
      acc[item.shopId].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);
  }, [items]);

  // Address management
  const addAddress = useCallback(async (address: Omit<DeliveryAddress, 'id'>) => {
    const newAddress: DeliveryAddress = {
      ...address,
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setAddresses((prev) => {
      // If this is the first address or marked as default, update other defaults
      if (address.isDefault || prev.length === 0) {
        return [...prev.map((a) => ({ ...a, isDefault: false })), { ...newAddress, isDefault: true }];
      }
      return [...prev, newAddress];
    });

    if (address.isDefault || addresses.length === 0) {
      setSelectedAddressId(newAddress.id);
    }
  }, [addresses.length]);

  const updateAddress = useCallback(async (id: string, updates: Partial<DeliveryAddress>) => {
    setAddresses((prev) =>
      prev.map((addr) => {
        if (addr.id === id) {
          return { ...addr, ...updates };
        }
        // If setting this as default, remove default from others
        if (updates.isDefault && addr.isDefault) {
          return { ...addr, isDefault: false };
        }
        return addr;
      })
    );
  }, []);

  const removeAddress = useCallback(async (id: string) => {
    setAddresses((prev) => {
      const filtered = prev.filter((addr) => addr.id !== id);
      // If we removed the default, make the first one default
      if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });

    if (selectedAddressId === id) {
      const remaining = addresses.filter((a) => a.id !== id);
      setSelectedAddressId(remaining[0]?.id || null);
    }
  }, [addresses, selectedAddressId]);

  const setSelectedAddress = useCallback((id: string) => {
    setSelectedAddressId(id);
  }, []);

  // Delivery estimation
  const estimateDelivery = useCallback((
    shopPincode: string,
    deliveryPincode: string,
    shopCountry?: string,
    deliveryCountry?: string,
  ): DeliveryEstimate => {
    const shopRegion = getPincodeRegion(shopPincode, shopCountry);
    const deliveryRegion = getPincodeRegion(deliveryPincode, deliveryCountry);

    const today = new Date();
    let minDays: number;
    let maxDays: number;
    let deliveryType: 'same-city' | 'same-country' | 'international';
    let notes: string[] = [];
    let customsInfo: string | undefined;

    // Same city
    if (
      shopRegion.city &&
      deliveryRegion.city &&
      shopRegion.city === deliveryRegion.city &&
      shopRegion.country === deliveryRegion.country
    ) {
      minDays = 1;
      maxDays = 2;
      deliveryType = 'same-city';
      notes.push('Express local delivery available');
    }
    // Same country
    else if (shopRegion.country === deliveryRegion.country) {
      minDays = 3;
      maxDays = 5;
      deliveryType = 'same-country';
      notes.push('Standard domestic shipping');
    }
    // International
    else {
      minDays = 15;
      maxDays = 30;
      deliveryType = 'international';
      notes.push('International shipping - tracking provided');
      notes.push('Delivery time may vary based on customs clearance');

      // Customs information
      if (deliveryRegion.country === 'US') {
        customsInfo = 'US Customs: Items over $800 may be subject to import duties. Jewellery is typically charged 6.5% duty. You may need to provide ID for high-value items.';
      } else if (deliveryRegion.country === 'UK') {
        customsInfo = 'UK Customs: VAT (20%) applies to all imports. Items over £135 may require customs declaration. Precious metals may have additional duties.';
      } else if (deliveryRegion.country === 'IN') {
        customsInfo = 'India Customs: Import duty on gold jewellery is 12.5% + 2.5% Social Welfare Surcharge. GST of 3% also applies. Keep purchase invoice for customs.';
      } else if (deliveryRegion.country === 'NP') {
        customsInfo = 'Nepal Customs: Gold jewellery import may require declaration. Duty rates vary. Contact local customs for current rates.';
      } else if (deliveryRegion.country === 'LK') {
        customsInfo = 'Sri Lanka Customs: Jewellery imports may require declaration and can be subject to duties and taxes set by the authorities. Check current requirements before shipment.';
      } else {
        customsInfo = 'International shipments may be subject to import duties, taxes, and customs fees. Please check with your local customs office.';
      }
    }

    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDays);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);

    return {
      estimatedDays: { min: minDays, max: maxDays },
      deliveryType,
      estimatedDate: { min: minDate, max: maxDate },
      notes,
      customsInfo,
    };
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getItemsByShop,
        addresses,
        selectedAddressId,
        addAddress,
        updateAddress,
        removeAddress,
        setSelectedAddress,
        estimateDelivery,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
