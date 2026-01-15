'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  OrderedIcon,
  CheckBadgeIcon,
  HammerIcon,
  PackedIcon,
  ShippedIcon,
  OutForDeliveryIcon,
  DeliveredIcon,
} from './status-icons';

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER STEPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
// Displays order progress as a visual stepper with animated icons.
// Two flows: PREBUILT (inventory) and CUSTOM orders.

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type IconState = 'active' | 'completed' | 'future';

export interface StatusIconProps {
  state: IconState;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// Prebuilt (Inventory) order statuses
export const PREBUILT_ORDER_STEPS = [
  { key: 'ORDERED', label: 'Ordered', icon: OrderedIcon },
  { key: 'PACKED', label: 'Packed', icon: PackedIcon },
  { key: 'SHIPPED', label: 'Shipped', icon: ShippedIcon },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: OutForDeliveryIcon },
  { key: 'DELIVERED', label: 'Delivered', icon: DeliveredIcon },
] as const;

// Custom order statuses (includes forging step)
export const CUSTOM_ORDER_STEPS = [
  { key: 'ORDER_ACCEPTED', label: 'Order Accepted', icon: CheckBadgeIcon },
  { key: 'FORGING', label: 'Forging', icon: HammerIcon },
  { key: 'PACKED', label: 'Packed', icon: PackedIcon },
  { key: 'SHIPPED', label: 'Shipped', icon: ShippedIcon },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: OutForDeliveryIcon },
  { key: 'DELIVERED', label: 'Delivered', icon: DeliveredIcon },
] as const;

export type PrebuiltOrderStatus = (typeof PREBUILT_ORDER_STEPS)[number]['key'];
export type CustomOrderStatus = (typeof CUSTOM_ORDER_STEPS)[number]['key'];
export type OrderType = 'INVENTORY' | 'CUSTOM';

