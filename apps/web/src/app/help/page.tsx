import { redirect } from "next/navigation";

// /help is consolidated into /support — redirect permanently
export default function HelpPage() {
  redirect("/support");
}
