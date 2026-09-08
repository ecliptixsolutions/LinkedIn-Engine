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
import { Plus, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/meetings")({
  component: Meetings,
});

const STATUSES = ["scheduled", "completed", "rescheduled", "cancelled"] as const;

function Meetings() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () =>
      (
        await supabase
          .from("meetings")
          .select("*, leads(full_name, company_name)")
          .order("scheduled_at", { ascending: false })
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
      const { error } = await supabase.from("meetings").insert({ ...p, user_id: user.id });
      if (error) throw error;
      await supabase
        .from("leads")
        .update({ status: "meeting_scheduled", meeting_date: p.scheduled_at })
        .eq("id", p.lead_id);
      await supabase.from("activities").insert({
        user_id: user.id,
        lead_id: p.lead_id,
        activity_type: "meeting_scheduled",
        title: `Scheduled meeting: ${p.title}`,
        description: p.scheduled_at,
      });
    },
    onSuccess: () => {
      toast.success("Meeting saved");
      setOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: any) => {
      const { error } = await supabase.from("meetings").update(patch).eq("id", id);
      if (error) throw error;
      const meeting = items.find((item: any) => item.id === id);
      const user = await getSessionUser();
      if (meeting) {
        await supabase.from("activities").insert({
          user_id: user.id,
          lead_id: meeting.lead_id,
          activity_type: "meeting_status",
          title: `Meeting marked ${patch.status}`,
        });
      }
    },
    onSuccess: () => {
      toast.success("Meeting updated");
      qc.invalidateQueries();
    },
  });

  const [f, setF] = useState({
    lead_id: "",
    title: "",
    scheduled_at: "",
    duration_minutes: 30,
    notes: "",
  });

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Track every scheduled call and outcome."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Schedule meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule meeting</DialogTitle>
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
                  <Input
                    value={f.title}
                    onChange={(e) => setF({ ...f, title: e.target.value })}
                    placeholder="Discovery call"
                  />
                </div>
                <div>
                  <Label>Date & time</Label>
                  <Input
                    type="datetime-local"
                    value={f.scheduled_at}
                    onChange={(e) => setF({ ...f, scheduled_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    value={f.duration_minutes}
                    onChange={(e) => setF({ ...f, duration_minutes: Number(e.target.value) })}
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
                    f.scheduled_at &&
                    create.mutate({ ...f, scheduled_at: new Date(f.scheduled_at).toISOString() })
                  }
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="p-5">
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Calendar className="mx-auto mb-2 h-8 w-8" />
            No meetings yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((m: any) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <Link
                    to="/leads/$id"
                    params={{ id: m.lead_id }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {m.leads?.full_name} · {m.leads?.company_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(m.scheduled_at), "EEE MMM d, h:mm a")} · {m.duration_minutes}m
                  </div>
                </div>
                <Select
                  value={m.status}
                  onValueChange={(v) => update.mutate({ id: m.id, patch: { status: v } })}
                >
                  <SelectTrigger className="w-[160px]">
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
