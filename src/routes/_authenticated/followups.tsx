import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/followups")({
  component: FollowUps,
});

const DEFAULT_SEQUENCE = [
  { step: 1, label: "Day 0 — Connection Request", offsetDays: 0 },
  { step: 2, label: "Day 2 — Follow-Up #1", offsetDays: 2 },
  { step: 3, label: "Day 5 — Follow-Up #2", offsetDays: 5 },
  { step: 4, label: "Day 10 — Case Study", offsetDays: 10 },
  { step: 5, label: "Day 15 — Final Follow-Up", offsetDays: 15 },
];

function FollowUps() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["followups"],
    queryFn: async () =>
      (
        await supabase
          .from("follow_ups")
          .select("*, leads(full_name, company_name)")
          .order("scheduled_for")
      ).data ?? [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-min"],
    queryFn: async () =>
      (await supabase.from("leads").select("id, full_name, company_name")).data ?? [],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({
          status: status as any,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
      const item = items.find((followUp: any) => followUp.id === id);
      const user = await getSessionUser();
      if (item) {
        await supabase
          .from("leads")
          .update({ last_contact_date: new Date().toISOString() })
          .eq("id", item.lead_id);
        await supabase.from("activities").insert({
          user_id: user.id,
          lead_id: item.lead_id,
          activity_type: "follow_up_completed",
          title: `Completed follow-up step ${item.sequence_step}`,
        });
      }
    },
    onSuccess: () => {
      toast.success("Follow-up completed");
      qc.invalidateQueries();
    },
  });

  const createSequence = useMutation({
    mutationFn: async ({ leadId, channel }: { leadId: string; channel: string }) => {
      const user = await getSessionUser();
      const rows = DEFAULT_SEQUENCE.map((s) => ({
        user_id: user.id,
        lead_id: leadId,
        sequence_step: s.step,
        channel,
        scheduled_for: addDays(new Date(), s.offsetDays).toISOString(),
        status: "pending" as const,
        message: s.label,
      }));
      const { error } = await supabase.from("follow_ups").insert(rows);
      if (error) throw error;
      await supabase
        .from("leads")
        .update({ next_followup_date: rows[0].scheduled_for })
        .eq("id", leadId);
      await supabase.from("activities").insert({
        user_id: user.id,
        lead_id: leadId,
        activity_type: "follow_up_sequence",
        title: `Created ${rows.length}-step ${channel} follow-up sequence`,
      });
    },
    onSuccess: () => {
      toast.success("Sequence created");
      setOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [seqLeadId, setSeqLeadId] = useState("");
  const [seqChannel, setSeqChannel] = useState("linkedin");

  const grouped = {
    overdue: items.filter(
      (f: any) => f.status === "pending" && new Date(f.scheduled_for) < new Date(),
    ),
    today: items.filter(
      (f: any) =>
        f.status === "pending" &&
        format(new Date(f.scheduled_for), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
    ),
    upcoming: items.filter(
      (f: any) =>
        f.status === "pending" &&
        new Date(f.scheduled_for) > addDays(new Date(), 0) &&
        format(new Date(f.scheduled_for), "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd"),
    ),
    done: items.filter((f: any) => f.status !== "pending"),
  };

  return (
    <div>
      <PageHeader
        title="Follow-Up Automation"
        description="Sequences, reminders, and timely outreach."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New sequence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a follow-up sequence</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Label>Lead</Label>
                <Select value={seqLeadId} onValueChange={setSeqLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.full_name} — {l.company_name ?? ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>Channel</Label>
                <Select value={seqChannel} onValueChange={setSeqChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  Creates 5 tasks: Day 0, 2, 5, 10, 15.
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    seqLeadId && createSequence.mutate({ leadId: seqLeadId, channel: seqChannel })
                  }
                >
                  Create sequence
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6">
        <Group
          title="Overdue"
          items={grouped.overdue}
          tone="destructive"
          onComplete={(id) => updateStatus.mutate({ id, status: "completed" })}
        />
        <Group
          title="Today"
          items={grouped.today}
          tone="primary"
          onComplete={(id) => updateStatus.mutate({ id, status: "completed" })}
        />
        <Group
          title="Upcoming"
          items={grouped.upcoming}
          tone="muted"
          onComplete={(id) => updateStatus.mutate({ id, status: "completed" })}
        />
        <Group
          title="Completed"
          items={grouped.done.slice(0, 10)}
          tone="success"
          onComplete={() => {}}
          done
        />
      </div>
    </div>
  );
}

function Group({
  title,
  items,
  tone,
  onComplete,
  done,
}: {
  title: string;
  items: any[];
  tone: string;
  onComplete: (id: string) => void;
  done?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4" /> {title}
        <Badge variant="secondary">{items.length}</Badge>
      </h3>
      <ul className="space-y-2">
        {items.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Link
                to="/leads/$id"
                params={{ id: f.lead_id }}
                className="font-medium hover:text-primary"
              >
                {f.leads?.full_name ?? "Lead"}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">{f.leads?.company_name}</span>
              <div className="text-xs text-muted-foreground">
                Step {f.sequence_step} · {f.channel} ·{" "}
                {format(new Date(f.scheduled_for), "MMM d, h:mm a")}
              </div>
              {f.message && <div className="mt-1 text-xs">{f.message}</div>}
            </div>
            {!done && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => onComplete(f.id)}
              >
                <CheckCircle2 className="h-4 w-4" /> Mark done
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
