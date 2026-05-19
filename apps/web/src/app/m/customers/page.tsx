"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";

import { T } from "@/components/ui/T";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { customerCrmApi } from "@/lib/api";
import {
    ChevronRight,
    Loader2,
    Phone,
    Search,
    User,
    Users
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Customer {
  id: string;
  type?: "REGISTERED" | "WALK_IN";
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  orderCount?: number;
  totalOrders?: number;
  rfqCount?: number;
  quoteCount?: number;
  totalSpent?: number;
  totalSpentNpr?: number;
  lastActive?: string;
  lastOrderDate?: string;
}

interface CustomerProfile {
  customer: Customer;
  stats: {
    totalOrders: number;
    totalSpent?: number;
    totalSpentNpr: number;
    averageOrderValue?: number;
    avgOrderValueNpr: number;
    lastOrderDate: string;
  };
  recentOrders: {
    id: string;
    status: string;
    totalNpr: number;
    createdAt: string;
  }[];
}

function getCustomerName(customer?: Customer | null, fallback = "Customer") {
  const fullName = [customer?.firstName, customer?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return customer?.name || fullName || customer?.email || customer?.phone || fallback;
}

function CustomerCard({
  customer,
  onSelect,
}: {
  customer: Customer;
  onSelect: () => void;
}) {
  const name = getCustomerName(customer, "Unknown");
  const totalOrders = (customer.orderCount ?? 0) + (customer.quoteCount ?? 0) || customer.totalOrders;
  const totalSpent = customer.totalSpent ?? customer.totalSpentNpr;
  const { format } = useShopCurrency();
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3.5 active:bg-gray-50 text-left"
    >
      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-amber-600">
          {(name[0] ?? "?").toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">
          {customer.phone ?? customer.email ?? "No contact"}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        {totalOrders !== undefined && (
          <p className="text-xs text-gray-400">{totalOrders} orders</p>
        )}
        {totalSpent !== undefined && totalSpent > 0 && (
          <p className="text-xs font-semibold text-amber-700">
            {format(totalSpent)}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 ml-1 flex-shrink-0" />
    </button>
  );
}

function ProfileDrawer({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, sRes, oRes] = await Promise.all([
          customerCrmApi.getCustomerProfile(customerId),
          customerCrmApi.getCustomerStats(customerId),
          customerCrmApi.getCustomerOrders(customerId),
        ]);
        setProfile({
          customer: pRes.data?.customer ?? pRes.data,
          stats: sRes.data,
          recentOrders: oRes.data?.orders ?? oRes.data ?? [],
        });
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId]);

  const c = profile?.customer;
  const name = getCustomerName(c, "Customer");
  const { format } = useShopCurrency();
  const totalSpent = profile?.stats?.totalSpent ?? profile?.stats?.totalSpentNpr ?? 0;
  const avgOrderValue = profile?.stats?.averageOrderValue ?? profile?.stats?.avgOrderValueNpr ?? 0;

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b bg-amber-50">
        <button
          onClick={onClose}
          className="p-2 -ml-1 rounded-xl text-gray-500 hover:bg-white"
        >
          ←
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-900">{name}</h2>
          {c?.phone && (
            <a
              href={`tel:${c.phone}`}
              className="flex items-center gap-1 text-xs text-amber-600"
            >
              <Phone className="h-3 w-3" />
              {c.phone}
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : profile ? (
          <div className="px-4 py-5 space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatBox
                label="Total Orders"
                value={String(profile.stats?.totalOrders ?? 0)}
              />
              <StatBox
                label="Total Spent"
                value={format(totalSpent)}
              />
              <StatBox
                label="Avg Order"
                value={format(avgOrderValue)}
              />
              <StatBox
                label="Last Order"
                value={
                  profile.stats?.lastOrderDate
                    ? new Date(profile.stats.lastOrderDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—"
                }
              />
            </div>

            {/* Recent orders */}
            {profile.recentOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <T>Recent Orders</T>
                </p>
                {profile.recentOrders.slice(0, 5).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {o.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-amber-700">
                      {format(o.totalNpr ?? 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* WhatsApp button */}
            {c?.phone && (
              <a
                href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-semibold text-sm"
              >
                <span>💬</span> <T>Message on WhatsApp</T>
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <User className="h-8 w-8" />
            <p className="text-sm"><T>Could not load profile</T></p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-[10px] text-gray-400 uppercase font-medium"><T>{label}</T></p>
      <p className="text-base font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounce = useRef<NodeJS.Timeout>();

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await customerCrmApi.search({ query: q, limit: 30 });
      setCustomers(res.data?.customers ?? res.data?.items ?? res.data ?? []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search("");
  }, [search]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(query), 350);
    return () => clearTimeout(debounce.current);
  }, [query, search]);

  return (
    <MobileFeatureGate feature="mobileCustomers" featureName="Customer CRM">
      <div className="flex flex-col h-full">
        {/* Search */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-gray-900"><T>Customers</T></h1>

          </div>
          <div data-tour="m-customers-search" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, or email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* List */}
        <div data-tour="m-customers-list" className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Users className="h-8 w-8" />
              <p className="text-sm">
                {query ? <T>No customers found</T> : <T>No customers yet</T>}
              </p>
            </div>
          ) : (
            customers.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onSelect={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {selectedId && (
        <ProfileDrawer
          customerId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </MobileFeatureGate>
  );
}
