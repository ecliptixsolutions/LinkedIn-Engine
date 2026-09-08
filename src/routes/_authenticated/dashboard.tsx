import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import {
  Users,
  UserPlus,
  Flame,
  Calendar,
  FileText,
  Trophy,
  TrendingUp,
  DollarSign,
  Bell,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/lib/leadEnums";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [leadsRes, actRes, mtRes, prRes, fuRes] = await Promise.all([
        supabase.from("leads").select("*"),
        supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("meetings").select("*").eq("status", "scheduled"),
        supabase.from("proposals").select("*"),
        supabase
          .from("follow_ups")
          .select("*")
          .eq("status", "pending")
          .lte("scheduled_for", new Date().toISOString()),
      ]);
      return {
        leads: leadsRes.data ?? [],
        activities: actRes.data ?? [],
        meetings: mtRes.data ?? [],
        proposals: prRes.data ?? [],
        followUpsDue: fuRes.data ?? [],
      };
    },
  });

  const leads = data?.leads ?? [];
  const total = leads.length;
  const byStatus = (s: string) => leads.filter((l) => l.status === s).length;
  const hot = leads.filter((l) => l.temperature === "hot").length;
  const won = leads.filter((l) => l.status === "won");
  const lost = byStatus("lost");
  const revenue = (data?.proposals ?? [])
    .filter((p) => p.status === "won")
    .reduce((a, p) => a + Number(p.value ?? 0), 0);

  const sourceData = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const k = l.lead_source || "Unknown";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const funnel = [
    { name: "New", value: byStatus("new") },
    { name: "Contacted", value: byStatus("contacted") },
    { name: "Interested", value: byStatus("interested") },
    { name: "Meeting", value: byStatus("meeting_scheduled") },
    { name: "Proposal", value: byStatus("proposal_sent") },
    { name: "Won", value: byStatus("won") },
  ];

  const COLORS = ["#0A84FF", "#FFC107", "#22c55e", "#f97316", "#a855f7", "#ef4444"];

  return (
    <div>
      <PageHeader title="Dashboard" description="Your AI lead engine command center." />

      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <>
          {total === 0 && (
            <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-primary/25 bg-primary/5 p-5">
              <div>
                <h3 className="font-semibold">
                  Your dashboard fills automatically after lead import
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Discover LinkedIn leads, select them, and import them into the CRM.
                </p>
              </div>
              <Link
                to="/discover"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
              >
                Discover LinkedIn leads
              </Link>
            </Card>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Leads" value={total} icon={Users} tone="primary" />
            <StatCard label="Hot Leads" value={hot} icon={Flame} tone="warning" hint="Score ≥ 80" />
            <StatCard label="Meetings" value={data?.meetings.length ?? 0} icon={Calendar} />
            <StatCard
              label="Revenue Won"
              value={`$${revenue.toLocaleString()}`}
              icon={DollarSign}
              tone="success"
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="New" value={byStatus("new")} icon={UserPlus} />
            <StatCard
              label="Follow-Ups Due"
              value={data?.followUpsDue.length ?? 0}
              icon={Bell}
              tone="warning"
            />
            <StatCard label="Proposals Sent" value={byStatus("proposal_sent")} icon={FileText} />
            <StatCard
              label="Won / Lost"
              value={`${won.length} / ${lost}`}
              icon={Trophy}
              tone="success"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" /> Conversion Funnel
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnel}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0A84FF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Lead Sources</h3>
              {sourceData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add leads to see source breakdown.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Clock className="h-4 w-4 text-primary" /> Activity Timeline
              </h3>
              {data!.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data!.activities.map((a) => (
                    <li
                      key={a.id}
                      className="flex gap-3 border-b border-border/40 pb-3 last:border-0"
                    >
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{a.title}</div>
                        {a.description && (
                          <div className="text-xs text-muted-foreground">{a.description}</div>
                        )}
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {format(new Date(a.created_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Hot leads</h3>
              {leads.filter((l) => l.temperature === "hot").length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hot leads yet. Run AI analysis on a lead to score them.
                </p>
              ) : (
                <ul className="space-y-2">
                  {leads
                    .filter((l) => l.temperature === "hot")
                    .slice(0, 8)
                    .map((l) => (
                      <li key={l.id}>
                        <Link
                          to="/leads/$id"
                          params={{ id: l.id }}
                          className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
                        >
                          <div>
                            <div className="text-sm font-medium">{l.full_name}</div>
                            <div className="text-xs text-muted-foreground">{l.company_name}</div>
                          </div>
                          <StatusBadge status={l.status} />
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
