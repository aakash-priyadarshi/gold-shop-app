import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerFlowGuard>{children}</CustomerFlowGuard>;
}
