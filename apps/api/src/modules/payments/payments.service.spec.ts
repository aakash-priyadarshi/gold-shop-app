import { CurrencyCode, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { AccountingService } from "../accounting/accounting.service";
import { PaymentMethod, PaymentType } from "./dto/payment.dto";
import { PaymentsService } from "./payments.service";

describe("PaymentsService accounting integration", () => {
  const prisma: any = {
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    rfqRequest: { update: jest.fn() },
    invoice: { findFirst: jest.fn() },
    commissionLedger: { findUnique: jest.fn(), update: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const notifications = { create: jest.fn() };
  const fxRates = { convertCurrency: jest.fn() };
  const accounting = {
    prepareMonetaryContext: jest.fn(),
    postOrderPayment: jest.fn(),
    postOrderRefund: jest.fn(),
    reverseReference: jest.fn(),
    postCommissionRefundAdjustment: jest.fn(),
  };
  let service: PaymentsService;

  const order = {
    id: "order-1",
    orderNumber: "ORD-1",
    customerId: "customer-1",
    shopId: "shop-1",
    shop: { userId: "shopkeeper-1" },
    customer: { email: "buyer@example.com" },
    totalNpr: 1000,
    balanceDueNpr: 1000,
    bookingFeePaidNpr: 0,
    marketCountry: "NP",
    displayCurrency: CurrencyCode.NPR,
    status: OrderStatus.CREATED,
  };
  const nprContext = {
    transactionCurrency: CurrencyCode.NPR,
    transactionAmount: new Prisma.Decimal(1000),
    canonicalAmountNpr: new Prisma.Decimal(1000),
    fxRate: new Prisma.Decimal(1),
    fxSource: "identity",
    fxQuotedAt: new Date("2026-08-08T00:00:00Z"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(
      prisma,
      notifications as any,
      fxRates as any,
      accounting as unknown as AccountingService,
    );
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));
    prisma.$executeRaw.mockResolvedValue(1);
    fxRates.convertCurrency.mockResolvedValue({
      amount: 1000,
      rate: 1,
      source: "identity",
      quotedAt: "2026-08-08T00:00:00Z",
    });
    accounting.prepareMonetaryContext.mockImplementation(
      async (amount: number) => ({
        ...nprContext,
        transactionAmount: new Prisma.Decimal(amount),
        canonicalAmountNpr: new Prisma.Decimal(amount),
      }),
    );
    accounting.postOrderPayment.mockResolvedValue({});
    accounting.postOrderRefund.mockResolvedValue({});
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.commissionLedger.findUnique.mockResolvedValue(null);
  });

  it("does not prepare or post a journal when payment is only initiated", async () => {
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.payment.create.mockResolvedValue({
      id: "payment-pending",
      orderId: order.id,
    });

    const result = await service.initiatePayment("customer-1", {
      orderId: order.id,
      paymentType: PaymentType.FULL_PAYMENT,
      method: PaymentMethod.BANK_TRANSFER,
      idempotencyKey: "d4eecc63-4d79-4437-9df3-14fb14dd5080",
    });

    expect(result.paymentId).toBe("payment-pending");
    expect(accounting.prepareMonetaryContext).not.toHaveBeenCalled();
    expect(accounting.postOrderPayment).not.toHaveBeenCalled();
  });

  it("posts a customer advance atomically only after verified settlement", async () => {
    const payment = {
      id: "payment-1",
      orderId: order.id,
      amountNpr: 1000,
      currency: CurrencyCode.NPR,
      chargedAmount: 1000,
      chargedCurrency: CurrencyCode.NPR,
      fxRate: 1,
      fxSource: "identity",
      fxQuotedAt: new Date(),
      paymentGateway: "BANK_TRANSFER",
      status: PaymentStatus.PENDING,
      metadata: null,
    };
    prisma.payment.findUnique
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(null);
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.findUniqueOrThrow.mockResolvedValue(order);
    prisma.order.update.mockResolvedValue({});

    await service.verifyPayment({
      paymentId: payment.id,
      gatewayPaymentId: "bank-reference-1",
      gatewayOrderId: "bank-order-1",
    });

    expect(accounting.postOrderPayment).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        orderId: order.id,
        paymentReferenceId: payment.id,
        canonicalAmountNpr: new Prisma.Decimal(1000),
      }),
    );
  });

  it("uses the immutable refund payment id as the refund journal source and replays idempotently", async () => {
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      ...order,
      bookingFeePaidNpr: 1000,
    });
    prisma.payment.findUnique.mockResolvedValueOnce(null);
    prisma.payment.create.mockResolvedValue({
      id: "refund-payment-1",
      orderId: order.id,
      amountNpr: -250,
      completedAt: new Date(),
    });
    prisma.order.update.mockResolvedValue({});

    const first = await service.processRefund(
      {
        orderId: order.id,
        amount: 250,
        reason: "Partial return",
        idempotencyKey: "0d8fb2f5-c2da-4caa-856d-d3655be95625",
      },
      "shopkeeper-1",
      "SHOPKEEPER",
    );

    expect(first.idempotentReplay).toBe(false);
    expect(accounting.postOrderRefund).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        orderId: order.id,
        refundReferenceId: "refund-payment-1",
        canonicalAmountNpr: new Prisma.Decimal(250),
      }),
    );

    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));
    prisma.order.findUnique.mockResolvedValue(order);
    accounting.prepareMonetaryContext.mockImplementation(
      async (amount: number) => ({
        ...nprContext,
        transactionAmount: new Prisma.Decimal(amount),
        canonicalAmountNpr: new Prisma.Decimal(amount),
      }),
    );
    prisma.payment.findUnique.mockResolvedValue({
      id: "refund-payment-1",
      orderId: order.id,
      amountNpr: -250,
    });

    const replay = await service.processRefund(
      {
        orderId: order.id,
        amount: 250,
        reason: "Partial return",
        idempotencyKey: "0d8fb2f5-c2da-4caa-856d-d3655be95625",
      },
      "shopkeeper-1",
      "SHOPKEEPER",
    );
    expect(replay.idempotentReplay).toBe(true);
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(accounting.postOrderRefund).not.toHaveBeenCalled();
  });
});
