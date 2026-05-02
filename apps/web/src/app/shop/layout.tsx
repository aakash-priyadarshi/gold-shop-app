import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerFlowGuard>{children}</CustomerFlowGuard>;
}
