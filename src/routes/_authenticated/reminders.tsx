import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Bell, Flame, Calendar, FileText, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: Reminders,
});

function Reminders() {
  const { data } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const [followups, hot, meetings, proposals, inactive] = await Promise.all([
        supabase
          .from("follow_ups")
          .select("*, leads(full_name, company_name)")
          .eq("status", "pending")
          .lte("scheduled_for", now),
        supabase
          .from("leads")
          .select("*")
          .eq("temperature", "hot")
          .neq("status", "won")
          .neq("status", "lost")
          .limit(10),
        supabase
          .from("meetings")
          .select("*, leads(full_name)")
          .eq("status", "scheduled")
          .gte("scheduled_at", now)
          .lte("scheduled_at", addDays(new Date(), 7).toISOString()),
        supabase
          .from("proposals")
          .select("*, leads(full_name)")
          .in("status", ["sent", "viewed", "negotiation"]),
        supabase
          .from("leads")
          .select("*")
          .lt("updated_at", addDays(new Date(), -14).toISOString())
          .neq("status", "won")
          .neq("status", "lost")
          .limit(10),
      ]);
      return {
        followups: followups.data ?? [],
        hot: hot.data ?? [],
        meetings: meetings.data ?? [],
        proposals: proposals.data ?? [],
        inactive: inactive.data ?? [],
      };
    },
  });

  return (
    <div>
      <PageHeader title="Daily Reminders" description="Your AI-curated action list for today." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Follow-ups due"
          icon={Bell}
          tone="warning"
          count={data?.followups.length ?? 0}
        >
          {(data?.followups ?? []).map((f: any) => (
            <Item
              key={f.id}
              to={`/leads/${f.lead_id}`}
              title={f.leads?.full_name}
              subtitle={`${f.leads?.company_name ?? ""} · scheduled ${format(new Date(f.scheduled_for), "MMM d")}`}
            />
          ))}
        </Section>
        <Section
          title="Hot leads waiting"
          icon={Flame}
          tone="destructive"
          count={data?.hot.length ?? 0}
        >
          {(data?.hot ?? []).map((l: any) => (
            <Item
              key={l.id}
              to={`/leads/${l.id}`}
              title={l.full_name}
              subtitle={`${l.company_name ?? ""} · score ${l.lead_score}`}
            />
          ))}
        </Section>
        <Section
          title="Upcoming meetings (7d)"
          icon={Calendar}
          tone="primary"
          count={data?.meetings.length ?? 0}
        >
          {(data?.meetings ?? []).map((m: any) => (
            <Item
              key={m.id}
              to={`/leads/${m.lead_id}`}
              title={m.title}
              subtitle={`${m.leads?.full_name} · ${format(new Date(m.scheduled_at), "EEE MMM d, h:mm a")}`}
            />
          ))}
        </Section>
        <Section
          title="Pending proposals"
          icon={FileText}
          tone="primary"
          count={data?.proposals.length ?? 0}
        >
          {(data?.proposals ?? []).map((p: any) => (
            <Item
              key={p.id}
              to={`/leads/${p.lead_id}`}
              title={p.title}
              subtitle={`${p.leads?.full_name} · $${Number(p.value).toLocaleString()}`}
            />
          ))}
        </Section>
        <Section
          title="Inactive leads (14d+)"
          icon={AlertCircle}
          tone="muted"
          count={data?.inactive.length ?? 0}
        >
          {(data?.inactive ?? []).map((l: any) => (
            <Item
              key={l.id}
              to={`/leads/${l.id}`}
              title={l.full_name}
              subtitle={`${l.company_name ?? ""} · last touched ${format(new Date(l.updated_at), "MMM d")}`}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, tone, count, children }: any) {
  const tones: Record<string, string> = {
    warning: "from-warning/15 to-warning/0",
    destructive: "from-destructive/15 to-destructive/0",
    primary: "from-primary/15 to-primary/0",
    muted: "from-muted to-muted/0",
  };
  return (
    <Card className={`p-5 bg-gradient-to-br ${tones[tone]}`}>
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" /> {title}{" "}
        <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs">{count}</span>
      </h3>
      <ul className="space-y-1">{children}</ul>
      {count === 0 && <p className="text-sm text-muted-foreground">All clear ✨</p>}
    </Card>
  );
}
function Item({ to, title, subtitle }: { to: string; title: string; subtitle: string }) {
  return (
    <li>
      <Link to={to as any} className="block rounded-lg p-2 hover:bg-card/60">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </Link>
    </li>
  );
}
