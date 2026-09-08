import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const body = {
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
  };

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as GeminiResponse;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

const SYSTEM_PROMPT = `You are Ecliptix Solutions AI Sales Assistant.
Your role: analyze businesses, identify opportunities, score leads, generate personalized outreach, suggest services.
Ecliptix offers: Website Development, E-Commerce, CRM Development, AI Automation, WhatsApp Automation,
Lead Management Systems, Business Automation, Custom Software, Digital Transformation.
Never generate spammy outreach. Messages must feel human, relevant, consultative.
Always provide value first. Always identify opportunities before pitching.
Respond ONLY in valid JSON matching the requested schema.`;

function localAnalysis(lead: {
  website_url: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  company_name: string | null;
}) {
  const contactScore = (lead.website_url ? 20 : 0) + (lead.email ? 20 : 0) + (lead.phone ? 20 : 0);
  const leadScore = Math.min(95, 35 + contactScore);
  const recommendedService = lead.website_url ? "CRM Development" : "Website Development";
  return {
    lead_score: leadScore,
    opportunity_score: lead.website_url ? 75 : 85,
    temperature: leadScore >= 80 ? "hot" : leadScore >= 60 ? "warm" : "low",
    recommended_service: recommendedService,
    revenue_potential: lead.website_url ? 5000 : 3000,
    analysis: {
      website_quality: lead.website_url
        ? "An official website is available and should be reviewed for conversion improvements."
        : "No official website was found, creating a clear website-development opportunity.",
      technical: "A discovery call is required to assess the current technology stack.",
      lead_generation: "Public contact details make direct outreach possible.",
      automation_readiness:
        "The business may benefit from structured CRM and follow-up automation.",
      summary: `${lead.company_name ?? "This business"} is a contactable ${lead.industry ?? "business"} lead. Prioritize a short discovery call and confirm the decision-maker before proposing services.`,
    },
    opportunities: [
      {
        area: "Lead management",
        service: recommendedService,
        impact: "high",
        reason: "A structured sales process can improve response speed and follow-up consistency.",
      },
    ],
  };
}

function localMessage(
  lead: { full_name: string; company_name: string | null; industry: string | null },
  messageType: string,
) {
  const company = lead.company_name ?? lead.full_name;
  if (messageType === "meeting_confirmation") {
    return `Hi ${lead.full_name}, I am looking forward to our meeting about ${company}. I will keep the conversation focused on your current priorities and practical next steps.`;
  }
  if (messageType.startsWith("follow_up") || messageType === "proposal_followup") {
    return `Hi ${lead.full_name}, I wanted to follow up regarding ${company}. I would be glad to share a few practical ideas that may help improve lead handling and follow-up. Would a short conversation this week be useful?`;
  }
  return `Hi ${lead.full_name}, I came across ${company} while researching ${lead.industry ?? "businesses"} in your market. I noticed a few opportunities where a more structured lead and follow-up process could help. Would you be open to a short, no-pressure conversation?`;
}

function personalizeTemplate(
  template: string,
  lead: {
    full_name: string;
    company_name: string | null;
    industry: string | null;
    location: string | null;
  },
) {
  const firstName = lead.full_name.trim().split(/\s+/)[0] || lead.full_name;
  return template
    .replaceAll("{first_name}", firstName)
    .replaceAll("{full_name}", lead.full_name)
    .replaceAll("{company_name}", lead.company_name ?? lead.full_name)
    .replaceAll("{industry}", lead.industry ?? "your industry")
    .replaceAll("{location}", lead.location ?? "your market");
}

export const createLinkedInMessageCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value: unknown) =>
    z
      .object({
        leadIds: z.array(z.string().uuid()).min(1).max(1000),
        template: z.string().trim().min(10).max(3000),
        createFollowUps: z.boolean().default(true),
      })
      .parse(value),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, full_name, company_name, industry, location")
      .in("id", data.leadIds)
      .eq("user_id", userId);
    if (error) throw error;
    if (!leads?.length) throw new Error("No matching CRM leads were found.");

    const messages = leads.map((lead) => ({
      user_id: userId,
      lead_id: lead.id,
      message_type: "linkedin_campaign",
      tone: "personalized template",
      content: personalizeTemplate(data.template, lead),
    }));
    const { error: messageError } = await supabase.from("messages").insert(messages);
    if (messageError) throw messageError;

    if (data.createFollowUps) {
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 2);
      const { error: followUpError } = await supabase.from("follow_ups").insert(
        messages.map((message) => ({
          user_id: userId,
          lead_id: message.lead_id,
          sequence_step: 1,
          scheduled_for: scheduledFor.toISOString(),
          channel: "linkedin",
          status: "pending" as const,
          message: message.content,
        })),
      );
      if (followUpError) throw followUpError;
    }

    await supabase.from("activities").insert({
      user_id: userId,
      activity_type: "linkedin_campaign_created",
      title: `Prepared LinkedIn campaign for ${messages.length} leads`,
      description: data.createFollowUps
        ? "Personalized messages and pending follow-ups created"
        : "Personalized messages created",
      metadata: { count: messages.length },
    });

    return { count: messages.length, followUpsCreated: data.createFollowUps };
  });

