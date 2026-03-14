import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ─── Employee ───
export const employeeApi = {
  // Departments
  listDepartments: () => api.get("/employees/departments"),
  getDepartment: (id: string) => api.get(`/employees/departments/${id}`),
  createDepartment: (data: { name: string; description?: string; headId?: string }) =>
    api.post("/employees/departments", data),
  updateDepartment: (id: string, data: Record<string, unknown>) =>
    api.put(`/employees/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/employees/departments/${id}`),

  // Employees
  list: (params?: Record<string, string>) => api.get("/employees", { params }),
  getById: (id: string) => api.get(`/employees/${id}`),
  create: (data: Record<string, unknown>) => api.post("/employees", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/employees/${id}`, data),
  terminate: (id: string, reason?: string) =>
    api.patch(`/employees/${id}/terminate`, { reason }),

  // Attendance
  clockIn: (employeeId: string) =>
    api.post("/employees/attendance/clock-in", { employeeId }),
  clockOut: (employeeId: string) =>
    api.post("/employees/attendance/clock-out", { employeeId }),
  getAttendanceSummary: (date?: string) =>
    api.get("/employees/attendance/summary", { params: { date } }),
  getAttendance: (id: string, month: number, year: number) =>
    api.get(`/employees/${id}/attendance`, { params: { month, year } }),

  // Leave
  createLeave: (data: Record<string, unknown>) =>
    api.post("/employees/leave", data),
  listLeaves: (params?: Record<string, string>) =>
    api.get("/employees/leave/requests", { params }),
  approveLeave: (id: string) => api.patch(`/employees/leave/${id}/approve`),
  rejectLeave: (id: string) => api.patch(`/employees/leave/${id}/reject`),

  // Payroll
  createPayroll: (data: Record<string, unknown>) =>
    api.post("/employees/payroll", data),
  getPayroll: (month: number, year: number) =>
    api.get("/employees/payroll", { params: { month, year } }),
  markPayrollPaid: (id: string) => api.patch(`/employees/payroll/${id}/paid`),

  // Documents
  addDocument: (
    employeeId: string,
    data: { name: string; type: string; fileUrl: string },
  ) => api.post(`/employees/${employeeId}/documents`, data),
  getDocuments: (employeeId: string) =>
    api.get(`/employees/${employeeId}/documents`),
  deleteDocument: (id: string) => api.delete(`/employees/documents/${id}`),

  // KPI
  upsertKPI: (data: Record<string, unknown>) =>
    api.post("/employees/kpi", data),
  getKPIs: (id: string, period?: string) =>
    api.get(`/employees/${id}/kpi`, { params: { period } }),

  // Role Permissions
  listRolePermissions: (role?: string) =>
    api.get("/employees/role-permissions/list", { params: { role } }),
  getPermissionsForRole: (role: string) =>
    api.get(`/employees/role-permissions/${role}`),
  upsertRolePermission: (data: Record<string, unknown>) =>
    api.post("/employees/role-permissions", data),
  bulkUpsertRolePermissions: (permissions: Record<string, unknown>[]) =>
    api.post("/employees/role-permissions/bulk", { permissions }),
  deleteRolePermission: (id: string) =>
    api.delete(`/employees/role-permissions/${id}`),

  // Activity Logs
  getActivityLogs: (params?: Record<string, string>) =>
    api.get("/employees/activity-logs", { params }),
};

// ─── Tasks ───
export const taskApi = {
  list: (params?: Record<string, string>) => api.get("/tasks", { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: Record<string, unknown>) => api.post("/tasks", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getKanban: () => api.get("/tasks/kanban"),
  getMyTasks: (employeeId: string) => api.get(`/tasks/my/${employeeId}`),
};

// ─── AI Sales ───
export const aiSalesApi = {
  listAgents: () => api.get("/ai-sales/agents"),
  getAgent: (id: string) => api.get(`/ai-sales/agents/${id}`),
  createAgent: (data: Record<string, unknown>) =>
    api.post("/ai-sales/agents", data),
  updateAgent: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/agents/${id}`, data),
  toggleAgent: (id: string, isActive: boolean) =>
    api.patch(`/ai-sales/agents/${id}/toggle`, { isActive }),
  createScript: (data: Record<string, unknown>) =>
    api.post("/ai-sales/scripts", data),
  listScripts: (agentId?: string) =>
    agentId ? api.get(`/ai-sales/agents/${agentId}/scripts`) : api.get("/ai-sales/scripts"),
  updateScript: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/scripts/${id}`, data),
  deleteScript: (id: string) => api.delete(`/ai-sales/scripts/${id}`),
  listLeads: (params?: Record<string, string>) =>
    api.get("/ai-sales/leads", { params }),
  createLead: (data: Record<string, unknown>) =>
    api.post("/ai-sales/leads", data),
  updateLead: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/leads/${id}`, data),
  moveLeadStage: (id: string, stage: string) =>
    api.patch(`/ai-sales/leads/${id}/stage`, { stage }),
  getLeadPipeline: () => api.get("/ai-sales/leads/pipeline"),
  listCalls: (params?: Record<string, string>) =>
    api.get("/ai-sales/calls", { params }),
  createCall: (data: Record<string, unknown>) =>
    api.post("/ai-sales/calls", data),
  getCallStats: () => api.get("/ai-sales/calls/stats"),
  endCall: (id: string, data: Record<string, unknown>) =>
    api.patch(`/ai-sales/calls/${id}/end`, data),

  // Products
  listProducts: () => api.get("/ai-sales/products"),
  createProduct: (data: Record<string, unknown>) =>
    api.post("/ai-sales/products", data),
  updateProduct: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/ai-sales/products/${id}`),

  // Objections
  listObjections: (category?: string) =>
    api.get("/ai-sales/objections", { params: category ? { category } : {} }),
  createObjection: (data: Record<string, unknown>) =>
    api.post("/ai-sales/objections", data),
  updateObjection: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/objections/${id}`, data),
  deleteObjection: (id: string) => api.delete(`/ai-sales/objections/${id}`),

  // Campaigns
  listCampaigns: (status?: string) =>
    api.get("/ai-sales/campaigns", { params: status ? { status } : {} }),
  getCampaign: (id: string) => api.get(`/ai-sales/campaigns/${id}`),
  createCampaign: (data: Record<string, unknown>) =>
    api.post("/ai-sales/campaigns", data),
  updateCampaign: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/campaigns/${id}`, data),
  addLeadsToCampaign: (id: string, leadIds: string[]) =>
    api.post(`/ai-sales/campaigns/${id}/leads`, { leadIds }),
  removeLeadFromCampaign: (id: string, leadId: string) =>
    api.delete(`/ai-sales/campaigns/${id}/leads/${leadId}`),
  startCampaign: (id: string) =>
    api.post(`/ai-sales/campaigns/${id}/start`),
  pauseCampaign: (id: string) =>
    api.post(`/ai-sales/campaigns/${id}/pause`),
  getCampaignStats: (id: string) =>
    api.get(`/ai-sales/campaigns/${id}/stats`),

  // Call orchestrator
  initiateCall: (data: { agentId: string; leadId: string; campaignId?: string; goal?: string }) =>
    api.post("/ai-sales/calls/initiate", data),
  getActiveCallsCount: () => api.get("/ai-sales/calls/active-count"),
  getDetailedCallStats: (from?: string, to?: string) =>
    api.get("/ai-sales/calls/detailed-stats", { params: { from, to } }),

  // Lead scoring
  getLeadScore: (id: string) => api.get(`/ai-sales/leads/${id}/score`),
  bulkScoreLeads: () => api.post("/ai-sales/leads/bulk-score"),

  // Schedules
  listSchedules: (params?: Record<string, string>) =>
    api.get("/ai-sales/schedules", { params }),
  createSchedule: (data: Record<string, unknown>) =>
    api.post("/ai-sales/schedules", data),
  updateSchedule: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/schedules/${id}`, data),
  deleteSchedule: (id: string) => api.delete(`/ai-sales/schedules/${id}`),

  // Analytics
  getAnalyticsDashboard: () => api.get("/ai-sales/analytics/dashboard"),

  // Agent Memory (DB-backed config)
  getMemory: () => api.get("/ai-sales/memory"),
  setMemory: (data: { category: string; key: string; value: string; label?: string }) =>
    api.post("/ai-sales/memory", data),
  bulkSetMemory: (entries: Array<{ category: string; key: string; value: string; label?: string }>) =>
    api.post("/ai-sales/memory/bulk", { entries }),
  deleteMemory: (category: string, key: string) =>
    api.delete(`/ai-sales/memory/${category}/${key}`),
  seedMemory: () => api.post("/ai-sales/memory/seed"),

  // Behavior Insights
  listBehaviorInsights: (params?: { category?: string; segment?: string }) =>
    api.get("/ai-sales/behavior-insights", { params }),
  createBehaviorInsight: (data: Record<string, unknown>) =>
    api.post("/ai-sales/behavior-insights", data),
  updateBehaviorInsight: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/behavior-insights/${id}`, data),
  deleteBehaviorInsight: (id: string) =>
    api.delete(`/ai-sales/behavior-insights/${id}`),
  seedBehaviorInsights: () => api.post("/ai-sales/behavior-insights/seed"),

  // Voice Agents (multi-voice system)
  listVoices: () => api.get("/ai-sales/voices"),
  createVoice: (data: Record<string, unknown>) =>
    api.post("/ai-sales/voices", data),
  updateVoice: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/voices/${id}`, data),
  deleteVoice: (id: string) => api.delete(`/ai-sales/voices/${id}`),
  seedVoices: () => api.post("/ai-sales/voices/seed"),

  // Playground (test endpoints)
  testServices: (agentId: string) =>
    api.get("/ai-sales/playground/test-services", { params: { agentId } }),
  playgroundChat: (data: { agentId: string; message: string; history?: { role: string; text: string }[] }) =>
    api.post("/ai-sales/playground/chat", data),
  playgroundVoice: (formData: FormData) =>
    api.post("/ai-sales/playground/voice", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  playgroundCall: (data: { agentId: string; phoneNumber: string }) =>
    api.post("/ai-sales/playground/call", data),
  playgroundCallStatus: (sessionId: string) =>
    api.get(`/ai-sales/playground/call-status/${sessionId}`),

  // Playground — Google Meet Bot
  playgroundMeetJoin: (data: { agentId: string; meetUrl: string }) =>
    api.post("/ai-sales/playground/meet", data),
  playgroundMeetCreateAndJoin: (data: { agentId: string; leadId?: string; summary?: string }) =>
    api.post("/ai-sales/playground/meet-create-and-join", data),
  playgroundMeetStop: (data: { sessionId: string }) =>
    api.post("/ai-sales/playground/meet-stop", data),
  playgroundMeetStatus: (sessionId: string) =>
    api.get(`/ai-sales/playground/meet-status/${sessionId}`),
  playgroundEmailDraft: (data: { leadId?: string; purpose: string; includeMeetLink?: boolean }) =>
    api.post("/ai-sales/playground/email-draft", data),
  playgroundEmailSend: (data: { to: string; subject: string; body: string; fromEmail?: string }) =>
    api.post("/ai-sales/playground/email-send", data),
  playgroundSimulateChain: (data: { chain: any[]; currentIndex: number }) =>
    api.post("/ai-sales/playground/simulate-chain", data),

  // Central Brain / Intelligence
  getBrainDashboard: () =>
    api.get("/ai-sales/intelligence/dashboard"),
  getLeadInsights: (leadId: string) =>
    api.get(`/ai-sales/intelligence/lead/${leadId}`),
  getWinningPatterns: (segment?: string) =>
    api.get("/ai-sales/intelligence/winning-patterns", { params: segment ? { segment } : {} }),
  getLostDealPatterns: (segment?: string) =>
    api.get("/ai-sales/intelligence/lost-patterns", { params: segment ? { segment } : {} }),
  getConversationMoments: (type?: string) =>
    api.get("/ai-sales/intelligence/moments", { params: type ? { type } : {} }),
  getTimingIntelligence: (segment?: string) =>
    api.get("/ai-sales/intelligence/timing", { params: segment ? { segment } : {} }),
  getCompetitorTrends: () =>
    api.get("/ai-sales/intelligence/competitors"),
  getPersonaPerformance: (personaId?: string) =>
    api.get("/ai-sales/intelligence/persona-performance", { params: personaId ? { personaId } : {} }),
  getReEngagementPatterns: () =>
    api.get("/ai-sales/intelligence/re-engagement"),
  getCallRemarks: (leadId: string) =>
    api.get(`/ai-sales/intelligence/call-remarks/${leadId}`),

  // A/B Testing Engine
  listExperiments: (status?: string) =>
    api.get("/ai-sales/experiments", { params: status ? { status } : {} }),
  getExperiment: (id: string) => api.get(`/ai-sales/experiments/${id}`),
  createExperiment: (data: Record<string, unknown>) =>
    api.post("/ai-sales/experiments", data),
  updateExperiment: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/experiments/${id}`, data),
  deleteExperiment: (id: string) => api.delete(`/ai-sales/experiments/${id}`),
  startExperiment: (id: string) => api.post(`/ai-sales/experiments/${id}/start`),
  pauseExperiment: (id: string) => api.post(`/ai-sales/experiments/${id}/pause`),
  recordExperimentOutcome: (data: Record<string, unknown>) =>
    api.post("/ai-sales/experiments/record-outcome", data),
  getVariantForLead: (leadId: string, type: string) =>
    api.get(`/ai-sales/experiments/variant/${leadId}`, { params: { type } }),

  // Smart Follow-Up Sequencer
  listFollowUps: (status?: string, limit?: number) =>
    api.get("/ai-sales/follow-ups", { params: { status, limit } }),
  getFollowUpStats: () => api.get("/ai-sales/follow-ups/stats"),
  getPendingFollowUps: (limit?: number) =>
    api.get("/ai-sales/follow-ups/pending", { params: limit ? { limit } : {} }),
  getLeadFollowUps: (leadId: string) =>
    api.get(`/ai-sales/follow-ups/lead/${leadId}`),
  scheduleFollowUp: (data: Record<string, unknown>) =>
    api.post("/ai-sales/follow-ups/schedule", data),
  completeFollowUp: (id: string, data: Record<string, unknown>) =>
    api.patch(`/ai-sales/follow-ups/${id}/complete`, data),
  cancelFollowUp: (id: string) => api.patch(`/ai-sales/follow-ups/${id}/cancel`),
  scheduleReEngagement: (data: { leadId: string; dormantDays: number; segmentKey?: string }) =>
    api.post("/ai-sales/follow-ups/re-engage", data),

  // Objection Playbook
  listPlaybook: (params?: { category?: string; segment?: string; approved?: string }) =>
    api.get("/ai-sales/playbook", { params }),
  getPlaybookEntry: (id: string) => api.get(`/ai-sales/playbook/${id}`),
  createPlaybookEntry: (data: Record<string, unknown>) =>
    api.post("/ai-sales/playbook", data),
  updatePlaybookEntry: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/playbook/${id}`, data),
  deletePlaybookEntry: (id: string) => api.delete(`/ai-sales/playbook/${id}`),
  approvePlaybookEntry: (id: string) => api.post(`/ai-sales/playbook/${id}/approve`),
  rejectPlaybookEntry: (id: string) => api.post(`/ai-sales/playbook/${id}/reject`),
  recordPlaybookOutcome: (id: string, won: boolean) =>
    api.post(`/ai-sales/playbook/${id}/record-outcome`, { won }),
  findBestResponse: (objection: string, segment?: string) =>
    api.get("/ai-sales/playbook/find", { params: { objection, segment } }),
  getPlaybookStats: () => api.get("/ai-sales/playbook/stats"),
  seedPlaybook: () => api.post("/ai-sales/playbook/seed"),

  // Webhook / CRM Push
  listWebhooks: () => api.get("/ai-sales/webhooks"),
  getWebhook: (id: string) => api.get(`/ai-sales/webhooks/${id}`),
  createWebhook: (data: Record<string, unknown>) =>
    api.post("/ai-sales/webhooks", data),
  updateWebhook: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/webhooks/${id}`, data),
  deleteWebhook: (id: string) => api.delete(`/ai-sales/webhooks/${id}`),
  toggleWebhook: (id: string, isActive: boolean) =>
    api.post(`/ai-sales/webhooks/${id}/toggle`, { isActive }),
  testWebhook: (id: string) => api.post(`/ai-sales/webhooks/${id}/test`),
  getWebhookDeliveries: (id: string, limit?: number) =>
    api.get(`/ai-sales/webhooks/${id}/deliveries`, { params: limit ? { limit } : {} }),
  retryDelivery: (id: string) => api.post(`/ai-sales/webhooks/deliveries/${id}/retry`),
  getWebhookStats: () => api.get("/ai-sales/webhooks/stats"),

  // Call Recordings + Annotations
  listRecordings: (limit?: number, offset?: number) =>
    api.get("/ai-sales/recordings", { params: { limit, offset } }),
  getRecording: (callSessionId: string) =>
    api.get(`/ai-sales/recordings/${callSessionId}`),
  deleteRecording: (id: string) => api.delete(`/ai-sales/recordings/${id}`),
  saveRecording: (data: Record<string, unknown>) =>
    api.post("/ai-sales/recordings/save", data),
  addAnnotation: (recordingId: string, data: Record<string, unknown>) =>
    api.post(`/ai-sales/recordings/${recordingId}/annotations`, data),
  listAnnotations: (recordingId: string) =>
    api.get(`/ai-sales/recordings/${recordingId}/annotations`),
  updateAnnotation: (id: string, data: Record<string, unknown>) =>
    api.put(`/ai-sales/recordings/annotations/${id}`, data),
  deleteAnnotation: (id: string) => api.delete(`/ai-sales/recordings/annotations/${id}`),
  verifyAnnotation: (id: string) => api.post(`/ai-sales/recordings/annotations/${id}/verify`),
  suggestAnnotations: (callSessionId: string) =>
    api.get(`/ai-sales/recordings/${callSessionId}/suggestions`),
  getRecordingStats: () => api.get("/ai-sales/recordings/stats"),
  getAnnotationStats: () => api.get("/ai-sales/recordings/annotations/stats"),

  // Live Sentiment Dashboard
  getLiveSentiment: () => api.get("/ai-sales/live/sentiment"),
  getCallSentimentHistory: (callSessionId: string) =>
    api.get(`/ai-sales/live/sentiment/history/${callSessionId}`),

  // Lead Interactions / Timeline
  getLeadInteractions: (leadId: string, limit?: number) =>
    api.get(`/ai-sales/leads/${leadId}/interactions`, { params: limit ? { limit } : {} }),
  getLeadInteractionStats: (leadId: string) =>
    api.get(`/ai-sales/leads/${leadId}/interaction-stats`),
  recordInteraction: (leadId: string, data: { type: string; summary?: string; details?: string; channel?: string }) =>
    api.post(`/ai-sales/leads/${leadId}/interactions`, data),

  // AI Email
  sendEmail: (data: { leadId: string; subject: string; body: string; htmlBody?: string; goalForEmail?: string; meetLink?: string; meetScheduledAt?: string; fromEmail?: string }) =>
    api.post("/ai-sales/email/send", data),
  generateEmailDraft: (data: { leadId: string; purpose: string; includeMeetLink?: boolean }) =>
    api.post("/ai-sales/email/draft", data),
  processInboundEmail: (data: { from: string; to: string; subject: string; body: string }) =>
    api.post("/ai-sales/email/inbound", data),
  getLeadEmails: (leadId: string) =>
    api.get(`/ai-sales/leads/${leadId}/emails`),
  getEmailDetail: (id: string) =>
    api.get(`/ai-sales/email/${id}`),

  // Google Meet Scheduling
  scheduleMeet: (data: { leadId: string; agentId: string; scheduledAt: string; subject?: string; notes?: string }) =>
    api.post("/ai-sales/meet/schedule", data),
};

// ─── Certificates ───
export const certificateApi = {
  listTemplates: () => api.get("/certificates/templates"),
  getTemplate: (id: string) => api.get(`/certificates/templates/${id}`),
  createTemplate: (data: Record<string, unknown>) =>
    api.post("/certificates/templates", data),
  updateTemplate: (id: string, data: Record<string, unknown>) =>
    api.put(`/certificates/templates/${id}`, data),
  list: (params?: Record<string, string>) =>
    api.get("/certificates", { params }),
  getById: (id: string) => api.get(`/certificates/${id}`),
  issue: (data: Record<string, unknown>) => api.post("/certificates", data),
  revoke: (id: string, reason: string) =>
    api.patch(`/certificates/${id}/revoke`, { reason }),
  getVerifications: (id: string) =>
    api.get(`/certificates/${id}/verifications`),
  verify: (qrToken: string) => api.get(`/certificates/verify/${qrToken}`),
};

// ─── Social ───
export const socialApi = {
  listAccounts: () => api.get("/social/accounts"),
  connectAccount: (data: Record<string, unknown>) =>
    api.post("/social/accounts", data),
  updateAccount: (id: string, data: Record<string, unknown>) =>
    api.put(`/social/accounts/${id}`, data),
  disconnectAccount: (id: string) =>
    api.patch(`/social/accounts/${id}/disconnect`),
  listPosts: (params?: Record<string, string>) =>
    api.get("/social/posts", { params }),
  getPost: (id: string) => api.get(`/social/posts/${id}`),
  createPost: (data: Record<string, unknown>) =>
    api.post("/social/posts", data),
  updatePost: (id: string, data: Record<string, unknown>) =>
    api.put(`/social/posts/${id}`, data),
  approvePost: (id: string) => api.patch(`/social/posts/${id}/approve`),
  publishPost: (id: string) => api.patch(`/social/posts/${id}/publish`),
  deletePost: (id: string) => api.delete(`/social/posts/${id}`),
  getScheduledPosts: () => api.get("/social/posts/scheduled"),
  recordAnalytics: (accountId: string, data: Record<string, unknown>) =>
    api.post(`/social/analytics/${accountId}`, data),
  getAnalyticsDashboard: () => api.get("/social/analytics/dashboard"),
};

// ─── Review Tracker ───
export const reviewApi = {
  listTrackers: () => api.get("/review-tracker/trackers"),
  getTracker: (id: string) => api.get(`/review-tracker/trackers/${id}`),
  createTracker: (data: Record<string, unknown>) =>
    api.post("/review-tracker/trackers", data),
  updateTracker: (id: string, data: Record<string, unknown>) =>
    api.put(`/review-tracker/trackers/${id}`, data),
  deleteTracker: (id: string) => api.delete(`/review-tracker/trackers/${id}`),
  listReviews: (params?: Record<string, string>) =>
    api.get("/review-tracker/reviews", { params }),
  getReview: (id: string) => api.get(`/review-tracker/reviews/${id}`),
  addReview: (data: Record<string, unknown>) =>
    api.post("/review-tracker/reviews", data),
  markResponded: (id: string) =>
    api.patch(`/review-tracker/reviews/${id}/responded`),
  draftResponse: (reviewId: string, data: Record<string, unknown>) =>
    api.post(`/review-tracker/reviews/${reviewId}/responses`, data),
  approveResponse: (id: string) =>
    api.patch(`/review-tracker/responses/${id}/approve`),
  publishResponse: (id: string) =>
    api.patch(`/review-tracker/responses/${id}/publish`),
  getDashboard: () => api.get("/review-tracker/dashboard"),
};

// ─── Support ───
export const supportApi = {
  listTickets: (params?: Record<string, string>) =>
    api.get("/support/tickets", { params }),
  getTicket: (id: string) => api.get(`/support/tickets/${id}`),
  createTicket: (data: Record<string, unknown>) =>
    api.post("/support/tickets", data),
  updateTicket: (id: string, data: Record<string, unknown>) =>
    api.put(`/support/tickets/${id}`, data),
  assignTicket: (id: string, assignedToId: string) =>
    api.patch(`/support/tickets/${id}/assign`, { assignedToId }),
  resolveTicket: (id: string) => api.patch(`/support/tickets/${id}/resolve`),
  closeTicket: (id: string) => api.patch(`/support/tickets/${id}/close`),
  reopenTicket: (id: string) => api.patch(`/support/tickets/${id}/reopen`),
  addMessage: (ticketId: string, data: Record<string, unknown>) =>
    api.post(`/support/tickets/${ticketId}/messages`, data),
  getMessages: (ticketId: string) =>
    api.get(`/support/tickets/${ticketId}/messages`),
  listArticles: (params?: Record<string, string>) =>
    api.get("/support/knowledge", { params }),
  getArticle: (id: string) => api.get(`/support/knowledge/${id}`),
  createArticle: (data: Record<string, unknown>) =>
    api.post("/support/knowledge", data),
  updateArticle: (id: string, data: Record<string, unknown>) =>
    api.put(`/support/knowledge/${id}`, data),
  deleteArticle: (id: string) => api.delete(`/support/knowledge/${id}`),
  listCannedResponses: (category?: string) =>
    api.get("/support/canned", { params: { category } }),
  createCannedResponse: (data: Record<string, unknown>) =>
    api.post("/support/canned", data),
  useCannedResponse: (id: string) => api.patch(`/support/canned/${id}/use`),
  deleteCannedResponse: (id: string) => api.delete(`/support/canned/${id}`),
  getDashboard: () => api.get("/support/dashboard"),
};

// ─── Settings ───
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data: Record<string, unknown>) => api.post("/settings", data),
};

export const googleBotApi = {
  getAuthUrl: () => api.get("/ai-sales/google/auth-url"),
  getStatus: () => api.get("/ai-sales/google/bot-status"),
  disconnect: () => api.post("/ai-sales/google/disconnect"),
  refreshCookies: (cookies: any[]) => api.post("/ai-sales/google/refresh-cookies", { cookies }),
  loginBot: () => api.post("/ai-sales/google/login-bot"),
  createMeeting: (agentId: string, summary?: string) =>
    api.post("/ai-sales/google/create-meeting", { agentId, summary }),
};

// ─── Health ───
export const healthApi = {
  check: () => api.get("/health"),
};

export default api;
