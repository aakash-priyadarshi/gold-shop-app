"use client";

import { CustomerGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ordersApi, refundsApi } from "@/lib/api";
import { ArrowRight, CheckCircle, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalNpr: number;
  displayCurrency: string;
  refundStatus?: string;
  refundableAmount?: number;
  productSnapshot: any;
  createdAt: string;
}

interface EligibilityResult {
  eligible: boolean;
  refundableAmount: number;
  reason: string;
  metalPercentage?: number;
}

const refundStatusColors: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-800",
  REQUESTED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  PROCESSED: "bg-green-100 text-green-800",
};

export default function CustomerRefundsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const t = useT();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await ordersApi.getMyOrders();
      setOrders(res.data?.orders || res.data || []);
    } catch (e) {
      console.error("Failed to load orders", e);
    } finally {
      setLoading(false);
    }
  }

  async function checkEligibility(order: Order) {
    setSelectedOrder(order);
    setCheckingEligibility(true);
    setEligibility(null);
    try {
      const res = await refundsApi.checkEligibility(order.id);
      setEligibility(res.data);
    } catch (e: any) {
      setEligibility({
        eligible: false,
        refundableAmount: 0,
        reason: e.response?.data?.message || "Failed to check eligibility",
      });
    } finally {
      setCheckingEligibility(false);
    }
  }

  async function submitRefund() {
    if (!selectedOrder || !reason.trim()) return;
    setSubmitting(true);
    try {
      await refundsApi.requestRefund({ orderId: selectedOrder.id, reason });
      setSelectedOrder(null);
      setReason("");
      setEligibility(null);
      loadOrders();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  }

  const deliveredOrders = orders.filter(
    (o) => o.status === "DELIVERED" || o.status === "COMPLETED",
  );

  return (
    <CustomerGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-6 w-6" />
            <h1 className="text-2xl font-bold"><T>Refunds</T></h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle><T>Refund Policy</T></CardTitle>
              <CardDescription>
                <T>Refunds are available only for gold and silver jewellery within 7 days of delivery. Diamond, gemstone, and custom-cut products are non-refundable.</T>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Orders with refund status */}
          {orders.filter((o) => o.refundStatus && o.refundStatus !== "NONE")
            .length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><T>Your Refund Requests</T></CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders
                  .filter((o) => o.refundStatus && o.refundStatus !== "NONE")
                  .map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{order.orderNumber}</span>
                        <p className="text-sm text-muted-foreground">
                          {order.productSnapshot?.nameEn}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={refundStatusColors[order.refundStatus!]}
                        >
                          {order.refundStatus}
                        </Badge>
                        {order.refundableAmount && (
                          <p className="text-sm mt-1">
                            Refundable: {order.displayCurrency}{" "}
                            {order.refundableAmount}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Eligible orders */}
          <Card>
            <CardHeader>
              <CardTitle><T>Delivered Orders</T></CardTitle>
              <CardDescription>
                <T>Select an order to check refund eligibility</T>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground"><T>Loading orders...</T></p>
              ) : deliveredOrders.length === 0 ? (
                <p className="text-muted-foreground">
                  <T>No delivered orders found</T>
                </p>
              ) : (
                <div className="space-y-3">
                  {deliveredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{order.orderNumber}</span>
                        <p className="text-sm text-muted-foreground">
                          {order.productSnapshot?.nameEn} —{" "}
                          {order.displayCurrency} {order.totalNpr}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Delivered:{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!order.refundStatus || order.refundStatus === "NONE" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => checkEligibility(order)}
                        >
                          <T>Check Eligibility</T>{" "}
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Badge
                          className={refundStatusColors[order.refundStatus]}
                        >
                          {order.refundStatus}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Eligibility result + form */}
          {selectedOrder && (
            <Card>
              <CardHeader>
                <CardTitle>{t(`Refund for ${selectedOrder.orderNumber}`)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {checkingEligibility ? (
                  <p className="text-muted-foreground">
                    <T>Checking eligibility...</T>
                  </p>
                ) : eligibility ? (
                  <>
                    <div
                      className={`flex items-center gap-2 p-3 rounded-lg ${
                        eligibility.eligible
                          ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200"
                          : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {eligibility.eligible ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                      <div>
                        <p className="font-medium">
                          {eligibility.eligible
                            ? t("Eligible for refund")
                            : t("Not eligible")}
                        </p>
                        <p className="text-sm">{eligibility.reason}</p>
                        {eligibility.eligible && (
                          <p className="text-sm font-medium mt-1">
                            Refundable amount: {selectedOrder.displayCurrency}{" "}
                            {eligibility.refundableAmount}
                            {eligibility.metalPercentage &&
                              eligibility.metalPercentage < 100 && (
                                <span className="font-normal">
                                  {" "}
                                  ({eligibility.metalPercentage}% metal content)
                                </span>
                              )}
                          </p>
                        )}
                      </div>
                    </div>

                    {eligibility.eligible && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">
                            <T>Reason for refund</T>
                          </label>
                          <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Please describe why you want a refund..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={submitRefund}
                            disabled={submitting || !reason.trim()}
                          >
                            {submitting ? t("Submitting...") : t("Request Refund")}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(null);
                              setEligibility(null);
                              setReason("");
                            }}
                          >
                            <T>Cancel</T>
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </CustomerGuard>
  );
}
