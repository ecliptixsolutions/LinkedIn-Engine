import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DiscoveredLead = {
  discovery_id: string;
  full_name: string;
  company_name: string;
  industry: string;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  location: string;
  services: string[];
  lead_score: number;
  best_approach: string;
  notes: string;
  source_url: string;
  contact_source_url: string | null;
  relevance_score?: number;
  relevance_reason?: string;
  data_confidence?: "high" | "medium" | "low";
  freshness_signal?: string;
  business_age_estimate?: string | null;
  is_recent_signal?: boolean;
  rating?: number | null;
  review_count?: number | null;
};

type OsmElement = {
  id: number;
  type: "node" | "way" | "relation";
  tags?: Record<string, string>;
};

const searchInput = z.object({
  source: z.enum(["linkedin", "google_maps"]).default("linkedin"),
  category: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(200).nullable().default(50),
});

const apifySettingsInput = z.object({
  token: z.string().trim().min(10).optional(),
  actorId: z.string().trim().min(3).optional(),
  googleMapsActorId: z.string().trim().min(3).optional(),
});

const enrichInput = z.object({
  leads: z
    .array(
      z.object({
        discovery_id: z.string(),
        full_name: z.string(),
        company_name: z.string(),
        industry: z.string(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        website_url: z.string().nullable(),
        location: z.string(),
        services: z.array(z.string()),
        lead_score: z.number(),
        best_approach: z.string(),
        notes: z.string(),
        source_url: z.string(),
        contact_source_url: z.string().nullable(),
        relevance_score: z.number().optional(),
        relevance_reason: z.string().optional(),
        data_confidence: z.enum(["high", "medium", "low"]).optional(),
        freshness_signal: z.string().optional(),
        business_age_estimate: z.string().nullable().optional(),
        is_recent_signal: z.boolean().optional(),
        rating: z.number().nullable().optional(),
        review_count: z.number().nullable().optional(),
      }),
    )
    .max(10),
});

const USER_AGENT = "EcliptixLeadDiscovery/1.0 (local CRM lead research)";
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const DIRECTORY_DOMAINS = [
  "practo.com",
  "justdial.com",
  "tripadvisor.",
  "zomato.com",
  "restaurant-guru.",
  "google.com",
  "maps.google.",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "scribd.com",
  "exportersindia.com",
  "infobel.com",
  "idbf.in",
  "beststartup.",
  "yelu.",
  "tradeindia.com",
  "dnb.com",
  "companydetails.in",
  "indiacatalog.com",
  "mapsofindia.com",
  "docindia.org",
  "hexahealth.com",
  "whatclinic.com",
  "datagemba.com",
  "lybrate.com",
  "yellowpages.",
  "yappe.in",
  "bestmumbai.in",
];
const GENERIC_RESULT_NAMES = new Set([
  "home",
  "official",
  "contact",
  "contact us",
  "about",
  "about us",
  "welcome",
  "google maps",
]);
const CATEGORY_CONFLICTS: Record<string, RegExp> = {
  restaurant: /\b(clinic|doctor|hospital|dentist|medical|healthcare)\b/i,
  dermatologist: /\b(restaurant|hotel|cafe|software|marketing agency)\b/i,
  dentist: /\b(restaurant|hotel|cafe|software|marketing agency)\b/i,
  "scrap metal supplier": /\b(restaurant|clinic|doctor|hospital|software)\b/i,
};

type ApifyLinkedInItem = Record<string, unknown>;
type LocalApifyConfig = Record<
  string,
  {
    token?: string;
    actorId?: string;
    linkedinActorId?: string;
    googleMapsActorId?: string;
    updatedAt?: string;
  }
>;

const LOCAL_APIFY_CONFIG_FILE = ".ecliptix-secrets.json";
const DEFAULT_GOOGLE_MAPS_ACTOR_ID = "compass~crawler-google-places";
const APIFY_START_WAIT_SECONDS = 25;
const APIFY_SYNC_DEADLINE_MS = 45_000;

function normalizeActorId(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  const match = trimmed.match(/apify\.com\/([^/]+)\/([^/?#]+)/i);
  return match ? `${match[1]}~${match[2]}` : trimmed.replace("/", "~");
}

async function readLocalApifyConfig(): Promise<LocalApifyConfig> {
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(`${process.cwd()}/${LOCAL_APIFY_CONFIG_FILE}`, "utf8"));
  } catch {
    return {};
  }
}

async function writeLocalApifyConfig(config: LocalApifyConfig) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    `${process.cwd()}/${LOCAL_APIFY_CONFIG_FILE}`,
    `${JSON.stringify(config, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

async function readEnvFileValue(name: string) {
  try {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(`${process.cwd()}/.env`, "utf8");
    const line = content.split(/\r?\n/).find((entry) => entry.trimStart().startsWith(`${name}=`));
    return (
      line
        ?.split("=", 2)[1]
        ?.trim()
        .replace(/^["']|["']$/g, "") ?? ""
    );
  } catch {
    return "";
  }
}

async function getApifyConfig(userId: string) {
  const local = (await readLocalApifyConfig())[userId] ?? {};
  const envToken = process.env.APIFY_TOKEN || (await readEnvFileValue("APIFY_TOKEN"));
  const envLinkedInActorId =
    process.env.APIFY_LINKEDIN_ACTOR_ID || (await readEnvFileValue("APIFY_LINKEDIN_ACTOR_ID"));
  const envGoogleMapsActorId =
    process.env.APIFY_GOOGLE_MAPS_ACTOR_ID ||
    (await readEnvFileValue("APIFY_GOOGLE_MAPS_ACTOR_ID"));
  const rawLinkedInActorId = local.linkedinActorId || local.actorId || envLinkedInActorId || "";
  const rawGoogleMapsActorId =
    local.googleMapsActorId || envGoogleMapsActorId || DEFAULT_GOOGLE_MAPS_ACTOR_ID;
  return {
    token: local.token || envToken || "",
    linkedinActorId: rawLinkedInActorId ? normalizeActorId(rawLinkedInActorId) : "",
    googleMapsActorId: normalizeActorId(rawGoogleMapsActorId),
    source:
      local.token || local.actorId || local.linkedinActorId || local.googleMapsActorId
        ? ("settings" as const)
        : ("environment" as const),
  };
}

function stringValue(item: ApifyLinkedInItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function arrayValue(item: ApifyLinkedInItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (Array.isArray(value)) {
      return value
        .map((entry) =>
          typeof entry === "string"
            ? entry
            : entry && typeof entry === "object"
              ? stringValue(entry as ApifyLinkedInItem, "name", "title", "text")
              : null,
        )
        .filter((entry): entry is string => Boolean(entry));
    }
  }
  return [];
}

function firstArrayString(item: ApifyLinkedInItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (Array.isArray(value)) {
      const found = value.find((entry) => typeof entry === "string" && entry.trim());
      if (typeof found === "string") return found.trim();
    }
  }
  return null;
}

function numberValue(item: ApifyLinkedInItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function objectValue(item: ApifyLinkedInItem, key: string) {
  const value = item[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApifyLinkedInItem)
    : null;
}

function firstObjectValue(item: ApifyLinkedInItem, key: string) {
  const value = item[key];
  const first = Array.isArray(value) ? value[0] : null;
  return first && typeof first === "object" ? (first as ApifyLinkedInItem) : null;
}

function apifyInput(category: string, location: string, limit: number | null) {
  const query = category.trim();
  const requestedLimit = Math.min(limit ?? 50, 200);
  const template = process.env.APIFY_LINKEDIN_INPUT_JSON;
  if (template) {
    try {
      return JSON.parse(
        template
          .replaceAll("{query}", query)
          .replaceAll("{category}", category)
          .replaceAll("{location}", location)
          .replaceAll("{limit}", String(requestedLimit)),
      ) as Record<string, unknown>;
    } catch {
      throw new Error("APIFY_LINKEDIN_INPUT_JSON is not valid JSON after placeholders are applied");
    }
  }
  return {
    searchQuery: query,
    locations: [location],
    maxItems: requestedLimit,
    profileScraperMode: "Full + email search",
    autoQuerySegmentation: false,
    takePages: Math.min(8, Math.max(1, Math.ceil(requestedLimit / 25))),
  };
}

function googleMapsInput(category: string, location: string, limit: number | null) {
  const requestedLimit = Math.min(limit ?? 50, 100);
  const input: Record<string, unknown> = {
    searchStringsArray: [category.trim()],
    locationQuery: location.trim(),
    language: "en",
    scrapeContacts: false,
    maxReviews: 0,
    maxImages: 0,
    maximumLeadsEnrichmentRecords: 0,
    maxCrawledPlacesPerSearch: requestedLimit,
  };
  return input;
}

function dateValue(item: ApifyLinkedInItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) return new Date(timestamp);
      const year = value.match(/\b(20\d{2}|19\d{2})\b/)?.[1];
      if (year) return new Date(Number(year), 0, 1);
    }
    if (typeof value === "number" && value > 1900 && value < 3000) {
      return new Date(value, 0, 1);
    }
  }
  return null;
}

function monthsSince(date: Date) {
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
}

function freshnessFromItem(
  item: ApifyLinkedInItem,
  reviewCount: number | null,
  fallback = "No public age signal found",
) {
  const date = dateValue(
    item,
    "firstReviewDate",
    "firstReviewAt",
    "openingDate",
    "openedDate",
    "startedAt",
    "createdAt",
    "dateCreated",
    "publishedAt",
    "foundedOn",
    "foundedDate",
    "founded",
    "foundedYear",
  );
  if (date) {
    const months = monthsSince(date);
    const label = months <= 1 ? "about 1 month" : `${Math.max(months, 0)} months`;
    return {
      freshness_signal:
        months <= 6
          ? `Likely recent: public source date is ${label} old`
          : `Established signal: public source date is ${label} old`,
      business_age_estimate: label,
      is_recent_signal: months <= 6,
    };
  }

  if (typeof reviewCount === "number" && reviewCount >= 0 && reviewCount <= 10) {
    return {
      freshness_signal:
        "Possible recent business: low public review footprint. Verify opening date before outreach.",
      business_age_estimate: null,
      is_recent_signal: true,
    };
  }

  return {
    freshness_signal: fallback,
    business_age_estimate: null,
    is_recent_signal: false,
  };
}

function leadQualitySignals(lead: DiscoveredLead, category: string, requestedLocation: string) {
  const haystack = [
    lead.company_name,
    lead.industry,
    lead.location,
    lead.services.join(" "),
    lead.notes,
  ]
    .join(" ")
    .toLowerCase();
  const categoryTerms = category
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  const matchedTerms = categoryTerms.filter((term) => haystack.includes(term));
  const city = requestedLocation.split(",")[0]?.trim().toLowerCase();
  const locationMatched = Boolean(city && lead.location.toLowerCase().includes(city));
  const sourceMatched = /linkedin|google maps|openstreetmap|public web search/i.test(lead.notes);
  const relevanceScore = Math.min(
    100,
    45 +
      matchedTerms.length * 15 +
      (lead.services.some((service) => service.toLowerCase().includes(category.toLowerCase()))
        ? 20
        : 0) +
      (locationMatched ? 15 : 0) +
      (sourceMatched ? 5 : 0),
  );
  const dataPoints = [
    lead.phone,
    lead.email,
    lead.website_url,
    lead.location,
    lead.source_url,
  ].filter(Boolean).length;
  const dataConfidence = dataPoints >= 4 ? "high" : dataPoints >= 3 ? "medium" : "low";
  const reasons = [
    matchedTerms.length ? `Matched ${matchedTerms.join(", ")}` : `Category needs manual review`,
    locationMatched ? `Location matches ${requestedLocation}` : "Location should be verified",
    lead.phone || lead.email ? "Has direct contact data" : "Needs contact enrichment",
  ];

  return {
    relevance_score: relevanceScore,
    relevance_reason: reasons.join("; "),
    data_confidence: dataConfidence,
  } satisfies Pick<DiscoveredLead, "relevance_score" | "relevance_reason" | "data_confidence">;
}

function applyLeadQuality(
  lead: DiscoveredLead,
  category: string,
  requestedLocation: string,
  freshness: Pick<
    DiscoveredLead,
    "freshness_signal" | "business_age_estimate" | "is_recent_signal"
  >,
) {
  Object.assign(lead, leadQualitySignals(lead, category, requestedLocation), freshness);
  lead.lead_score = scoreLead(lead);
  lead.best_approach = bestApproach(lead.email, lead.phone);
  return lead;
}

function linkedinLead(item: ApifyLinkedInItem, category: string, location: string, index: number) {
  const currentPosition = firstObjectValue(item, "currentPositions");
  const itemLocationObject = objectValue(item, "location");
  const profileUrl = stringValue(
    item,
    "linkedinUrl",
    "linkedin_url",
    "profileUrl",
    "profile_url",
    "url",
  );
  const companyUrl = stringValue(
    item,
    "companyLinkedinUrl",
    "companyLinkedInUrl",
    "companyUrl",
    "company_url",
  );
  const firstName = stringValue(item, "firstName", "first_name");
  const lastName = stringValue(item, "lastName", "last_name");
  const fullName =
    stringValue(item, "fullName", "full_name", "name", "title") ??
    ([firstName, lastName].filter(Boolean).join(" ") || `LinkedIn lead ${index + 1}`);
  const company =
    stringValue(item, "companyName", "company_name", "company", "organizationName") ??
    (currentPosition ? stringValue(currentPosition, "companyName", "company") : null) ??
    fullName;
  const email = stringValue(item, "email", "emailAddress", "workEmail");
  const phone = stringValue(item, "phone", "phoneNumber", "mobile", "mobileNumber");
  const website = normalizeWebsite(
    stringValue(item, "website", "websiteUrl", "companyWebsite") ?? undefined,
  );
  const itemLocation =
    stringValue(item, "location", "geoLocation", "address", "city", "country") ??
    (itemLocationObject ? stringValue(itemLocationObject, "linkedinText", "text", "name") : null) ??
    location;
  const headline =
    stringValue(item, "headline", "jobTitle", "job_title", "position") ??
    (currentPosition ? stringValue(currentPosition, "title", "jobTitle") : null);
  const services = [
    category,
    ...arrayValue(item, "skills", "specialties", "services", "industries"),
  ].filter(Boolean);
  const sourceUrl = profileUrl ?? companyUrl ?? website;
  if (!sourceUrl) return null;

  const lead: DiscoveredLead = {
    discovery_id:
      stringValue(item, "id", "profileId", "urn") ?? `linkedin-${normalize(sourceUrl)}-${index}`,
    full_name: fullName,
    company_name: company,
    industry: stringValue(item, "industry") ?? category,
    email,
    phone,
    website_url: website,
    location: itemLocation,
    services: [...new Set(services)].slice(0, 8),
    lead_score: 0,
    best_approach: "",
    notes: `Discovered from LinkedIn via Apify${headline ? `. ${headline}` : ""}. Verify contact details and outreach permissions.`,
    source_url: sourceUrl,
    contact_source_url: profileUrl,
  };
  return applyLeadQuality(lead, category, location, freshnessFromItem(item, null));
}

async function discoverFromApifyLinkedIn(
  category: string,
  location: string,
  limit: number | null,
  userId: string,
) {
  const { token, linkedinActorId } = await getApifyConfig(userId);
  if (!token || !linkedinActorId) {
    throw new Error(
      "Apify LinkedIn connector is not configured. Open Settings and save your Apify token and Actor ID.",
    );
  }

  const items = await runApifyActor(
    token,
    linkedinActorId,
    apifyInput(category, location, limit),
    limit,
    "LinkedIn",
  );
  const leads = items
    .slice(0, limit ?? undefined)
    .map((item, index) => linkedinLead(item, category, location, index))
    .filter((lead): lead is DiscoveredLead => Boolean(lead));
  return [...new Map(leads.map((lead) => [lead.discovery_id, lead])).values()];
}

async function runApifyActor(
  token: string,
  actorId: string,
  input: Record<string, unknown>,
  limit: number | null,
  label: string,
) {
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=${APIFY_START_WAIT_SECONDS}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(35_000),
    },
  );
  if (!runResponse.ok) {
    const details = await runResponse.text();
    throw new Error(
      `Apify ${label} Actor failed (${runResponse.status}): ${details.slice(0, 300)}`,
    );
  }

  type ActorRun = {
    id: string;
    status: string;
    defaultDatasetId: string;
    statusMessage?: string;
  };
  let run = ((await runResponse.json()) as { data: ActorRun }).data;
  const deadline = Date.now() + APIFY_SYNC_DEADLINE_MS;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
    if (Date.now() > deadline) {
      throw new Error(
        `Apify ${label} is still processing. Try 10-25 results first, or wait a minute and check the run in Apify Console.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!statusResponse.ok)
      throw new Error(`Could not read Apify run status (${statusResponse.status}).`);
    run = ((await statusResponse.json()) as { data: ActorRun }).data;
  }
  if (run.status !== "SUCCEEDED") {
    throw new Error(
      `Apify run ${run.status.toLowerCase()}: ${run.statusMessage ?? "No details provided"}`,
    );
  }

  const items: ApifyLinkedInItem[] = [];
  const pageSize = 1000;
  while (limit === null || items.length < limit) {
    const datasetUrl = new URL(
      `https://api.apify.com/v2/datasets/${encodeURIComponent(run.defaultDatasetId)}/items`,
    );
    datasetUrl.searchParams.set("format", "json");
    datasetUrl.searchParams.set("clean", "true");
    datasetUrl.searchParams.set("offset", String(items.length));
    datasetUrl.searchParams.set(
      "limit",
      String(limit === null ? pageSize : Math.min(pageSize, limit - items.length)),
    );
    const response = await fetch(datasetUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Could not read Apify dataset (${response.status}): ${details.slice(0, 300)}`,
      );
    }
    const page = (await response.json()) as ApifyLinkedInItem[];
    items.push(...page);
    if (page.length < pageSize || page.length === 0) break;
  }

  return items;
}

function googleMapsLead(
  item: ApifyLinkedInItem,
  category: string,
  location: string,
  index: number,
) {
  const contacts = objectValue(item, "contacts");
  const company =
    stringValue(item, "title", "name", "companyName", "company_name") ??
    `Google Maps business ${index + 1}`;
  const website = normalizeWebsite(stringValue(item, "website", "websiteUrl") ?? undefined);
  const sourceUrl =
    stringValue(item, "url", "placeUrl", "googleMapsUrl", "googleMapsURL") ?? website;
  if (!sourceUrl) return null;
  const email =
    stringValue(item, "email", "emailAddress") ??
    firstArrayString(item, "emails") ??
    (contacts
      ? (stringValue(contacts, "email", "emailAddress") ?? firstArrayString(contacts, "emails"))
      : null);
  const phone =
    stringValue(item, "phone", "phoneUnformatted", "phoneNumber", "mobile") ??
    firstArrayString(item, "phones") ??
    (contacts
      ? (stringValue(contacts, "phone", "phoneNumber", "mobile") ??
        firstArrayString(contacts, "phones"))
      : null);
  const addressParts = [
    stringValue(item, "street"),
    stringValue(item, "city"),
    stringValue(item, "state"),
    stringValue(item, "postalCode"),
    stringValue(item, "countryCode", "country"),
  ].filter(Boolean);
  const itemLocation =
    stringValue(item, "address", "locatedIn", "neighborhood") ??
    (addressParts.length ? addressParts.join(", ") : location);
  const services = [
    category,
    stringValue(item, "categoryName", "category"),
    ...arrayValue(item, "categories", "additionalCategories"),
  ].filter((value): value is string => Boolean(value));
  const rating = numberValue(item, "totalScore", "rating", "stars");
  const reviews = numberValue(item, "reviewsCount", "reviewCount", "numberOfReviews");
  const details = [
    typeof rating === "number" ? `Rating ${rating}` : "",
    typeof reviews === "number" ? `${reviews} reviews` : "",
  ].filter(Boolean);
  const lead: DiscoveredLead = {
    discovery_id:
      stringValue(item, "placeId", "cid", "fid", "id") ??
      `google-maps-${normalize(sourceUrl)}-${index}`,
    full_name: company,
    company_name: company,
    industry: stringValue(item, "categoryName", "category") ?? category,
    email,
    phone,
    website_url: website,
    location: itemLocation,
    services: [...new Set(services)].slice(0, 8),
    lead_score: 0,
    best_approach: "",
    notes: `Discovered from Google Maps via Apify${details.length ? `. ${details.join(", ")}` : ""}. Verify contact details before outreach.`,
    source_url: sourceUrl,
    contact_source_url: website,
    rating,
    review_count: reviews,
  };
  return applyLeadQuality(lead, category, location, freshnessFromItem(item, reviews));
}

async function discoverFromApifyGoogleMaps(
  category: string,
  location: string,
  limit: number | null,
  userId: string,
) {
  const { token, googleMapsActorId } = await getApifyConfig(userId);
  if (!token || !googleMapsActorId) {
    throw new Error(
      "Apify Google Maps connector is not configured. Open Settings and save your Apify token and Google Maps Actor ID.",
    );
  }
  const items = await runApifyActor(
    token,
    googleMapsActorId,
    googleMapsInput(category, location, limit),
    limit,
    "Google Maps",
  );
  const leads = items
    .slice(0, limit ?? undefined)
    .map((item, index) => googleMapsLead(item, category, location, index))
    .filter((lead): lead is DiscoveredLead => Boolean(lead));
  return [...new Map(leads.map((lead) => [lead.discovery_id, lead])).values()];
}

export const getApifyLinkedInStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const config = await getApifyConfig(context.userId);
    return {
      configured: Boolean(config.token && config.linkedinActorId),
      googleMapsConfigured: Boolean(config.token && config.googleMapsActorId),
      tokenConfigured: Boolean(config.token),
      actorId: config.linkedinActorId || null,
      googleMapsActorId: config.googleMapsActorId || null,
      source: config.source,
      customInputConfigured: Boolean(process.env.APIFY_LINKEDIN_INPUT_JSON),
    };
  });

export const saveApifyLinkedInSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => apifySettingsInput.parse(data))
  .handler(async ({ data, context }) => {
    const config = await readLocalApifyConfig();
    const current = config[context.userId] ?? {};
    config[context.userId] = {
      ...current,
      ...(data.token ? { token: data.token } : {}),
      ...(data.actorId ? { actorId: normalizeActorId(data.actorId) } : {}),
      ...(data.googleMapsActorId
        ? { googleMapsActorId: normalizeActorId(data.googleMapsActorId) }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    await writeLocalApifyConfig(config);
    const saved = await getApifyConfig(context.userId);
    return {
      configured: Boolean(saved.token && saved.linkedinActorId),
      googleMapsConfigured: Boolean(saved.token && saved.googleMapsActorId),
      actorId: saved.linkedinActorId,
      googleMapsActorId: saved.googleMapsActorId,
    };
  });

export const testApifyLinkedInSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { token, linkedinActorId, googleMapsActorId } = await getApifyConfig(context.userId);
    if (!token) throw new Error("Save an Apify token first.");
    const actorIds = [linkedinActorId, googleMapsActorId].filter(Boolean);
    if (!actorIds.length) throw new Error("Save at least one Apify Actor ID first.");
    for (const actorId of actorIds) {
      const response = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok)
        throw new Error(`Apify connection failed for ${actorId} (${response.status}).`);
    }
    return { ok: true, actorIds };
  });

const CATEGORY_TAGS: Record<string, string[]> = {
  dermatologist: [
    '["healthcare"="doctor"]["healthcare:speciality"~"dermatology",i]',
    '["healthcare"="clinic"]["healthcare:speciality"~"dermatology",i]',
    '["name"~"dermatolog|skin clinic|skin care",i]',
  ],
  dentist: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  restaurant: ['["amenity"="restaurant"]'],
  gym: ['["leisure"="fitness_centre"]', '["leisure"="sports_centre"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  hospital: ['["amenity"="hospital"]', '["healthcare"="hospital"]'],
  "scrap metal supplier": [
    '["shop"="scrap_metal"]',
    '["recycling_type"="centre"]["recycling:metal"="yes"]',
    '["name"~"scrap|metal recycling",i]',
  ],
  "software company": [
    '["office"="it"]',
    '["office"="company"]["name"~"software|technology|tech",i]',
  ],
  "marketing agency": [
    '["office"="advertising_agency"]',
    '["name"~"marketing agency|digital marketing",i]',
  ],
};

function escapeOverpassRegex(value: string) {
  return value.replace(/[\\"]/g, "\\$&").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWebsite(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

function getTag(tags: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (tags[key]?.trim()) return tags[key].trim();
  }
  return null;
}

function splitServices(tags: Record<string, string>, category: string) {
  const values = [
    tags["healthcare:speciality"],
    tags.speciality,
    tags.services,
    tags.cuisine,
    tags.recycling_type,
    tags["recycling:metal"] === "yes" ? "Metal recycling" : null,
  ].filter(Boolean) as string[];
  const items = values.flatMap((value) => value.split(/[;,]/).map((item) => item.trim()));
  return [...new Set(items.length ? items : [category])].slice(0, 8);
}

function buildLocation(tags: Record<string, string>, fallback: string) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
}

function scoreLead(
  lead: Pick<
    DiscoveredLead,
    | "website_url"
    | "phone"
    | "email"
    | "services"
    | "location"
    | "relevance_score"
    | "is_recent_signal"
  >,
) {
  let score = 30;
  if (lead.website_url) score += 15;
  if (lead.phone) score += 25;
  if (lead.email) score += 20;
  if (lead.phone && lead.email) score += 5;
  if (typeof lead.relevance_score === "number") score += Math.max(0, lead.relevance_score - 60) / 4;
  if (lead.is_recent_signal) score += 5;
  if (lead.services.length > 1) score += 3;
  if (lead.location) score += 2;
  return Math.min(Math.round(score), 100);
}

function bestApproach(email: string | null, phone: string | null) {
  if (email && phone) return "Call + email";
  if (phone) return "Call";
  if (email) return "Email";
  return "Research website";
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function resultUrl(value: string) {
  try {
    const normalized = value.replaceAll("&amp;", "&");
    const redirect = new URL(normalized.startsWith("//") ? `https:${normalized}` : normalized);
    const target = redirect.searchParams.get("uddg");
    return normalizeWebsite(target ?? normalized);
  } catch {
    return null;
  }
}

function isDirectoryWebsite(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return DIRECTORY_DOMAINS.some((domain) => host.includes(domain));
  } catch {
    return true;
  }
}

function companyNameFromHost(website: string, location: string) {
  const city = location.split(",")[0].trim();
  const host = new URL(website).hostname
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(new RegExp(`${escapeOverpassRegex(city)}$`, "i"), ` ${city}`)
    .replace(/^the(?=[a-z])/i, "The ");
  return host
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function companyNameFromTitle(title: string, category: string, location: string, website: string) {
  const cleaned = decodeHtml(title).replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/\s*\|\s*|\s+[-–—:]\s+/);
  const locationTerms = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("|");
  const reject = new RegExp(
    `directory|list of|phone number|address email|\\btop\\b|\\bbest\\b|${escapeOverpassRegex(locationTerms)}`,
    "i",
  );
  const useful = parts.find(
    (part) =>
      !GENERIC_RESULT_NAMES.has(part.toLowerCase()) && !reject.test(part) && part.length <= 80,
  );
  const candidate = (useful ?? parts[0] ?? "").trim();
  if (
    !candidate ||
    GENERIC_RESULT_NAMES.has(candidate.toLowerCase()) ||
    candidate.toLowerCase() === category.toLowerCase() ||
    reject.test(candidate) ||
    /^(?:[a-z]+\s+)?\d{4}$/i.test(candidate)
  ) {
    return companyNameFromHost(website, location);
  }
  return candidate.slice(0, 160);
}

async function discoverFromWebSearch(category: string, location: string, limit: number) {
  const queries = [
    `${category} ${location} official website`,
    `${category} ${location} contact phone email`,
  ];
  const results: DiscoveredLead[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    let html = "";
    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) continue;
      html = await response.text();
    } catch {
      continue;
    }
    const links = html.matchAll(
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    );
    for (const match of links) {
      const website = resultUrl(match[1]);
      if (!website || isDirectoryWebsite(website)) continue;
      const title = decodeHtml(match[2]);
      if (CATEGORY_CONFLICTS[category.toLowerCase()]?.test(title)) continue;
      const host = new URL(website).hostname.replace(/^www\./, "").toLowerCase();
      if (seen.has(host)) continue;
      seen.add(host);
      const companyName = companyNameFromTitle(title, category, location, website);
      const lead: DiscoveredLead = {
        discovery_id: `web-${host}`,
        full_name: companyName,
        company_name: companyName,
        industry: category,
        email: null,
        phone: null,
        website_url: website,
        location,
        services: [category],
        lead_score: 0,
        best_approach: "Research website",
        notes: "Discovered from public web search. Verify contact details before outreach.",
        source_url: website,
        contact_source_url: null,
      };
      results.push(
        applyLeadQuality(lead, category, location, {
          freshness_signal: "No public age signal found in search result",
          business_age_estimate: null,
          is_recent_signal: false,
        }),
      );
      if (results.length >= limit) return results;
    }
  }
  return results;
}

function buildOverpassQuery(category: string, location: string) {
  const normalized = category.toLowerCase().replace(/\s+/g, " ").trim();
  const filters = CATEGORY_TAGS[normalized] ?? [`["name"~"${escapeOverpassRegex(category)}",i]`];
  const selectors = filters.map((filter) => `nwr${filter}(area.searchArea);`).join("\n");
  const areaName = location.split(",")[0].trim();
  return `[out:json][timeout:40];
area["boundary"="administrative"]["name"~"^${escapeOverpassRegex(areaName)}$",i]->.searchArea;
(
${selectors}
);
out tags center;`;
}

export const discoverBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => searchInput.parse(value))
  .handler(async ({ data, context }) => {
    return data.source === "google_maps"
      ? discoverFromApifyGoogleMaps(data.category, data.location, data.limit, context.userId)
      : discoverFromApifyLinkedIn(data.category, data.location, data.limit, context.userId);
  });

export const discoverPublicBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => searchInput.parse(value))
  .handler(async ({ data }) => {
    const publicLimit = data.limit ?? 1000;
    let payload: { elements?: OsmElement[] } = { elements: [] };
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": USER_AGENT,
        },
        body: new URLSearchParams({ data: buildOverpassQuery(data.category, data.location) }),
        signal: AbortSignal.timeout(25_000),
      });
      if (response.ok) payload = (await response.json()) as { elements?: OsmElement[] };
    } catch {
      // Continue with public web search when the free map service is busy.
    }
    const seen = new Set<string>();
    const results: DiscoveredLead[] = [];

    for (const element of payload.elements ?? []) {
      const tags = element.tags ?? {};
      const name = getTag(tags, "name", "brand", "operator");
      if (!name) continue;
      const website = normalizeWebsite(
        getTag(tags, "contact:website", "website", "url") ?? undefined,
      );
      const phone = getTag(tags, "contact:phone", "phone", "contact:mobile", "mobile");
      const email = getTag(tags, "contact:email", "email");
      const dedupeKey = `${name.toLowerCase()}|${phone ?? ""}|${website ?? ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const services = splitServices(tags, data.category);
      const location = buildLocation(tags, data.location);
      const sourceUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;
      const lead: DiscoveredLead = {
        discovery_id: `${element.type}-${element.id}`,
        full_name: name,
        company_name: name,
        industry: data.category,
        email,
        phone,
        website_url: website,
        location,
        services,
        lead_score: 0,
        best_approach: "",
        notes: `Discovered from OpenStreetMap. Verify contact details before outreach.`,
        source_url: sourceUrl,
        contact_source_url: null,
      };
      results.push(
        applyLeadQuality(lead, data.category, data.location, {
          freshness_signal: "No public age signal found in map record",
          business_age_estimate: null,
          is_recent_signal: false,
        }),
      );
      if (results.length >= publicLimit) break;
    }

    if (results.length < publicLimit) {
      const webResults = await discoverFromWebSearch(data.category, data.location, publicLimit);
      const knownWebsites = new Set(
        results
          .map((lead) => lead.website_url)
          .filter(Boolean)
          .map((value) => normalize(value!)),
      );
      for (const lead of webResults) {
        const key = lead.website_url ? normalize(lead.website_url) : lead.discovery_id;
        if (knownWebsites.has(key)) continue;
        knownWebsites.add(key);
        results.push(lead);
        if (results.length >= publicLimit) break;
      }
    }

    return results;
  });

