import { redirect } from "next/navigation";

export default function MobileRfqRedirectPage() {
  redirect("/rfq/create");
}