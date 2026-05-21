import { permanentRedirect } from "next/navigation";

// /help is consolidated into /support — permanent 308 redirect
export default function HelpPage() {
  permanentRedirect("/support");
}
