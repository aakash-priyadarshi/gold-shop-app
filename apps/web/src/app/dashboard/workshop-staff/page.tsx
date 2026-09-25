"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { FactoryWorkbench } from "@/components/shop/workshop/FactoryWorkbench";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { workshopApi, selectStaffWorkshop } from "@/lib/workshop-api";

type Assignment = { shopId: string; shopName: string; staffRole: string; workshopMode: boolean; workshopLedgerVersion: string; permissions: Record<string, boolean> };

export default function WorkshopStaffPage() {
  const t = useT();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invitations, setInvitations] = useState<Array<{ id: string; shopName: string }>>([]);
  const [shopId, setShopId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    workshopApi.myAssignments().then((response) => setAssignments(response.data ?? []))
      .catch((err) => setError(String(err?.response?.data?.message ?? "Could not load workshop assignments")));
    workshopApi.myInvitations().then((response) => setInvitations(response.data ?? []))
      .catch((err) => setError(String(err?.response?.data?.message ?? "Could not load workshop invitations")));
    return () => selectStaffWorkshop(null);
  }, []);

  const accept = async (id: string) => {
    setError("");
    try {
      await workshopApi.acceptInvitation(id);
      const [assigned, pending] = await Promise.all([workshopApi.myAssignments(), workshopApi.myInvitations()]);
      setAssignments(assigned.data ?? []);
      setInvitations(pending.data ?? []);
    } catch (err: any) { setError(String(err?.response?.data?.message ?? "Could not accept Workshop invitation")); }
  };

  return <RouteGuard allowedRoles={["CUSTOMER", "SHOPKEEPER"]}>
    <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <div><h1 className="text-2xl font-bold"><T>Workshop staff station</T></h1><p className="text-sm text-muted-foreground"><T>Your workshop permissions are checked again by the server for every operation.</T></p></div>
      {invitations.map((invitation) => <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-md border p-3"><span><T>Workshop invitation from</T> {invitation.shopName}</span><Button onClick={() => accept(invitation.id)}><T>Accept invitation</T></Button></div>)}
      <label className="block max-w-md space-y-1 text-sm"><T>Assigned workshop</T>
        <select className="w-full rounded-md border border-input bg-background px-3 py-2" value={shopId} onChange={(event) => { setShopId(event.target.value); selectStaffWorkshop(event.target.value || null); }}>
          <option value="">{t("Select an assigned shop")}</option>
          {assignments.map((assignment) => <option key={assignment.shopId} value={assignment.shopId}>{assignment.shopName} · {assignment.staffRole}</option>)}
        </select>
      </label>
      {assignments.length === 0 && invitations.length === 0 && !error && <p className="text-sm"><T>No active Workshop assignment or invitation was found for this account.</T></p>}
      {shopId && assignments.find((assignment) => assignment.shopId === shopId)?.workshopMode === true && <FactoryWorkbench key={shopId} staffMode canApprove={assignments.find((assignment) => assignment.shopId === shopId)?.permissions?.workshopApprove === true} />}
      {shopId && assignments.find((assignment) => assignment.shopId === shopId)?.workshopMode !== true && <p className="text-sm text-amber-700"><T>The shop owner must enable Workshop Mode first.</T></p>}
      {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}
    </main>
  </RouteGuard>;
}
