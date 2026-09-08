import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { Copy, ExternalLink, Loader2, MessageSquare, Send, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createLinkedInMessageCampaign } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/messages")({
  component: Messages,
});

const DEFAULT_TEMPLATE =
  "Hi {first_name}, I came across {company_name} while researching {industry} businesses in {location}. I have a few practical ideas that may help improve your lead follow-up process. Would you be open to a short conversation?";

function Messages() {
  const qc = useQueryClient();
  const createCampaign = useServerFn(createLinkedInMessageCampaign);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [createFollowUps, setCreateFollowUps] = useState(true);

  const { data: items = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: async () =>
      (
        await supabase
          .from("messages")
          .select("*, leads(full_name, company_name, linkedin_url)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: leads = [] } = useQuery({
    queryKey: ["campaign-leads"],
    queryFn: async () =>
      (
        await supabase
          .from("leads")
          .select("id, full_name, company_name, linkedin_url")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const campaign = useMutation({
    mutationFn: () =>
      createCampaign({
        data: { leadIds: leads.map((lead) => lead.id), template, createFollowUps },
      }),
    onSuccess: ({ count, followUpsCreated }) => {
      toast.success(
        `Prepared ${count} personalized messages${followUpsCreated ? " and follow-ups" : ""}`,
      );
      qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="LinkedIn Outreach"
        description="Prepare personalized campaigns, then review and send each message from LinkedIn."
      />

      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4 text-primary" /> Campaign to all CRM leads
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Creates one message per lead. Use placeholders to personalize the same campaign.
            </p>
          </div>
          <Badge variant="outline">{leads.length} leads</Badge>
        </div>
        <Label>Message template</Label>
        <Textarea value={template} onChange={(event) => setTemplate(event.target.value)} rows={5} />
        <div className="mt-2 text-xs text-muted-foreground">
          Available: {"{first_name}"}, {"{full_name}"}, {"{company_name}"}, {"{industry}"},{" "}
          {"{location}"}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={createFollowUps}
              onCheckedChange={(value) => setCreateFollowUps(value === true)}
            />
            Create pending LinkedIn follow-ups
          </label>
          <Button
            className="ml-auto"
            disabled={!leads.length || template.trim().length < 10 || campaign.isPending}
            onClick={() => campaign.mutate()}
          >
            {campaign.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Prepare campaign
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
          <p className="font-medium">No messages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import leads, then prepare a campaign or generate outreach from a lead detail page.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((message) => (
            <Card key={message.id} className="p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <Link
                    to="/leads/$id"
                    params={{ id: message.lead_id }}
                    className="font-medium hover:text-primary"
                  >
                    {message.leads?.full_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {message.leads?.company_name} ·{" "}
                    {format(new Date(message.created_at), "MMM d, h:mm a")}
                  </div>
                </div>
                <Badge variant="outline">{message.message_type.replace(/_/g, " ")}</Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!message.leads?.linkedin_url}
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    window.open(message.leads?.linkedin_url ?? "", "_blank", "noopener,noreferrer");
                    toast.success("Copied message and opened LinkedIn profile");
                  }}
                >
                  <ExternalLink className="mr-1 h-3 w-3" /> Open LinkedIn
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