// Map backend DetailedOrderStatus to our step keys
const STATUS_MAP: Record<string, string> = {
  // Prebuilt (Inventory) flow mapping
  PLACED: 'ORDERED',
  CONFIRMED: 'ORDERED',      // After payment/confirmation, still in "Ordered" step visually
  PAID: 'ORDERED',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  
  // Custom flow mapping
  IN_PROGRESS: 'FORGING',    // Maps to "Forging / Being made"
  IN_PRODUCTION: 'FORGING',
  QC_PENDING: 'FORGING',
  QC_PASSED: 'FORGING',
  READY: 'PACKED',           // Ready means it's packed for custom orders
  READY_TO_SHIP: 'PACKED',
  
  // Initial states
  CREATED: 'ORDERED',
  PAYMENT_PENDING: 'ORDERED',
  
  // Custom flow - first step after placed
  ORDER_ACCEPTED: 'ORDER_ACCEPTED',
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP ITEM COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface StepItemProps {
  icon: React.FC<StatusIconProps>;
  label: string;
  state: 'completed' | 'active' | 'future';
  isLast: boolean;
  timestamp?: string;
  isHorizontal?: boolean;
}

function StepItem({ icon: Icon, label, state, isLast, timestamp, isHorizontal = false }: StepItemProps) {
  const colors = {
    completed: 'text-emerald-600 dark:text-emerald-400',
    active: 'text-amber-500 dark:text-amber-400',
    future: 'text-gray-400 dark:text-gray-600',
  };

  const lineColors = {
    completed: 'bg-emerald-500',
    active: 'bg-amber-400',
    future: 'bg-gray-300 dark:bg-gray-700',
  };

  if (isHorizontal) {
    return (
      <div className="flex flex-col items-center flex-1">
        {/* Icon */}
        <div
          className={cn(
            'relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300',
            state === 'completed' && 'bg-emerald-100 dark:bg-emerald-900/30',
            state === 'active' && 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-400',
            state === 'future' && 'bg-gray-100 dark:bg-gray-800'
          )}
        >
          <Icon className={cn('w-6 h-6', colors[state])} state={state} />
        </div>

        {/* Label & Timestamp */}
        <div className="mt-2 text-center">
          <p
            className={cn(
              'text-xs font-medium',
              state === 'completed' && 'text-emerald-700 dark:text-emerald-400',
              state === 'active' && 'text-amber-600 dark:text-amber-400',
              state === 'future' && 'text-gray-500 dark:text-gray-500'
            )}
          >
            {label}
          </p>
          {timestamp && (
            <p className="text-[10px] text-gray-400 mt-0.5">{timestamp}</p>
          )}
        </div>

        {/* Connector line (horizontal) */}
        {!isLast && (
          <div
            className={cn(
              'absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 -z-10',
              lineColors[state === 'completed' ? 'completed' : 'future']
            )}
          />
        )}
      </div>
    );
  }

  // Vertical layout
  return (
    <div className="flex items-start gap-4">
      {/* Icon & Line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
            state === 'completed' && 'bg-emerald-100 dark:bg-emerald-900/30',
            state === 'active' && 'bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-gray-900',
            state === 'future' && 'bg-gray-100 dark:bg-gray-800'
          )}
        >
          <Icon className={cn('w-5 h-5', colors[state])} state={state} />
        </div>

        {/* Vertical connector line */}
        {!isLast && (
          <div
            className={cn(
              'w-0.5 h-8 mt-1',
              lineColors[state === 'completed' ? 'completed' : 'future']
            )}
          />
        )}
      </div>

      {/* Label & Timestamp */}
      <div className="pt-2">
        <p
          className={cn(
            'text-sm font-medium',
            state === 'completed' && 'text-emerald-700 dark:text-emerald-400',
            state === 'active' && 'text-amber-600 dark:text-amber-400',
            state === 'future' && 'text-gray-500 dark:text-gray-500'
          )}
        >
          {label}
        </p>
        {timestamp && (
          <p className="text-xs text-gray-400 mt-0.5">{timestamp}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STEPPER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderStepperProps {
  orderType: OrderType;
  currentStatus: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
  }>;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function OrderStepper({
  orderType,
  currentStatus,
  statusHistory = [],
  className,
  orientation = 'horizontal',
}: OrderStepperProps) {
  // Select the appropriate steps based on order type
  const steps = orderType === 'CUSTOM' ? CUSTOM_ORDER_STEPS : PREBUILT_ORDER_STEPS;

  // Map the backend status to our step key
  const normalizedCurrentStatus = STATUS_MAP[currentStatus] || currentStatus;

  // Find the current step index
  const currentStepIndex = steps.findIndex(
    (step) => step.key === normalizedCurrentStatus
  );

  // Create a map of status -> timestamp from history
  const timestampMap = new Map<string, string>();
  statusHistory.forEach(({ status, timestamp }) => {
    const normalizedStatus = STATUS_MAP[status] || status;
    if (!timestampMap.has(normalizedStatus)) {
      timestampMap.set(normalizedStatus, new Date(timestamp).toLocaleDateString());
    }
  });

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'w-full',
        isHorizontal ? 'flex items-start justify-between relative' : 'flex flex-col gap-0',
        className
      )}
    >
      {steps.map((step, index) => {
        let state: 'completed' | 'active' | 'future';

        if (index < currentStepIndex) {
          state = 'completed';
        } else if (index === currentStepIndex) {
          state = 'active';
        } else {
          state = 'future';
        }

        return (
          <StepItem
            key={step.key}
            icon={step.icon}
            label={step.label}
            state={state}
            isLast={index === steps.length - 1}
            timestamp={timestampMap.get(step.key)}
            isHorizontal={isHorizontal}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT ORDER STATUS (Single icon with label)
// ─────────────────────────────────────────────────────────────────────────────

interface OrderStatusBadgeProps {
  orderType: OrderType;
  currentStatus: string;
  className?: string;
  showLabel?: boolean;
}

export function OrderStatusBadge({
  orderType,
  currentStatus,
  className,
  showLabel = true,
}: OrderStatusBadgeProps) {
  const steps = orderType === 'CUSTOM' ? CUSTOM_ORDER_STEPS : PREBUILT_ORDER_STEPS;
  const normalizedStatus = STATUS_MAP[currentStatus] || currentStatus;
  const step = steps.find((s) => s.key === normalizedStatus) || steps[0];
  const Icon = step.icon;

  // Determine if this is a terminal state
  const isDelivered = normalizedStatus === 'DELIVERED';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
        isDelivered
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        className
      )}
    >
      <Icon className="w-4 h-4" state={isDelivered ? 'completed' : 'active'} />
      {showLabel && <span>{step.label}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI STEPPER (For list views)
// ─────────────────────────────────────────────────────────────────────────────

interface MiniOrderStepperProps {
  orderType: OrderType;
  currentStatus: string;
  className?: string;
}

export function MiniOrderStepper({
  orderType,
  currentStatus,
  className,
}: MiniOrderStepperProps) {
  const steps = orderType === 'CUSTOM' ? CUSTOM_ORDER_STEPS : PREBUILT_ORDER_STEPS;
  const normalizedStatus = STATUS_MAP[currentStatus] || currentStatus;
  const currentStepIndex = steps.findIndex((s) => s.key === normalizedStatus);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((step, index) => {
        let state: 'completed' | 'active' | 'future';
        if (index < currentStepIndex) state = 'completed';
        else if (index === currentStepIndex) state = 'active';
        else state = 'future';

        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                state === 'completed' && 'bg-emerald-500 text-white',
                state === 'active' && 'bg-amber-400 text-white ring-2 ring-amber-200',
                state === 'future' && 'bg-gray-200 text-gray-400 dark:bg-gray-700'
              )}
            >
              <Icon className="w-3 h-3" state={state} />
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-4 h-0.5',
                  state === 'completed' ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
