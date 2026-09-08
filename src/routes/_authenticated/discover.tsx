import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ExcelJS from "exceljs";
import { useMemo, useState } from "react";
import {
  Check,
  Download,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getSessionUser, supabase } from "@/integrations/supabase/client";
import {
  discoverBusinesses,
  enrichBusinesses,
  type DiscoveredLead,
} from "@/lib/discovery.functions";

export const Route = createFileRoute("/_authenticated/discover")({
  component: DiscoverLeads,
});

const EXAMPLES = [
  "Dermatologist",
  "Dentist",
  "Restaurant",
  "Scrap metal supplier",
  "Software company",
  "Marketing agency",
];
type DiscoverySource = "linkedin" | "google_maps";

function DiscoverLeads() {
  const discover = useServerFn(discoverBusinesses);
  const enrich = useServerFn(enrichBusinesses);
  const qc = useQueryClient();
  const [category, setCategory] = useState("Dermatologist");
  const [location, setLocation] = useState("Mumbai, India");
  const [source, setSource] = useState<DiscoverySource>("linkedin");
  const [resultSource, setResultSource] = useState<DiscoverySource>("linkedin");
  const [limit, setLimit] = useState("50");
  const [allAvailable, setAllAvailable] = useState(false);
  const [results, setResults] = useState<DiscoveredLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyPhone, setOnlyPhone] = useState(false);
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [onlyHighFit, setOnlyHighFit] = useState(false);
  const [onlyRecentSignal, setOnlyRecentSignal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const filtered = useMemo(
    () =>
      results.filter(
        (lead) =>
          (!onlyPhone || lead.phone) &&
          (!onlyEmail || lead.email) &&
          (!onlyHighFit || (lead.relevance_score ?? 0) >= 80) &&
          (!onlyRecentSignal || lead.is_recent_signal),
      ),
    [onlyEmail, onlyHighFit, onlyPhone, onlyRecentSignal, results],
  );

  const selectedLeads = results.filter((lead) => selected.has(lead.discovery_id));
  const withPhone = results.filter((lead) => lead.phone).length;
  const withEmail = results.filter((lead) => lead.email).length;
  const withWebsite = results.filter((lead) => lead.website_url).length;
  const highFit = results.filter((lead) => (lead.relevance_score ?? 0) >= 80).length;
  const recentSignals = results.filter((lead) => lead.is_recent_signal).length;

  const searchMutation = useMutation({
    mutationFn: () =>
      discover({
        data: {
          source,
          category,
          location,
          limit: allAvailable ? null : Number(limit),
        },
      }),
    onSuccess: (items) => {
      setResults(items);
      setResultSource(source);
      setSelected(new Set(items.map((item) => item.discovery_id)));
      const sourceLabel = source === "linkedin" ? "LinkedIn" : "Google Maps";
      if (items.length) toast.success(`Found ${items.length} ${sourceLabel} leads`);
      else
        toast.error(
          `No ${sourceLabel} results matched this category and location. Try a broader category, nearby city, or country.`,
        );
    },
    onError: (error: Error) => toast.error(friendlyDiscoveryError(error)),
  });

  const enrichMutation = useMutation({
    mutationFn: () => enrich({ data: { leads: selectedLeads.slice(0, 10) } }),
    onSuccess: (items) => {
      const updates = new Map(items.map((item) => [item.discovery_id, item]));
      setResults((current) => current.map((item) => updates.get(item.discovery_id) ?? item));
      toast.success(`Enriched ${items.length} selected leads`);
    },
    onError: (error: Error) => toast.error(friendlyDiscoveryError(error)),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const user = await getSessionUser();

      const { data: existing, error: existingError } = await supabase
        .from("leads")
        .select("website_url, email, phone");
      if (existingError) throw existingError;

      const existingKeys = new Set(
        (existing ?? [])
          .flatMap((lead) => [
            lead.website_url ? `website:${normalize(lead.website_url)}` : "",
            lead.email ? `email:${normalize(lead.email)}` : "",
            lead.phone ? `phone:${normalizePhone(lead.phone)}` : "",
          ])
          .filter(Boolean),
      );

      const rows = selectedLeads
        .filter((lead) => {
          const keys = [
            lead.website_url ? `website:${normalize(lead.website_url)}` : "",
            lead.email ? `email:${normalize(lead.email)}` : "",
            lead.phone ? `phone:${normalizePhone(lead.phone)}` : "",
          ].filter(Boolean);
          return !keys.some((key) => existingKeys.has(key));
        })
        .map((lead) => ({
          user_id: user.id,
          full_name: lead.full_name,
          company_name: lead.company_name,
          industry: lead.industry,
          email: lead.email,
          phone: lead.phone,
          website_url: lead.website_url,
          linkedin_url:
            lead.contact_source_url?.includes("linkedin.com") ||
            lead.source_url.includes("linkedin.com")
              ? (lead.contact_source_url ?? lead.source_url)
              : null,
          location: lead.location,
          lead_source: resultSource === "linkedin" ? "LinkedIn via Apify" : "Google Maps via Apify",
          lead_score: lead.lead_score,
          temperature:
            lead.lead_score >= 90
              ? ("hot" as const)
              : lead.lead_score >= 70
                ? ("warm" as const)
                : ("low" as const),
          tags: [
            ...lead.services,
            "discovered",
            lead.is_recent_signal ? "recent-signal" : "",
            (lead.relevance_score ?? 0) >= 80 ? "high-fit" : "",
          ].filter(Boolean),
          notes: `${lead.notes}\nFit: ${lead.relevance_score ?? "Not scored"} - ${lead.relevance_reason ?? "No relevance reason available"}\nConfidence: ${lead.data_confidence ?? "low"}\nFreshness: ${lead.freshness_signal ?? "No public age signal found"}\nSource: ${lead.source_url}${lead.contact_source_url ? `\nContact source: ${lead.contact_source_url}` : ""}`,
        }));

      if (!rows.length)
        throw new Error("All selected leads already exist or have no unique contact fields.");
      const { error } = await supabase.from("leads").insert(rows);
      if (error) throw error;
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "lead_import",
        title: `Imported ${rows.length} discovered leads`,
        description: `${category} in ${location}`,
        metadata: { category, location, source: resultSource, count: rows.length },
      });
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} leads into CRM`);
      qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(friendlyDiscoveryError(error)),
  });

  const toggle = (id: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const lead of filtered) {
        if (checked) next.add(lead.discovery_id);
        else next.delete(lead.discovery_id);
      }
      return next;
    });
  };

  const exportWorkbook = async () => {
    if (!results.length) return toast.error("No discovery results to export");
    setIsExporting(true);
    try {
      const enriched: DiscoveredLead[] = [];
      for (let index = 0; index < results.length; index += 10) {
        enriched.push(...(await enrich({ data: { leads: results.slice(index, index + 10) } })));
      }
      setResults(enriched);
      await downloadWorkbook(enriched, category, location);
      toast.success("Multi-sheet Excel workbook exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workbook export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Discover Leads"
        description="Find leads from LinkedIn or Google Maps through your secured Apify Actors and import them into the CRM."
      />

      <Card className="mb-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[190px_1fr_1fr_190px_auto] lg:items-end">
          <div>
            <Label>Data source</Label>
            <Select value={source} onValueChange={(value) => setSource(value as DiscoverySource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="google_maps">Google Maps</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Business category</Label>
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Dermatologist"
            />
          </div>
          <div>
            <Label>City, state, or country</Label>
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Mumbai, India"
            />
          </div>
          <div>
            <Label>{source === "linkedin" ? "LinkedIn" : "Google Maps"} results</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={200}
                value={limit}
                disabled={allAvailable}
                onChange={(event) => setLimit(event.target.value)}
              />
              <Button
                type="button"
                variant={allAvailable ? "default" : "outline"}
                onClick={() => setAllAvailable((current) => !current)}
              >
                All
              </Button>
            </div>
          </div>
          <Button
            onClick={() => searchMutation.mutate()}
            disabled={
              !category.trim() ||
              !location.trim() ||
              (!allAvailable && (Number(limit) < 1 || Number(limit) > 200)) ||
              searchMutation.isPending
            }
          >
            {searchMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search {source === "linkedin" ? "LinkedIn" : "Google Maps"}
          </Button>
        </div>
        {source === "google_maps" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Google Maps usually provides business phone, website, address, category, and ratings.
            Use "Enrich selected" after discovery to search company websites for public emails.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Button key={example} size="sm" variant="outline" onClick={() => setCategory(example)}>
              {example}
            </Button>
          ))}
        </div>
      </Card>

      {results.length > 0 && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Discovered" value={results.length} icon={MapPin} tone="primary" />
            <StatCard label="With Phone" value={withPhone} icon={Phone} tone="success" />
            <StatCard label="With Email" value={withEmail} icon={Mail} tone="warning" />
            <StatCard label="With Website" value={withWebsite} icon={Globe2} />
            <StatCard label="High Fit" value={highFit} icon={Check} tone="success" />
            <StatCard label="Recent Signal" value={recentSignals} icon={Sparkles} tone="warning" />
          </div>

          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <FilterSwitch
                label="Only with phone"
                checked={onlyPhone}
                onCheckedChange={setOnlyPhone}
              />
              <FilterSwitch
                label="Only with email"
                checked={onlyEmail}
                onCheckedChange={setOnlyEmail}
              />
              <FilterSwitch
                label="High fit"
                checked={onlyHighFit}
                onCheckedChange={setOnlyHighFit}
              />
              <FilterSwitch
                label="Recent signal"
                checked={onlyRecentSignal}
                onCheckedChange={setOnlyRecentSignal}
              />
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" onClick={exportWorkbook} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export Excel
                </Button>
                <Button
                  variant="outline"
                  disabled={!selectedLeads.length || enrichMutation.isPending}
                  onClick={() => enrichMutation.mutate()}
                >
                  {enrichMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Enrich selected {selectedLeads.length > 10 ? "(first 10)" : ""}
                </Button>
                <Button
                  disabled={!selectedLeads.length || importMutation.isPending}
                  onClick={() => importMutation.mutate()}
                >
                  {importMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Import selected
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      <Checkbox
                        checked={
                          filtered.length > 0 &&
                          filtered.every((lead) => selected.has(lead.discovery_id))
                        }
                        onCheckedChange={(value) => toggleAll(value === true)}
                        aria-label="Select visible leads"
                      />
                    </th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Services</th>
                    <th className="px-4 py-3">Fit</th>
                    <th className="px-4 py-3">Freshness</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Best approach</th>
                    <th className="px-4 py-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr key={lead.discovery_id} className="border-b align-top hover:bg-muted/20">
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selected.has(lead.discovery_id)}
                          onCheckedChange={(value) => toggle(lead.discovery_id, value === true)}
                          aria-label={`Select ${lead.company_name}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold">{lead.company_name}</div>
                        {lead.website_url && (
                          <a
                            className="mt-1 block max-w-[220px] truncate text-xs text-primary"
                            href={lead.website_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {lead.website_url}
                          </a>
                        )}
                      </td>
                      <td className="max-w-[220px] px-4 py-4 text-muted-foreground">
                        {lead.location}
                      </td>
                      <td className="px-4 py-4">{lead.phone ?? <Missing />}</td>
                      <td className="px-4 py-4">{lead.email ?? <Missing />}</td>
                      <td className="max-w-[240px] px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {lead.services.slice(0, 4).map((service) => (
                            <Badge key={service} variant="secondary">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="max-w-[220px] px-4 py-4">
                        <Score value={lead.relevance_score ?? 0} />
                        <div className="mt-2 text-xs text-muted-foreground">
                          {lead.relevance_reason ?? "Relevance not scored"}
                        </div>
                        <Badge variant="outline" className="mt-2 capitalize">
                          {lead.data_confidence ?? "low"} confidence
                        </Badge>
                      </td>
                      <td className="max-w-[220px] px-4 py-4">
                        <FreshnessBadge lead={lead} />
                      </td>
                      <td className="px-4 py-4">
                        <Score value={lead.lead_score} />
                      </td>
                      <td className="px-4 py-4">{lead.best_approach}</td>
                      <td className="px-4 py-4">
                        <a
                          href={lead.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Listing
                        </a>
                        {lead.contact_source_url && (
                          <a
                            href={lead.contact_source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 text-primary hover:underline"
                          >
                            Contact
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function FilterSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <Label className="mb-0">{label}</Label>
    </div>
  );
}

function Missing() {
  return <span className="text-xs text-muted-foreground">Not found</span>;
}

function Score({ value }: { value: number }) {
  const tone =
    value >= 90
      ? "bg-red-100 text-red-700"
      : value >= 70
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <Badge className={tone}>
      <Check className="mr-1 h-3 w-3" />
      {value}
    </Badge>
  );
}

function FreshnessBadge({ lead }: { lead: DiscoveredLead }) {
  return (
    <div>
      <Badge
        className={
          lead.is_recent_signal ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"
        }
      >
        {lead.is_recent_signal ? "Recent signal" : "No recent proof"}
      </Badge>
      <div className="mt-2 text-xs text-muted-foreground">
        {lead.freshness_signal ?? "No public age signal found"}
      </div>
    </div>
  );
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function friendlyDiscoveryError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/504|gateway time-?out|nginx/i.test(raw)) {
    return "Discovery took too long for the hosted server. Try 10-25 results first, then enrich or export after results load.";
  }

  if (/playwright|browserType|Executable doesn't exist|chromium/i.test(raw)) {
    return "Website enrichment needs the latest server update. Deploy the newest build, then try Enrich selected again.";
  }

  if (/still processing|AbortError|timeout|timed out/i.test(message)) {
    return "Discovery is still processing. Try fewer results first, or check the run in Apify Console.";
  }

  return message || "Discovery failed. Try fewer results or check your Apify settings.";
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function downloadWorkbook(leads: DiscoveredLead[], category: string, location: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ecliptix AI Lead Engine";
  workbook.created = new Date();

  const sorted = [...leads].sort((a, b) => b.lead_score - a.lead_score);
  const summary = workbook.addWorksheet("Summary");
  summary.addRows([
    [`${category} Lead Discovery`, ""],
    [location, ""],
    ["Public-source data - verify contact details before outreach", ""],
    [],
    ["Total leads identified", leads.length],
    ["With phone", leads.filter((lead) => lead.phone).length],
    ["With email", leads.filter((lead) => lead.email).length],
    ["With website", leads.filter((lead) => lead.website_url).length],
    ["High-fit leads", leads.filter((lead) => (lead.relevance_score ?? 0) >= 80).length],
    ["Recent-business signals", leads.filter((lead) => lead.is_recent_signal).length],
    ["Score 80+ (call today)", leads.filter((lead) => lead.lead_score >= 80).length],
    [
      "Score 65-79 (call this week)",
      leads.filter((lead) => lead.lead_score >= 65 && lead.lead_score < 80).length,
    ],
    [],
    ["Top leads to contact first", "Ranked by verified contactability"],
    ...sorted
      .slice(0, 5)
      .map((lead, index) => [
        index + 1,
        `${lead.company_name}${lead.phone ? ` (${lead.phone})` : ""} - Score ${lead.lead_score} - ${lead.best_approach}`,
      ]),
  ]);
  summary.mergeCells("A1:B1");
  summary.mergeCells("A2:B2");
  summary.mergeCells("A3:B3");
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 90;

  const all = workbook.addWorksheet("All Leads");
  all.columns = [
    { header: "#", key: "number", width: 6 },
    { header: "Province/State", key: "province", width: 18 },
    { header: "City", key: "city", width: 18 },
    { header: "Company", key: "company", width: 32 },
    { header: "Phone", key: "phone", width: 22 },
    { header: "Email", key: "email", width: 30 },
    { header: "Website", key: "website", width: 34 },
    { header: "Category / Services", key: "services", width: 32 },
    { header: "Fit Score", key: "fitScore", width: 12 },
    { header: "Fit Reason", key: "fitReason", width: 55 },
    { header: "Data Confidence", key: "confidence", width: 18 },
    { header: "Freshness Signal", key: "freshness", width: 55 },
    { header: "Age Estimate", key: "ageEstimate", width: 18 },
    { header: "Recent Signal", key: "recentSignal", width: 16 },
    { header: "Rating", key: "rating", width: 12 },
    { header: "Reviews", key: "reviews", width: 12 },
    { header: "Score", key: "score", width: 10 },
    { header: "Best Approach", key: "approach", width: 18 },
    { header: "Notes", key: "notes", width: 55 },
    { header: "Source URL", key: "source", width: 34 },
    { header: "Contact Source URL", key: "contactSource", width: 34 },
  ];
  all.addRows(sorted.map((lead, index) => leadWorkbookRow(lead, index)));
  all.autoFilter = { from: "A1", to: "U1" };
  all.views = [{ state: "frozen", ySplit: 1 }];

  const callToday = workbook.addWorksheet("2. Call Today");
  callToday.columns = [
    { header: "#", key: "number", width: 6 },
    { header: "Province/State", key: "province", width: 18 },
    { header: "City", key: "city", width: 18 },
    { header: "Company", key: "company", width: 32 },
    { header: "Phone", key: "phone", width: 22 },
    { header: "Email", key: "email", width: 30 },
    { header: "Website", key: "website", width: 34 },
    { header: "Services", key: "services", width: 32 },
    { header: "Fit Score", key: "fitScore", width: 12 },
    { header: "Freshness Signal", key: "freshness", width: 55 },
    { header: "Score", key: "score", width: 10 },
    { header: "Opening Line", key: "opening", width: 65 },
  ];
  callToday.addRows(
    sorted
      .filter((lead) => lead.phone || lead.email)
      .slice(0, 10)
      .map((lead, index) => ({
        ...leadWorkbookRow(lead, index),
        opening: openingLine(lead),
      })),
  );
  callToday.views = [{ state: "frozen", ySplit: 1 }];

  const byService = workbook.addWorksheet("3. By Service");
  byService.columns = [
    { header: "#", key: "number", width: 6 },
    { header: "Service Focus", key: "service", width: 28 },
    { header: "Province/State", key: "province", width: 18 },
    { header: "City", key: "city", width: 18 },
    { header: "Company", key: "company", width: 32 },
    { header: "Phone", key: "phone", width: 22 },
    { header: "Email", key: "email", width: 30 },
    { header: "Fit Score", key: "fitScore", width: 12 },
    { header: "Score", key: "score", width: 10 },
    { header: "Notes", key: "notes", width: 55 },
  ];
  byService.addRows(
    sorted.flatMap((lead) =>
      lead.services.map((service) => {
        const place = splitLocation(lead.location);
        return {
          service,
          province: place.state,
          city: place.city,
          company: lead.company_name,
          phone: lead.phone ?? "Not found",
          email: lead.email ?? "Not found",
          fitScore: lead.relevance_score ?? "Not scored",
          score: lead.lead_score,
          notes: lead.notes,
        };
      }),
    ),
  );
  byService.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.getCell(1).value = rowNumber - 1;
  });
  byService.views = [{ state: "frozen", ySplit: 1 }];

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
    sheet.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: true };
    });
  }
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  summary.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(3).font = { italic: true, color: { argb: "FFFFFFFF" } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `discovered-${slug(category)}-${Date.now()}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function splitLocation(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    city: parts[0] ?? location,
    state: parts.length >= 3 ? parts.at(-2)! : "Not found",
  };
}

function leadWorkbookRow(lead: DiscoveredLead, index: number) {
  const place = splitLocation(lead.location);
  return {
    number: index + 1,
    province: place.state,
    city: place.city,
    company: lead.company_name,
    phone: lead.phone ?? "Not found",
    email: lead.email ?? "Not found",
    website: lead.website_url ?? "Not found",
    services: lead.services.join(", "),
    fitScore: lead.relevance_score ?? "Not scored",
    fitReason: lead.relevance_reason ?? "No relevance reason available",
    confidence: lead.data_confidence ?? "low",
    freshness: lead.freshness_signal ?? "No public age signal found",
    ageEstimate: lead.business_age_estimate ?? "Not found",
    recentSignal: lead.is_recent_signal ? "Yes" : "No",
    rating: lead.rating ?? "Not found",
    reviews: lead.review_count ?? "Not found",
    score: lead.lead_score,
    approach: lead.best_approach,
    notes: lead.notes,
    source: lead.source_url,
    contactSource: lead.contact_source_url ?? "Not found",
  };
}

function openingLine(lead: DiscoveredLead) {
  const services = lead.services.slice(0, 2).join(" and ").toLowerCase();
  return `Hi, I found ${lead.company_name} while researching ${services} providers in ${lead.location}. I would like to discuss a potential business opportunity. Who is the best person to speak with?`;
}
