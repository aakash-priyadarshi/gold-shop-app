import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kyc - Shop Dashboard | Orivraa",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
