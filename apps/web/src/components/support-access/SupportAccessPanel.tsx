"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSupportToken, storeSupportToken } from "@/lib/support-session";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/providers/translation-provider";
import { T } from "@/components/ui/T";
import { Button } from "@/components/ui/button";

type Permission = { id: string; label: string; description: string };
type Grant = {
  id: string;
  status: string;
  reason: string;
  sellerId: string;
  adminId: string;
  expiresAt: string | null;
  permissions: string[];
  admin: { firstName: string; lastName: string };
  shop: { shopName: string };
};
type ChatContext = {
  admin: { id: string; firstName: string; lastName: string };
  sellerId: string;
  shops: { id: string; shopName: string }[];
};
const durations = [
  ["1", "1 hour"],
  ["6", "6 hours"],
  ["24", "1 day"],
  ["168", "7 days"],
  ["720", "30 days"],
  ["2160", "90 days"],
  ["custom", "Custom expiry"],
];

function toLocalDateTimeInput(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function ConsentFields({
  permissions,
  onChange,
}: {
  permissions: Permission[];
  onChange: (value: { expiresAt: string; permissions: string[] }) => void;
}) {
  const t = useT();
  const [duration, setDuration] = useState("1");
  const [custom, setCustom] = useState("");
  const [changes, setChanges] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [baseTime] = useState(() => Date.now());
  const timestamp =
    duration === "custom"
      ? Date.parse(custom)
      : baseTime + Number(duration) * 3600_000;
  const customDuration = timestamp - Date.now();
  const expiry =
    Number.isFinite(timestamp) &&
    (duration !== "custom" ||
      (customDuration >= 60_000 && customDuration <= 90 * 86400_000))
    ? new Date(timestamp).toISOString()
    : "";
  useEffect(() => {
    onChange({ expiresAt: expiry, permissions: changes ? selected : [] });
  }, [expiry, changes, selected, onChange]);
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        <T>Allow access for</T>
        <select
          className="mt-1 block w-full rounded border bg-background p-2"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          {durations.map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      {duration === "custom" && (
        <label className="block text-sm">
          <T>Expiry date and time</T>
          <input
            type="datetime-local"
            className="block w-full rounded border bg-background p-2"
            value={custom}
            min={toLocalDateTimeInput(baseTime + 60_000)}
            max={toLocalDateTimeInput(baseTime + 90 * 86400_000)}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
      )}
      {expiry && (
        <p className="text-xs text-muted-foreground">
          <T>Access expires</T> {new Date(expiry).toLocaleString()}
        </p>
      )}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={changes}
          onChange={(e) => setChanges(e.target.checked)}
        />
        <T>Allow selected changes</T>
      </label>
      {!changes && (
        <p className="text-xs text-muted-foreground">
          <T>Read-only browsing. No changes or PDF downloads.</T>
        </p>
      )}
      {changes && (
        <div className="space-y-3 rounded border p-3">
          {permissions.map((p) => (
            <label key={p.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked
                      ? [...prev, p.id]
                      : prev.filter((id) => id !== p.id),
                  )
                }
              />
              <span>
                <span className="font-medium">{t(p.label)}</span>
                <span className="block text-xs text-muted-foreground">
                  {t(p.description)}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={false} disabled />
        <T>Screen recording — off</T>
      </label>
      <p className="text-xs text-muted-foreground">
        <T>
          Screen recording is unavailable. Access and actions are logged. You
          can revoke permission at any time.
        </T>
      </p>
    </div>
  );
}

export function SupportGrantCard({ grantId }: { grantId: string }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={(event) => setOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-medium"><T>View support permission</T></summary>{open && <SupportAccessPanel grantId={grantId} />}</details>;
}

export function SupportAccessPanel({
  conversationId,
  grantId,
}: {
  conversationId?: string;
  grantId?: string;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const t = useT();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [shopId, setShopId] = useState("");
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState({
    expiresAt: "",
    permissions: [] as string[],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [activity, setActivity] = useState<{
    events: {
      id: string;
      action: string;
      resource?: string;
      outcome: string;
      createdAt: string;
    }[];
    sessions: {
      id: string;
      startedAt: string;
      expiresAt: string;
      lastUsedAt: string;
      endedAt: string | null;
    }[];
  } | null>(null);
  const reload = useCallback(async () => {
    if (getSupportToken()) return;
    const [options, list] = await Promise.all([
      api.get("/support-access/options"),
      grantId
        ? api.get(`/support-access/grants/${grantId}`)
        : api.get("/support-access/grants", { params: { conversationId } }),
    ]);
    setPermissions(
      Array.isArray(options.data?.permissions) ? options.data.permissions : [],
    );
    setGrants(grantId ? [list.data] : list.data);
    setReady(true);
  }, [conversationId, grantId]);
  useEffect(() => {
    if (
      getSupportToken() ||
      !userId ||
      !userRole ||
      !["ADMIN", "SHOPKEEPER"].includes(userRole)
    )
      return;
    void reload().catch((e) => {
      if (!conversationId)
        setError(
          e.response?.data?.message || t("Could not load support access"),
        );
    });
    if (conversationId)
      void api
        .get(`/support-access/context/${conversationId}`)
        .then((r) => {
          setContext(r.data);
          setShopId(r.data.shops[0]?.id || "");
        })
        .catch(() => setContext(null));
    if (grantId) return;
    const timer = window.setInterval(() => {
      void reload().catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [reload, conversationId, grantId, userId, userRole, t]);
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
      setEditing(null);
      await reload();
    } catch (e: any) {
      setError(
        e.response?.data?.message || t("Could not update support access"),
      );
    } finally {
      setBusy(false);
    }
  }
  if (getSupportToken()) return null;
  if (conversationId && (!context || !ready)) return null;
  return (
    <section
      className="space-y-3 rounded-lg border bg-background p-3 text-foreground"
      data-tour="support-access-permissions"
    >
      {!grantId && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            <T>Support access</T>
          </h2>
          {context && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(editing === "new" ? null : "new")}
            >
              <T>
                {user?.role === "ADMIN"
                  ? "Request account access"
                  : "Grant support access"}
              </T>
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
      {editing === "new" && context && (
        <div className="space-y-3 border-t pt-3">
          <p className="text-sm">
            <T>Admin</T>: {context.admin.firstName} {context.admin.lastName}
          </p>
          <label className="block text-sm">
            <T>Shop</T>
            <select
              className="block w-full rounded border bg-background p-2"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
            >
              {context.shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shopName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <T>Reason for access</T>
            <textarea
              className="block w-full rounded border bg-background p-2"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {user?.role === "SHOPKEEPER" && (
            <ConsentFields permissions={permissions} onChange={setConsent} />
          )}
          <Button
            disabled={
              busy ||
              reason.trim().length < 5 ||
              !shopId ||
              (user?.role === "SHOPKEEPER" && !consent.expiresAt)
            }
            onClick={() =>
              void run(() =>
                api.post(
                  user?.role === "ADMIN"
                    ? "/support-access/requests"
                    : "/support-access/grants",
                  {
                    conversationId,
                    shopId,
                    reason: reason.trim(),
                    ...(user?.role === "SHOPKEEPER" ? consent : {}),
                  },
                ),
              )
            }
          >
            <T>{user?.role === "ADMIN" ? "Send request" : "Allow access"}</T>
          </Button>
        </div>
      )}
      {grants.map((g) => {
        const expired = !!g.expiresAt && Date.parse(g.expiresAt) <= Date.now();
        const active = g.status === "APPROVED" && !expired;
        return (
          <article key={g.id} className="space-y-2 rounded border p-3">
            <div className="text-sm font-medium">
              {g.shop.shopName} · {g.admin.firstName} {g.admin.lastName}
            </div>
            <p className="text-sm">{g.reason}</p>
            <p className="text-xs font-medium">
              {t(
                expired && g.status === "APPROVED"
                  ? "Expired"
                  : {
                      PENDING: "Awaiting seller approval",
                      APPROVED: "Approved",
                      REVOKED: "Revoked",
                      DECLINED: "Declined",
                    }[g.status] || g.status,
              )}
              {g.expiresAt && <> · {new Date(g.expiresAt).toLocaleString()}</>}
            </p>
            <p className="text-xs text-muted-foreground">
              {g.permissions.length
                ? g.permissions
                    .map((id) =>
                      t(permissions.find((p) => p.id === id)?.label || id),
                    )
                    .join(", ")
                : t("Read-only browsing")}{" "}
              · <T>Screen recording off</T>
            </p>
            {editing === g.id && (
              <ConsentFields permissions={permissions} onChange={setConsent} />
            )}
            <div className="flex flex-wrap gap-2">
              {g.status === "PENDING" && user?.id === g.sellerId && (
                <>
                  <Button
                    size="sm"
                    disabled={busy || (editing === g.id && !consent.expiresAt)}
                    onClick={() =>
                      editing === g.id
                        ? void run(() =>
                            api.post(
                              `/support-access/grants/${g.id}/approve`,
                              consent,
                            ),
                          )
                        : setEditing(g.id)
                    }
                  >
                    <T>
                      {editing === g.id ? "Allow access" : "Choose permissions"}
                    </T>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        api.post(`/support-access/grants/${g.id}/decline`),
                      )
                    }
                  >
                    <T>Decline</T>
                  </Button>
                </>
              )}
              {active && user?.id === g.sellerId && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      api.post(`/support-access/grants/${g.id}/revoke`),
                    )
                  }
                >
                  <T>Revoke access</T>
                </Button>
              )}
              {active && user?.id === g.adminId && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const r = await api.post(
                        `/support-access/grants/${g.id}/sessions`,
                      );
                      storeSupportToken(r.data.token);
                      window.location.assign("/dashboard/shop");
                    })
                  }
                >
                  <T>Open seller dashboard</T>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    setActivity(
                      (await api.get(`/support-access/grants/${g.id}/activity`))
                        .data,
                    ),
                  )
                }
              >
                <T>Access history</T>
              </Button>
            </div>
          </article>
        );
      })}
      {ready && !grants.length && editing !== "new" && (
        <p className="text-sm text-muted-foreground">
          <T>
            No support permissions yet. Start from a conversation with an admin.
          </T>
        </p>
      )}
      {activity && (
        <div className="max-h-64 space-y-2 overflow-auto rounded border p-3 text-xs">
          <div className="flex justify-between">
            <strong>
              <T>Recent access history</T>
            </strong>
            <button onClick={() => setActivity(null)}>
              <T>Close</T>
            </button>
          </div>
          {activity.sessions.map((s) => (
            <p key={s.id}>
              <T>Session</T> · {new Date(s.startedAt).toLocaleString()} ·{" "}
              {t(
                s.endedAt ||
                  Date.parse(s.expiresAt) <= Date.now() ||
                  Date.now() - Date.parse(s.lastUsedAt) >= 900000
                  ? "Ended"
                  : "Active",
              )}
            </p>
          ))}
          {activity.events.map((e) => (
            <p key={e.id}>
              {new Date(e.createdAt).toLocaleString()} · {t(e.action)}{" "}
              {e.resource} · {t(e.outcome)}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
