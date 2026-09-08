import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadTemp = Database["public"]["Enums"]["lead_temp"];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  follow_up: "Follow-Up",
  meeting_scheduled: "Meeting",
  proposal_sent: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};
export const STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "interested",
  "follow_up",
  "meeting_scheduled",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-slate-100 text-slate-700 border-slate-200",
  interested: "bg-violet-100 text-violet-700 border-violet-200",
  follow_up: "bg-amber-100 text-amber-700 border-amber-200",
  meeting_scheduled: "bg-cyan-100 text-cyan-700 border-cyan-200",
  proposal_sent: "bg-indigo-100 text-indigo-700 border-indigo-200",
  negotiation: "bg-orange-100 text-orange-700 border-orange-200",
  won: "bg-green-100 text-green-700 border-green-200",
  lost: "bg-rose-100 text-rose-700 border-rose-200",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const TEMP_TONE: Record<LeadTemp, string> = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
  disqualified: "bg-zinc-100 text-zinc-500 border-zinc-200",
};
export const TEMP_LABEL: Record<LeadTemp, string> = {
  hot: "🔥 Hot",
  warm: "Warm",
  low: "Low",
  disqualified: "Disqualified",
};

export function TempBadge({ temp }: { temp: LeadTemp }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TEMP_TONE[temp])}>
      {TEMP_LABEL[temp]}
    </Badge>
  );
}

export function scoreToTemp(score: number): LeadTemp {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  if (score >= 40) return "low";
  return "disqualified";
}
