import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/PageHeader";
import { STATUS_ORDER, STATUS_LABEL, TempBadge } from "@/lib/leadEnums";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: Pipeline,
});

function Pipeline() {
  const qc = useQueryClient();
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () =>
      (await supabase.from("leads").select("*").order("updated_at", { ascending: false })).data ??
      [],
  });

  const onDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const { error } = await supabase
      .from("leads")
      .update({ status: status as Lead["status"] })
      .eq("id", id);
    if (error) return toast.error(error.message);
    const user = await getSessionUser();
    const lead = leads.find((item) => item.id === id);
    await supabase.from("activities").insert({
      user_id: user.id,
      lead_id: id,
      activity_type: "pipeline_move",
      title: `Moved ${lead?.company_name ?? lead?.full_name ?? "lead"} to ${STATUS_LABEL[status as keyof typeof STATUS_LABEL]}`,
    });
    toast.success(`Moved to ${STATUS_LABEL[status as keyof typeof STATUS_LABEL]}`);
    qc.invalidateQueries();
  };

  return (
    <div>
      <PageHeader title="Sales Pipeline" description="Drag and drop leads across stages." />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="flex gap-4" style={{ minWidth: STATUS_ORDER.length * 280 + "px" }}>
            {STATUS_ORDER.map((status) => {
              const colLeads = leads.filter((l) => l.status === status);
              return (
                <div
                  key={status}
                  className="flex w-[260px] shrink-0 flex-col rounded-2xl bg-muted/40 p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, status)}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium">
                      {colLeads.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {colLeads.map((l: Lead) => (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                        className="cursor-grab rounded-xl border bg-card p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
                      >
                        <Link to="/leads/$id" params={{ id: l.id }}>
                          <div className="text-sm font-medium">{l.full_name}</div>
                          {l.company_name && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {l.company_name}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <TempBadge temp={l.temperature} />
                            <span className="text-xs font-mono">{l.lead_score}</span>
                          </div>
                        </Link>
                      </div>
                    ))}
                    {colLeads.length === 0 && (
                      <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
