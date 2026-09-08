import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Users, Trophy, DollarSign, Percent } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: Analytics,
});

function Analytics() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [leadsRes, proposalsRes, meetingsRes] = await Promise.all([
        supabase.from("leads").select("*"),
        supabase.from("proposals").select("*"),
        supabase.from("meetings").select("*"),
      ]);
      return {
        leads: leadsRes.data ?? [],
        proposals: proposalsRes.data ?? [],
        meetings: meetingsRes.data ?? [],
      };
    },
  });

  const leads = data?.leads ?? [];
  const proposals = data?.proposals ?? [];
  const meetings = data?.meetings ?? [];

  const won = proposals.filter((p) => p.status === "won");
  const revenue = won.reduce((a, p) => a + Number(p.value), 0);
  const convRate = leads.length
    ? Math.round((leads.filter((l) => l.status === "won").length / leads.length) * 100)
    : 0;
  const avgDeal = won.length ? Math.round(revenue / won.length) : 0;

  // Monthly performance — last 6 months
  const months = Array.from({ length: 6 }).map((_, i) =>
    startOfMonth(subMonths(new Date(), 5 - i)),
  );
  const monthly = months.map((m) => {
    const label = format(m, "MMM");
    const inMonth = (d: string) => {
      const x = new Date(d);
      return x.getMonth() === m.getMonth() && x.getFullYear() === m.getFullYear();
    };
    return {
      month: label,
      leads: leads.filter((l) => inMonth(l.created_at)).length,
      meetings: meetings.filter((x) => inMonth(x.scheduled_at)).length,
      revenue: proposals
        .filter((p) => p.status === "won" && inMonth(p.created_at))
        .reduce((a, p) => a + Number(p.value), 0),
    };
  });

  const industries = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const k = l.industry || "Unknown";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const services = Object.entries(
    won.reduce<Record<string, number>>((acc, p) => {
      (p.services ?? []).forEach((s: string) => (acc[s] = (acc[s] ?? 0) + 1));
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title="Analytics" description="Performance, conversion, and revenue insights." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={leads.length} icon={Users} tone="primary" />
        <StatCard label="Deals Won" value={won.length} icon={Trophy} tone="success" />
        <StatCard
          label="Revenue"
          value={`$${revenue.toLocaleString()}`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Conv. Rate"
          value={`${convRate}%`}
          icon={Percent}
          tone="warning"
          hint={`Avg deal $${avgDeal.toLocaleString()}`}
        />
      </div>

      <Card className="mt-6 p-6">
        <h3 className="mb-4 font-semibold">Monthly Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="leads" stroke="#0A84FF" strokeWidth={2} />
            <Line type="monotone" dataKey="meetings" stroke="#FFC107" strokeWidth={2} />
            <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Top Industries</h3>
          {industries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={industries} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#0A84FF" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Best Converting Services</h3>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">Close a deal to see breakdown.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={services}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#FFC107" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