function cleanEmail(value: string) {
  return value
    .replace(/^mailto:/i, "")
    .split("?")[0]
    .trim()
    .toLowerCase();
}

function cleanPhone(value: string) {
  return value.replace(/^tel:/i, "").split("?")[0].trim();
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function isUsefulEmail(value: string) {
  return !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(value) && !value.includes("example.");
}

function pickPhone(values: string[]) {
  return (
    values.map(cleanPhone).find((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && !/^(?:19|20)\d{6}$/.test(digits);
    }) ?? null
  );
}

type HtmlPageSnapshot = {
  url: string;
  title: string | null;
  text: string;
  links: { href: string; text: string }[];
};

function htmlText(value: string) {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

function htmlAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function pageTitleFromHtml(html: string) {
  const siteNameTag = html.match(
    /<meta\b(?=[^>]*(?:property|name)\s*=\s*["'](?:og:site_name|application-name|twitter:title)["'])[^>]*>/i,
  )?.[0];
  const siteName = siteNameTag ? htmlAttribute(siteNameTag, "content") : null;
  if (siteName) return htmlText(siteName).trim();

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? htmlText(title).trim() : null;
}

function linksFromHtml(html: string, baseUrl: string) {
  const links: HtmlPageSnapshot["links"] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = htmlAttribute(match[1], "href");
    if (!href) continue;
    try {
      links.push({
        href: new URL(href, baseUrl).toString(),
        text: htmlText(match[2]).trim().slice(0, 160),
      });
    } catch {
      // Ignore malformed links.
    }
    if (links.length >= 150) break;
  }
  return links;
}

async function fetchHtmlSnapshot(url: string): Promise<HtmlPageSnapshot | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/html|text/i.test(contentType)) return null;
    const html = (await response.text()).slice(0, 500_000);
    const finalUrl = response.url || url;
    return {
      url: finalUrl,
      title: pageTitleFromHtml(html),
      text: htmlText(html).slice(0, 100_000),
      links: linksFromHtml(html, finalUrl),
    };
  } catch {
    return null;
  }
}