// ============ ANALYZE LEAD ============
export const analyzeLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", data.leadId)
      .single();
    if (error || !lead) throw new Error("Lead not found");

    const prompt = `Analyze this business lead and respond with JSON.

LEAD:
- Name: ${lead.full_name}
- Company: ${lead.company_name ?? "N/A"}
- Industry: ${lead.industry ?? "N/A"}
- Job Title: ${lead.job_title ?? "N/A"}
- Website: ${lead.website_url ?? "N/A"}
- LinkedIn: ${lead.linkedin_url ?? "N/A"}
- Company Size: ${lead.company_size ?? "N/A"}
- Location: ${lead.location ?? "N/A"}
- Notes: ${lead.notes ?? "N/A"}

Return JSON with EXACTLY this shape:
{
  "lead_score": <number 0-100>,
  "opportunity_score": <number 0-100>,
  "temperature": "hot" | "warm" | "low" | "disqualified",
  "recommended_service": "<one of: Website Development, E-Commerce, CRM Development, AI Automation, WhatsApp Automation, Lead Management, Business Automation, Custom Software, Digital Transformation>",
  "revenue_potential": <number in USD>,
  "analysis": {
    "website_quality": "<one sentence>",
    "technical": "<one sentence>",
    "lead_generation": "<one sentence>",
    "automation_readiness": "<one sentence>",
    "summary": "<2-3 sentence executive summary>"
  },
  "opportunities": [
    {"area": "<short>", "service": "<recommended ecliptix service>", "impact": "low|medium|high", "reason": "<one sentence>"}
  ]
}`;

    let parsed: ReturnType<typeof localAnalysis>;
    if (process.env.GEMINI_API_KEY) {
      const raw = await callGemini(prompt, SYSTEM_PROMPT);
      try {
        parsed = JSON.parse(raw) as ReturnType<typeof localAnalysis>;
      } catch {
        throw new Error("AI response was not valid JSON");
      }
    } else {
      parsed = localAnalysis(lead);
    }

    const temp = ["hot", "warm", "low", "disqualified"].includes(parsed.temperature)
      ? parsed.temperature
      : "low";

    const { data: updated, error: upErr } = await supabase
      .from("leads")
      .update({
        lead_score: Math.min(100, Math.max(0, Number(parsed.lead_score) || 0)),
        opportunity_score: Math.min(100, Math.max(0, Number(parsed.opportunity_score) || 0)),
        temperature: temp,
        recommended_service: parsed.recommended_service ?? null,
        revenue_potential: Number(parsed.revenue_potential) || null,
        ai_analysis: parsed.analysis ?? null,
        opportunities: parsed.opportunities ?? null,
      })
      .eq("id", data.leadId)
      .eq("user_id", userId)
      .select()
      .single();
    if (upErr) throw upErr;

    await supabase.from("activities").insert({
      user_id: userId,
      lead_id: data.leadId,
      activity_type: "ai_analysis",
      title: "AI analysis completed",
      description: `Score ${parsed.lead_score} • ${parsed.recommended_service}`,
    });

    return updated;
  });

// ============ GENERATE MESSAGE ============
export const generateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        leadId: z.string().uuid(),
        messageType: z.enum([
          "connection_request",
          "first_outreach",
          "follow_up_1",
          "follow_up_2",
          "proposal_followup",
          "reengagement",
          "meeting_confirmation",
        ]),
        tone: z
          .enum(["professional", "friendly", "direct", "premium", "agency"])
          .default("professional"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lead } = await supabase.from("leads").select("*").eq("id", data.leadId).single();
    if (!lead) throw new Error("Lead not found");

    const typeDesc: Record<string, string> = {
      connection_request: "LinkedIn connection request — MAX 300 chars, warm and human",
      first_outreach:
        "Personalized first outreach message — 4-6 sentences, value-first, no hard pitch",
      follow_up_1: "Follow-up #1, gentle nudge with an insight or question",
      follow_up_2: "Follow-up #2, share a relevant case study angle",
      proposal_followup: "Follow-up after sending a proposal, ask if they have questions",
      reengagement: "Re-engage a cold lead with a fresh angle",
      meeting_confirmation: "Confirm a scheduled meeting and set expectations",
    };

    const prompt = `Generate a ${typeDesc[data.messageType]} for this lead in a ${data.tone} tone.

LEAD: ${lead.full_name} at ${lead.company_name ?? "their company"} (${lead.industry ?? "—"})
Website: ${lead.website_url ?? "N/A"}
Recommended service for them: ${lead.recommended_service ?? "based on best fit"}
AI analysis: ${JSON.stringify(lead.ai_analysis ?? {})}

Reference the company specifically. Be consultative, not salesy. Provide value first.

Return JSON: {"content": "<the message text only>"}`;

    let parsed: { content: string };
    if (process.env.GEMINI_API_KEY) {
      const raw = await callGemini(prompt, SYSTEM_PROMPT);
      try {
        parsed = JSON.parse(raw) as { content: string };
      } catch {
        parsed = { content: raw };
      }
    } else {
      parsed = { content: localMessage(lead, data.messageType) };
    }

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        user_id: userId,
        lead_id: data.leadId,
        message_type: data.messageType,
        tone: data.tone,
        content: parsed.content,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from("activities").insert({
      user_id: userId,
      lead_id: data.leadId,
      activity_type: "message_generated",
      title: `Generated ${data.messageType.replace(/_/g, " ")}`,
    });
    return msg;
  });
