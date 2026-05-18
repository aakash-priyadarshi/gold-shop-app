import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Profile - Shop Dashboard | Orivraa",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
