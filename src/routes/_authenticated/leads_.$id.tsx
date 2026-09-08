import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeLead, generateMessage } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, TempBadge, STATUS_ORDER, STATUS_LABEL } from "@/lib/leadEnums";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Building2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  MapPin,
  Briefcase,
  Trash2,
  Copy,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/leads_/$id")({
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeLead);
  const genMsg = useServerFn(generateMessage);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["lead-messages", id],
    queryFn: async () =>
      (
        await supabase
          .from("messages")
          .select("*")
          .eq("lead_id", id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["lead-activities", id],
    queryFn: async () =>
      (
        await supabase
          .from("activities")
          .select("*")
          .eq("lead_id", id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["lead-notes", id],
    queryFn: async () =>
      (
        await supabase
          .from("lead_notes")
          .select("*")
          .eq("lead_id", id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const updateField = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await supabase
        .from("leads")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
      const user = await getSessionUser();
      const field = Object.keys(patch)[0] ?? "lead";
      await supabase.from("activities").insert({
        user_id: user.id,
        lead_id: id,
        activity_type: "lead_updated",
        title:
          field === "status"
            ? `Lead status changed to ${String(patch.status).replace(/_/g, " ")}`
            : field === "next_followup_date"
              ? "Next follow-up updated"
              : "Lead details updated",
      });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const deleteLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      qc.invalidateQueries();
      navigate({ to: "/leads" });
    },
  });

  const runAnalysis = useMutation({
    mutationFn: () => analyze({ data: { leadId: id } }),
    onSuccess: () => {
      toast.success("AI analysis complete");
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["lead-activities", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [msgType, setMsgType] = useState("first_outreach");
  const [tone, setTone] = useState("professional");
  const createMsg = useMutation({
    mutationFn: () =>
      genMsg({ data: { leadId: id, messageType: msgType as any, tone: tone as any } }),
    onSuccess: () => {
      toast.success("Message generated");
      qc.invalidateQueries({ queryKey: ["lead-messages", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newNote, setNewNote] = useState("");
  const addNote = useMutation({
    mutationFn: async () => {
      const user = await getSessionUser();
      const { error } = await supabase
        .from("lead_notes")
        .insert({ lead_id: id, user_id: user.id, content: newNote });
      if (error) throw error;
      await supabase.from("activities").insert({
        user_id: user.id,
        lead_id: id,
        activity_type: "note_added",
        title: "Added lead note",
        description: newNote.slice(0, 160),
      });
    },
    onSuccess: () => {
      setNewNote("");
      qc.invalidateQueries();
    },
  });

  if (isLoading || !lead)
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div>
      <Link
        to="/leads"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{lead.full_name}</h1>
          <p className="text-muted-foreground">
            {lead.job_title}
            {lead.job_title && lead.company_name && " at "}
            {lead.company_name}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={lead.status} />
            <TempBadge temp={lead.temperature} />
            <Badge variant="outline">Score: {lead.lead_score}</Badge>
            {lead.recommended_service && (
              <Badge className="bg-[var(--gradient-gold)] text-accent-foreground border-0">
                {lead.recommended_service}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runAnalysis.mutate()}
            disabled={runAnalysis.isPending}
            className="gap-2 shadow-md"
          >
            {runAnalysis.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI Analyze
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (confirm("Delete this lead?")) deleteLead.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* AI Insights */}
          {lead.ai_analysis && (
            <Card className="p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
              </h3>
              <div className="grid gap-3 text-sm">
                {Object.entries(lead.ai_analysis as Record<string, string>).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {k.replace(/_/g, " ")}
                    </div>
                    <div className="mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Opportunities */}
          {Array.isArray(lead.opportunities) && (lead.opportunities as any[]).length > 0 && (
            <Card className="p-6">
              <h3 className="mb-3 font-semibold">Opportunities detected</h3>
              <div className="space-y-2">
                {(lead.opportunities as any[]).map((o, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{o.area}</div>
                      <Badge variant={o.impact === "high" ? "default" : "secondary"}>
                        {o.impact}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-primary">{o.service}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{o.reason}</div>
                  </div>
                ))}
              </div>
              {lead.revenue_potential && (
                <div className="mt-4 rounded-lg bg-success/10 p-3 text-sm">
                  Revenue potential:{" "}
                  <span className="font-bold text-success">
                    ${Number(lead.revenue_potential).toLocaleString()}
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* AI Outreach */}
          <Card className="p-6">
            <h3 className="mb-3 font-semibold">AI Outreach</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select value={msgType} onValueChange={setMsgType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connection_request">LinkedIn connection</SelectItem>
                  <SelectItem value="first_outreach">First outreach</SelectItem>
                  <SelectItem value="follow_up_1">Follow-up #1</SelectItem>
                  <SelectItem value="follow_up_2">Follow-up #2</SelectItem>
                  <SelectItem value="proposal_followup">Proposal follow-up</SelectItem>
                  <SelectItem value="reengagement">Re-engagement</SelectItem>
                  <SelectItem value="meeting_confirmation">Meeting confirmation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => createMsg.mutate()}
                disabled={createMsg.isPending}
                className="gap-2"
              >
                {createMsg.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">No messages generated yet.</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="outline">
                      {m.message_type.replace(/_/g, " ")} · {m.tone}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h3 className="mb-3 font-semibold">Notes</h3>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note…"
              />
              <Button
                onClick={() => newNote.trim() && addNote.mutate()}
                disabled={addNote.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="mt-4 space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border p-3">
                  <p className="text-sm">{n.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(n.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Contact */}
          <Card className="p-6">
            <h3 className="mb-3 font-semibold">Contact</h3>
            <div className="space-y-2 text-sm">
              {lead.company_name && <Row icon={Building2}>{lead.company_name}</Row>}
              {lead.email && (
                <Row icon={Mail}>
                  <a href={`mailto:${lead.email}`} className="hover:text-primary">
                    {lead.email}
                  </a>
                </Row>
              )}
              {lead.phone && <Row icon={Phone}>{lead.phone}</Row>}
              {lead.website_url && (
                <Row icon={Globe}>
                  <a
                    href={lead.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary"
                  >
                    {lead.website_url}
                  </a>
                </Row>
              )}
              {lead.linkedin_url && (
                <Row icon={Linkedin}>
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary"
                  >
                    LinkedIn profile
                  </a>
                </Row>
              )}
              {lead.location && <Row icon={MapPin}>{lead.location}</Row>}
              {lead.industry && <Row icon={Briefcase}>{lead.industry}</Row>}
            </div>
          </Card>

          {/* Update status */}
          <Card className="p-6">
            <h3 className="mb-3 font-semibold">Update status</h3>
            <Select value={lead.status} onValueChange={(v) => updateField.mutate({ status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="mt-4 block">Next follow-up</Label>
            <Input
              type="datetime-local"
              defaultValue={
                lead.next_followup_date
                  ? new Date(lead.next_followup_date).toISOString().slice(0, 16)
                  : ""
              }
              onBlur={(e) =>
                updateField.mutate({
                  next_followup_date: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </Card>

          {/* Activity */}
          <Card className="p-6">
            <h3 className="mb-3 font-semibold">Activity</h3>
            <ul className="space-y-2">
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {activities.slice(0, 8).map((a) => (
                <li key={a.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "MMM d, h:mm a")}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="break-all">{children}</div>
    </div>
  );
}