function collectContactData(snapshot: HtmlPageSnapshot, emails: Set<string>, phones: Set<string>) {
  for (const value of snapshot.text.match(EMAIL_RE) ?? []) {
    const email = cleanEmail(value);
    if (isUsefulEmail(email)) emails.add(email);
  }
  for (const value of snapshot.text.match(PHONE_RE) ?? []) phones.add(cleanPhone(value));
  for (const link of snapshot.links) {
    if (link.href.startsWith("mailto:")) {
      const email = cleanEmail(link.href);
      if (isUsefulEmail(email)) emails.add(email);
    }
    if (link.href.startsWith("tel:")) phones.add(cleanPhone(link.href));
  }
}

function contactLinksFromSnapshot(snapshot: HtmlPageSnapshot) {
  let origin: string | null = null;
  try {
    origin = new URL(snapshot.url).origin;
  } catch {
    origin = null;
  }

  const seen = new Set<string>();
  return snapshot.links
    .filter((link) => /^https?:\/\//i.test(link.href))
    .filter((link) =>
      /contact|about|reach|location|visit|support/i.test(`${link.text} ${link.href}`),
    )
    .filter((link) => {
      if (seen.has(link.href)) return false;
      seen.add(link.href);
      if (!origin) return true;
      try {
        return new URL(link.href).origin === origin;
      } catch {
        return false;
      }
    })
    .slice(0, 3);
}

export const enrichBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) => enrichInput.parse(value))
  .handler(async ({ data }) => {
    const enriched: DiscoveredLead[] = [];
    for (const lead of data.leads) {
      if (!lead.website_url) {
        enriched.push(lead);
        continue;
      }

      const emails = new Set<string>(lead.email ? [lead.email] : []);
      const phones = new Set<string>(lead.phone ? [lead.phone] : []);
      let contactSource = lead.contact_source_url;
      let verifiedName = lead.company_name;

      const homepage = await fetchHtmlSnapshot(lead.website_url);
      if (homepage) {
        if (homepage.title) {
          verifiedName = companyNameFromTitle(
            homepage.title,
            lead.industry,
            lead.location,
            lead.website_url,
          );
        }
        collectContactData(homepage, emails, phones);

        for (const link of contactLinksFromSnapshot(homepage)) {
          const contactPage = await fetchHtmlSnapshot(link.href);
          if (!contactPage) continue;
          collectContactData(contactPage, emails, phones);
          contactSource = contactPage.url;
          if (emails.size && phones.size) break;
        }
      }

      const next = {
        ...lead,
        full_name: verifiedName,
        company_name: verifiedName,
        email: [...emails].find(isUsefulEmail) ?? null,
        phone: pickPhone([...phones]),
        contact_source_url: contactSource,
      };
      Object.assign(
        next,
        leadQualitySignals(next, lead.industry, lead.location),
        lead.freshness_signal
          ? {}
          : {
              freshness_signal: "Website checked; no public age signal found",
              business_age_estimate: null,
              is_recent_signal: false,
            },
      );
      next.lead_score = scoreLead(next);
      next.best_approach = bestApproach(next.email, next.phone);
      next.notes = `${lead.notes} Website enrichment checked ${new Date().toISOString().slice(0, 10)}.`;
      enriched.push(next);
    }
    return enriched;
  });
