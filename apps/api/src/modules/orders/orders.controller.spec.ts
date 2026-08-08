import { validate } from "class-validator";
import { PaymentGatewayService } from "../core/payment-gateway/payment-gateway.service";
import { PayOrderDto } from "./dto/order.dto";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

describe("OrdersController payment initiation", () => {
  const ordersService = {} as OrdersService;
  const initiateOrderPayment = jest.fn();
  const gatewayService = { initiateOrderPayment } as unknown as PaymentGatewayService;
  const controller = new OrdersController(ordersService, gatewayService);

  beforeEach(() => {
    initiateOrderPayment.mockReset();
  });

  it("delegates only order identity, user identity, gateway preference, and idempotency", async () => {
    initiateOrderPayment.mockResolvedValue({ paymentId: "pay_123" });

    await controller.payOrder("order_123", "user_123", {
      idempotencyKey: "checkout_01JABCDEF1234567890",
      preferredGateway: "stripe",
    });

    expect(initiateOrderPayment).toHaveBeenCalledWith({
      orderId: "order_123",
      userId: "user_123",
      idempotencyKey: "checkout_01JABCDEF1234567890",
      preferredGateway: "stripe",
    });
    expect(initiateOrderPayment).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing or malformed idempotency key at the DTO boundary", async () => {
    const missing = Object.assign(new PayOrderDto(), {});
    const malformed = Object.assign(new PayOrderDto(), {
      idempotencyKey: "bad key!",
    });

    expect(await validate(missing)).not.toHaveLength(0);
    expect(await validate(malformed)).not.toHaveLength(0);
  });
});
