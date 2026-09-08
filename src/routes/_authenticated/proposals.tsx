import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/proposals")({
  component: Proposals,
});

const STATUSES = ["draft", "sent", "viewed", "negotiation", "won", "lost"] as const;
const TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-indigo-100 text-indigo-700",
  negotiation: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-rose-100 text-rose-700",
};

function Proposals() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () =>
      (
        await supabase
          .from("proposals")
          .select("*, leads(full_name, company_name)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-min"],
    queryFn: async () =>
      (await supabase.from("leads").select("id, full_name, company_name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (p: any) => {
      const user = await getSessionUser();
      const { error } = await supabase.from("proposals").insert({ ...p, user_id: user.id });
      if (error) throw error;
      await supabase.from("activities").insert({
        user_id: user.id,
        lead_id: p.lead_id,
        activity_type: "proposal_created",
        title: `Created proposal: ${p.title}`,
        description: `$${Number(p.value).toLocaleString()}`,
      });
    },
    onSuccess: () => {
      toast.success("Proposal saved");
      setOpen(false);
      qc.invalidateQueries();
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: any) => {
      const { error } = await supabase.from("proposals").update(patch).eq("id", id);
      if (error) throw error;
      const proposal = items.find((item: any) => item.id === id);
      const user = await getSessionUser();
      if (proposal && patch.status) {
        const leadStatus =
          patch.status === "won" || patch.status === "lost"
            ? patch.status
            : patch.status === "sent"
              ? "proposal_sent"
              : patch.status === "negotiation"
                ? "negotiation"
                : null;
        if (leadStatus)
          await supabase.from("leads").update({ status: leadStatus }).eq("id", proposal.lead_id);
        await supabase.from("activities").insert({
          user_id: user.id,
          lead_id: proposal.lead_id,
          activity_type: "proposal_status",
          title: `Proposal marked ${patch.status}`,
        });
      }
    },
    onSuccess: () => {
      toast.success("Proposal updated");
      qc.invalidateQueries();
    },
  });

  const [f, setF] = useState({ lead_id: "", title: "", value: 0, services: "", notes: "" });

  const totalPipeline = items
    .filter((p: any) => !["won", "lost"].includes(p.status))
    .reduce((a: number, p: any) => a + Number(p.value), 0);
  const totalWon = items
    .filter((p: any) => p.status === "won")
    .reduce((a: number, p: any) => a + Number(p.value), 0);

  return (
    <div>
      <PageHeader
        title="Proposals"
        description="Track proposals from draft to close."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New proposal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New proposal</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Lead</Label>
                  <Select value={f.lead_id} onValueChange={(v) => setF({ ...f, lead_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
                </div>
                <div>
                  <Label>Value (USD)</Label>
                  <Input
                    type="number"
                    value={f.value}
                    onChange={(e) => setF({ ...f, value: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Services (comma-separated)</Label>
                  <Input
                    value={f.services}
                    onChange={(e) => setF({ ...f, services: e.target.value })}
                    placeholder="Website, CRM, WhatsApp Automation"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={f.notes}
                    onChange={(e) => setF({ ...f, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    f.lead_id &&
                    create.mutate({
                      ...f,
                      services: f.services
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open Pipeline"
          value={`$${totalPipeline.toLocaleString()}`}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Won Revenue"
          value={`$${totalWon.toLocaleString()}`}
          icon={DollarSign}
          tone="success"
        />
        <StatCard label="Total Proposals" value={items.length} icon={FileText} />
      </div>

      <Card className="p-5">
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No proposals yet.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((p: any) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex-1">
                  <div className="font-medium">{p.title}</div>
                  <Link
                    to="/leads/$id"
                    params={{ id: p.lead_id }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {p.leads?.full_name} · {p.leads?.company_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(p.proposal_date), "MMM d, yyyy")}
                    {p.services?.length ? ` · ${p.services.join(", ")}` : ""}
                  </div>
                </div>
                <div className="mr-3 text-right">
                  <div className="font-semibold">${Number(p.value).toLocaleString()}</div>
                  <Badge className={TONE[p.status]}>{p.status}</Badge>
                </div>
                <Select
                  value={p.status}
                  onValueChange={(v) => update.mutate({ id: p.id, patch: { status: v } })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
