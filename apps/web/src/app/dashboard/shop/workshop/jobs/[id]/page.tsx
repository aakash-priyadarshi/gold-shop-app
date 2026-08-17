"use client";

import { WorkshopJobCardView } from "@/components/shop/workshop/WorkshopJobCardView";
import { useParams } from "next/navigation";

export default function LegacyWorkshopJobPage() {
  const params = useParams<{ id: string }>();
  return <WorkshopJobCardView jobId={params.id} />;
}
