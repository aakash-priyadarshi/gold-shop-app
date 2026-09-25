import { api } from "@/lib/api";

const root = "/karigar/workshop";
let selectedStaffShopId: string | null = null;
export function selectStaffWorkshop(shopId: string | null) { selectedStaffShopId = shopId; }
api.interceptors.request.use((config) => {
  if (selectedStaffShopId && config.url?.startsWith(root)) {
    config.headers.set("x-workshop-shop-id", selectedStaffShopId);
  }
  return config;
});
export const workshopApi = {
  myAssignments: () => api.get(`${root}/my-assignments`),
  myInvitations: () => api.get(`${root}/my-invitations`),
  acceptInvitation: (id: string) => api.post(`${root}/my-invitations/${id}/accept`),
  inviteStaff: (data: { email: string; canCapture: boolean; canApprove: boolean }) => api.post(`${root}/staff/invite`, data),
  jobs: () => api.get(`${root}/jobs`),
  inspectQc: (jobId: string, data: { decision: "APPROVED" | "REWORK" | "REJECTED"; reason?: string; notes?: string }) => api.post(`${root}/jobs/${jobId}/qc`, data),
  catalog: () => api.get(`${root}/catalog`),
  accounts: () => api.get(`${root}/metal/accounts`),
  reports: () => api.get(`${root}/reports`),
  simulatorDevice: (purpose: "GOLD" | "STONE") => api.post(`${root}/simulator/${purpose === "STONE" ? "stone-device" : "device"}`),
  registerDevice: (data: Record<string, unknown>) => api.post(`${root}/devices`, data),
  createProcess: (data: Record<string, unknown>) => api.post(`${root}/processes`, data),
  createRoute: (data: Record<string, unknown>) => api.post(`${root}/routes`, data),
  assignRoute: (jobId: string, templateId: string) => api.post(`${root}/jobs/${jobId}/route`, { templateId }),
  changeRouteStep: (jobId: string, stepId: string, data: Record<string, unknown>) => api.post(`${root}/jobs/${jobId}/route/${stepId}/change`, data),
  createBatchChild: (data: Record<string, unknown>) => api.post(`${root}/batch-children`, data),
  createWorkstation: (data: Record<string, unknown>) => api.post(`${root}/workstations`, data),
  configureTolerance: (data: Record<string, unknown>) => api.post(`${root}/tolerances`, data),
  recordAssay: (data: Record<string, unknown>) => api.post(`${root}/recovery/assays`, data),
  createRecipe: (data: Record<string, unknown>) => api.post(`${root}/recipes`, data),
  recommendRecipe: (id: string, targetWeightGrams: string) => api.post(`${root}/recipes/${id}/recommend`, { targetWeightGrams }),
  createMaterial: (data: Record<string, unknown>) => api.post(`${root}/materials`, data),
  materialOpening: (data: Record<string, unknown>) => api.post(`${root}/materials/opening`, data),
  startRun: (data: Record<string, unknown>) => api.post(`${root}/process-runs`, data),
  runReport: (id: string) => api.get(`${root}/process-runs/${id}/reconciliation`),
  batchReport: (id: string) => api.get(`${root}/batches/${id}/reconciliation`),
  classifyRun: (id: string, materialKey: string, reason: string) => api.post(`${root}/process-runs/${id}/classify-variance`, { materialKey, reason }),
  closeRun: (id: string) => api.post(`${root}/process-runs/${id}/close`, {}),
  transfers: () => api.get(`${root}/transfers`),
  prepareTransfer: (data: Record<string, unknown>) => api.post(`${root}/transfers`, data),
  approveTransfer: (id: string, reason: string) => api.post(`${root}/transfers/${id}/approve`, { reason }),
  classifyTransfer: (id: string, classificationReason: string, sourceAccountId?: string) => api.post(`${root}/transfers/${id}/classify-difference`, { classificationReason, ...(sourceAccountId ? { sourceAccountId } : {}) }),
  recoveryBags: () => api.get(`${root}/recovery/containers`),
  createRecoveryBag: (data: Record<string, unknown>) => api.post(`${root}/recovery/containers`, data),
  createRecoveryEvent: (containerId: string) => api.post(`${root}/recovery/events`, { containerId }),
  recoveryEvent: (id: string) => api.get(`${root}/recovery/events/${id}`),
  classifyRecovery: (id: string, reason: string) => api.post(`${root}/recovery/events/${id}/classify-and-close`, { reason }),
  createSession: (data: Record<string, unknown>) => api.post(`${root}/movement-sessions`, data),
  capture: (id: string, data: Record<string, unknown>) => api.post(`${root}/weighing-sessions/${id}/capture`, data),
  confirm: (id: string, data: Record<string, unknown>) => api.post(`${root}/movement-sessions/${id}/confirm`, data),
  manualMovement: (data: Record<string, unknown>) => api.post(`${root}/manual-movements`, data),
  correctJournal: (id: string, data: Record<string, unknown>) => api.post(`${root}/journals/${id}/correct`, data),
};
