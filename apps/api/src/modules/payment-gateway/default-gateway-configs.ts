export type DefaultGatewayConfig = {
  gatewayName: string;
  displayName: string;
  isEnabled: boolean;
  isDefault: boolean;
  supportedCountries: string[];
  supportedMethods: string[];
  priority: number;
  envKeyLabel: string;
  envKeysRequired?: string[];
  commissionInfo?: string;
  webhookEndpoint?: string | null;
};

type PaymentGatewayConfigStore = {
  paymentGatewayConfig: {
    count: (...args: any[]) => Promise<number>;
    findFirst: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
};

export const DEFAULT_GATEWAY_CONFIGS: DefaultGatewayConfig[] = [
  {
    gatewayName: "stripe",
    displayName: "Stripe",
    isEnabled: true,
    isDefault: true,
    supportedCountries: ["UK", "EU"],
    supportedMethods: ["CARD", "BANK_TRANSFER", "PAYPAL"],
    priority: 8,
    envKeyLabel: "STRIPE_SECRET_KEY",
    envKeysRequired: [
      "STRIPE_SECRET_KEY",
      "STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_SUBSCRIPTION_WEBHOOK_SECRET",
      "STRIPE_TEST_SECRET_KEY",
      "STRIPE_TEST_PUBLISHABLE_KEY",
    ],
    commissionInfo: "2.9% + 30¢ (domestic) | 3.9% + 30¢ (international)",
    webhookEndpoint: "/api/payment-gateway/webhooks/stripe",
  },
  {
    gatewayName: "phonepe",
    displayName: "PhonePe",
    isEnabled: true,
    isDefault: false,
    supportedCountries: ["IN"],
    supportedMethods: ["UPI", "CARD", "PHONEPE"],
    priority: 10,
    envKeyLabel: "PHONEPE_MERCHANT_ID",
    envKeysRequired: [
      "PHONEPE_MERCHANT_ID",
      "PHONEPE_SALT_KEY",
      "PHONEPE_SALT_INDEX",
      "PHONEPE_ENV",
    ],
    commissionInfo: "~1.5% per UPI txn | ~1.75% for cards",
    webhookEndpoint: "/payment-gateway/webhooks/phonepe",
  },
  {
    gatewayName: "esewa",
    displayName: "eSewa",
    isEnabled: true,
    isDefault: false,
    supportedCountries: ["NP"],
    supportedMethods: ["ESEWA"],
    priority: 10,
    envKeyLabel: "ESEWA_MERCHANT_ID",
    envKeysRequired: ["ESEWA_MERCHANT_ID", "ESEWA_SECRET"],
    commissionInfo: "~1.5-2% per txn",
    webhookEndpoint: null,
  },
  {
    gatewayName: "khalti",
    displayName: "Khalti",
    isEnabled: true,
    isDefault: false,
    supportedCountries: ["NP"],
    supportedMethods: ["KHALTI"],
    priority: 5,
    envKeyLabel: "KHALTI_SECRET_KEY",
    envKeysRequired: ["KHALTI_SECRET_KEY"],
    commissionInfo: "~1.5-2% per txn",
    webhookEndpoint: null,
  },
  {
    gatewayName: "razorpay",
    displayName: "Razorpay",
    isEnabled: false,
    isDefault: false,
    supportedCountries: ["IN"],
    supportedMethods: ["CARD", "UPI", "BANK_TRANSFER"],
    priority: 5,
    envKeyLabel: "RAZORPAY_KEY_ID",
    envKeysRequired: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
    commissionInfo: "~2% per txn",
    webhookEndpoint: null,
  },
];

export async function upsertDefaultGatewayConfigs(
  store: PaymentGatewayConfigStore,
  updatedBy = "system-seed",
): Promise<number> {
  for (const gateway of DEFAULT_GATEWAY_CONFIGS) {
    const existing = await store.paymentGatewayConfig.findFirst({
      where: { gatewayName: gateway.gatewayName },
    });

    const data = {
      gatewayName: gateway.gatewayName,
      displayName: gateway.displayName,
      isEnabled: gateway.isEnabled,
      isDefault: gateway.isDefault,
      supportedCountries: gateway.supportedCountries as any,
      supportedMethods: gateway.supportedMethods as any,
      priority: gateway.priority,
      envKeyLabel: gateway.envKeyLabel,
      envKeysRequired: gateway.envKeysRequired,
      commissionInfo: gateway.commissionInfo,
      webhookEndpoint: gateway.webhookEndpoint,
      updatedBy,
    };

    if (existing) {
      await store.paymentGatewayConfig.update({
        where: { id: existing.id },
        data,
      });
      continue;
    }

    await store.paymentGatewayConfig.create({ data });
  }

  return store.paymentGatewayConfig.count();
}