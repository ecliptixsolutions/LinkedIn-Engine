import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Kanban,
  MailCheck,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

const workflow = [
  {
    icon: Search,
    title: "Discover",
    desc: "Find prospects across LinkedIn and local search with filters that match your ICP.",
  },
  {
    icon: Gauge,
    title: "Qualify",
    desc: "Turn raw prospects into scored opportunities with AI notes, fit signals, and next steps.",
  },
  {
    icon: MailCheck,
    title: "Convert",
    desc: "Create personal outreach, schedule follow-ups, and keep deals moving through the pipeline.",
  },
];

const capabilities = [
  { icon: Users, label: "Smart CRM", value: "Complete lead history and status tracking" },
  { icon: Sparkles, label: "AI scoring", value: "Temperature, fit, and opportunity analysis" },
  { icon: MessageSquare, label: "Outreach", value: "Personalized emails and messages in seconds" },
  { icon: Kanban, label: "Pipeline", value: "Visual deal flow from first touch to won" },
  { icon: CalendarClock, label: "Follow-ups", value: "Due reminders and activity timelines" },
  { icon: BarChart3, label: "Analytics", value: "Source performance, funnel health, and revenue" },
];

const metrics = [
  { label: "Lead sources", value: "2", hint: "LinkedIn and Google Maps" },
  { label: "CRM stages", value: "6", hint: "From new to won" },
  { label: "AI actions", value: "4", hint: "Score, summarize, draft, follow up" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary shadow-[var(--shadow-glow)]">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Ecliptix AI</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Lead Engine
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </a>
            <a href="#platform" className="transition-colors hover:text-foreground">
              Platform
            </a>
            <a href="#outcomes" className="transition-colors hover:text-foreground">
              Outcomes
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button className="shadow-[var(--shadow-md)]" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-border/70">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                AI-powered sales workspace for Ecliptix Solutions
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
                Ecliptix AI Lead Engine
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Discover the right prospects, qualify them with AI, generate personal outreach, and
                move every deal through one focused CRM.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-11 gap-2 px-5 shadow-[var(--shadow-glow)]" asChild>
                  <Link to="/auth">
                    Launch workspace <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 px-5" asChild>
                  <a href="#platform">View platform</a>
                </Button>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-border bg-card p-4">
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="mt-1 text-sm font-medium">{metric.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{metric.hint}</div>
                  </div>
                ))}
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section id="workflow" className="border-b border-border/70 bg-card/55">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Daily workflow
                </p>
                <h2 className="mt-2 text-3xl font-bold">From prospect list to booked call</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Each step is designed for repeated sales work: quick scanning, clear priorities, and
                fewer handoffs between tools.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {workflow.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-border bg-background p-6 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="border-b border-border/70">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Platform
                </p>
                <h2 className="mt-2 text-3xl font-bold">The CRM built around AI action</h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Ecliptix AI keeps discovery, qualification, messaging, pipeline, meetings,
                  proposals, reminders, and analytics in the same operating surface.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready for daily lead generation workflows
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {capabilities.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/20 text-accent-foreground">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.label}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="outcomes" className="bg-[var(--navy)] text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent">
                Sales outcomes
              </p>
              <h2 className="mt-2 max-w-3xl text-3xl font-bold">
                A calmer, faster way to run the lead engine every day.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                Replace scattered spreadsheets, cold message drafts, manual reminders, and unclear
                pipeline health with one workspace built for execution.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/8 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Start from the workspace</div>
                  <div className="text-sm text-white/65">No marketing detour, just the CRM.</div>
                </div>
              </div>
              <Button className="mt-5 w-full bg-white text-[var(--navy)] hover:bg-white/90" asChild>
                <Link to="/auth">
                  Open Ecliptix AI <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>(c) {new Date().getFullYear()} Ecliptix Solutions. AI Lead Engine.</span>
          <span>Lead discovery, CRM, outreach, and analytics.</span>
        </div>
      </footer>
    </div>
  );
}

function ProductPreview() {
  const rows = [
    { name: "Apex Dental Studio", source: "Google Maps", score: 92, status: "Hot" },
    { name: "Nova Interiors", source: "LinkedIn", score: 84, status: "Qualified" },
    { name: "Urban Fitness Co.", source: "Google Maps", score: 77, status: "Follow-up" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-lg)]">
      <div className="rounded-md border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Lead command center</div>
              <div className="text-xs text-muted-foreground">Live pipeline snapshot</div>
            </div>
          </div>
          <div className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            Active
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_0.75fr]">
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.name} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-primary" />
                      {row.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.source}</div>
                  </div>
                  <div className="rounded-full bg-accent/25 px-2 py-1 text-xs font-bold text-accent-foreground">
                    {row.score}
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${row.score}%` }}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-muted-foreground">{row.status}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                AI recommendation
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Prioritize Apex Dental Studio and lead with website conversion improvements.
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Pipeline value</span>
                <span className="text-primary">$48k</span>
              </div>
              <div className="space-y-2">
                <PreviewBar label="New" width="72%" />
                <PreviewBar label="Meeting" width="46%" tone="bg-accent" />
                <PreviewBar label="Proposal" width="58%" tone="bg-success" />
              </div>
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Zap className="h-4 w-4" />5 follow-ups due today
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBar({
  label,
  width,
  tone = "bg-primary",
}: {
  label: string;
  width: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{width}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}
