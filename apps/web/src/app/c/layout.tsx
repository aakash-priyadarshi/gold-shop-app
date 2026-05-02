import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerFlowGuard>{children}</CustomerFlowGuard>;
}
