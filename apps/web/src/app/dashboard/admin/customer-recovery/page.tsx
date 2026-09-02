import { redirect } from "next/navigation";

export default function CustomerRecoveryRedirectPage() {
  redirect("/dashboard/admin/offers");
}
