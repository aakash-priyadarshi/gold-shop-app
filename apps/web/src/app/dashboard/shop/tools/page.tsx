"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeftRight,
  Calculator,
  CreditCard,
  Scale,
  Shield,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";

const tools = [
  {
    title: "Old Gold Exchange",
    description:
      "Calculate exchange value when trading old gold for new jewellery",
    href: "/dashboard/shop/tools/old-gold",
    icon: ArrowLeftRight,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  },
  {
    title: "Hallmark Tracker",
    description: "Track BIS Hallmark & HUID entries for sold items",
    href: "/dashboard/shop/tools/hallmark",
    icon: Shield,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  },
  {
    title: "EMI Calculator",
    description: "Calculate monthly installment plans for customers",
    href: "/dashboard/shop/tools/emi",
    icon: CreditCard,
    color: "text-green-500 bg-green-50 dark:bg-green-950/30",
  },
  {
    title: "Repair Tracking",
    description: "Manage jewellery repair, alteration, and service jobs",
    href: "/dashboard/shop/tools/repairs",
    icon: Wrench,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
  },
  {
    title: "Daily Cash Summary",
    description: "Track daily cash inflows, outflows, and closing balance",
    href: "/dashboard/shop/tools/daily-cash",
    icon: Wallet,
    color: "text-red-500 bg-red-50 dark:bg-red-950/30",
  },
  {
    title: "Weighing Scale",
    description: "Connect a digital weighing scale via USB/Serial",
    href: "/dashboard/shop/tools/weighing-scale",
    icon: Scale,
    color: "text-teal-500 bg-teal-50",
  },
];

export default function ToolsPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6 text-amber-500" />
              Shop Tools
            </h1>
            <p className="text-muted-foreground">
              Smart tools to streamline your jewellery business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 ${tool.color}`}
                    >
                      <tool.icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-semibold mb-1">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
