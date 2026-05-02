import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerFlowGuard>{children}</CustomerFlowGuard>;
}
