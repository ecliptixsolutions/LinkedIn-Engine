import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Download, Upload, Filter, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, TempBadge, STATUS_ORDER, STATUS_LABEL } from "@/lib/leadEnums";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        (statusFilter === "all" || l.status === statusFilter) &&
        (q === "" ||
          [l.full_name, l.company_name, l.email, l.industry]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(q))),
    );
  }, [leads, search, statusFilter]);

  const createLead = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const user = await getSessionUser();
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...payload, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("activities").insert({
        user_id: user.id,
        lead_id: data.id,
        activity_type: "lead_created",
        title: "Lead added",
        description: data.company_name ?? data.full_name,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Lead added");
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const cols = [
      "full_name",
      "company_name",
      "industry",
      "email",
      "phone",
      "website_url",
      "status",
      "lead_score",
      "temperature",
      "created_at",
    ];
    const rows = [cols.join(",")].concat(
      filtered.map((l) => cols.map((c) => JSON.stringify((l as any)[c] ?? "")).join(",")),
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Leads CRM"
        description="Manage your full pipeline of prospects and opportunities."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> New lead
                </Button>
              </DialogTrigger>
              <LeadDialog onSubmit={(p) => createLead.mutate(p)} loading={createLead.isPending} />
            </Dialog>
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, company, email…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No leads yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first lead to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Temp</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        to="/leads/$id"
                        params={{ id: l.id }}
                        className="font-medium hover:text-primary"
                      >
                        {l.full_name}
                      </Link>
                      {l.email && <div className="text-xs text-muted-foreground">{l.email}</div>}
                    </td>
                    <td className="px-4 py-3">{l.company_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.industry ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{l.lead_score}</td>
                    <td className="px-4 py-3">
                      <TempBadge temp={l.temperature} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/leads/$id" params={{ id: l.id }}>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function LeadDialog({
  onSubmit,
  loading,
}: {
  onSubmit: (p: Record<string, any>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    industry: "",
    job_title: "",
    email: "",
    phone: "",
    website_url: "",
    linkedin_url: "",
    location: "",
    company_size: "",
    lead_source: "Manual",
    notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>New Lead</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.full_name) return;
          onSubmit(form);
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div>
          <Label>Full name *</Label>
          <Input
            required
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </div>
        <div>
          <Label>Company</Label>
          <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
        </div>
        <div>
          <Label>Industry</Label>
          <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} />
        </div>
        <div>
          <Label>Job title</Label>
          <Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label>Website</Label>
          <Input
            value={form.website_url}
            onChange={(e) => set("website_url", e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div>
          <Label>LinkedIn</Label>
          <Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
        </div>
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div>
          <Label>Company size</Label>
          <Input
            value={form.company_size}
            onChange={(e) => set("company_size", e.target.value)}
            placeholder="e.g. 11-50"
          />
        </div>
        <div>
          <Label>Source</Label>
          <Input value={form.lead_source} onChange={(e) => set("lead_source", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <DialogFooter className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save lead"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
