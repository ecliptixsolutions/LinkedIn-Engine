from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT_DIR = Path("output/pdf")
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT_DIR / "database_migration_summary_and_recommendation.pdf"

PAGE_W, _ = A4
MARGIN = 0.62 * inch

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="TitleCustom",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=27,
        textColor=colors.HexColor("#111827"),
        alignment=TA_CENTER,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="Subtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#4B5563"),
        alignment=TA_CENTER,
        spaceAfter=18,
    )
)
styles.add(
    ParagraphStyle(
        name="H1Custom",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15.5,
        leading=19,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="H2Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=colors.HexColor("#1F2937"),
        spaceBefore=8,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.4,
        leading=13.2,
        textColor=colors.HexColor("#263244"),
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#4B5563"),
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="HeaderSmall",
        parent=styles["Small"],
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        name="Callout",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=10.2,
        leading=14,
        textColor=colors.HexColor("#0B3B3B"),
        backColor=colors.HexColor("#E6F7F5"),
        borderColor=colors.HexColor("#7DD3C7"),
        borderWidth=0.7,
        borderPadding=8,
        spaceBefore=8,
        spaceAfter=10,
    )
)


def para(text, style="BodyCustom"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph("- " + text, styles["BodyCustom"])


def source_link(label, url):
    return f'<link href="{url}">{label}</link>'


sources = [
    ("Supabase pricing", "https://supabase.com/pricing"),
    ("Supabase billing docs", "https://supabase.com/docs/guides/platform/billing-on-supabase"),
    ("Turso pricing", "https://turso.tech/pricing"),
    ("Turso free plan update", "https://turso.tech/blog/turso-cloud-debuts-the-new-developer-plan"),
    ("Neon scale to zero", "https://neon.com/docs/introduction/scale-to-zero"),
    ("Neon plans", "https://neon.com/docs/introduction/plans"),
    ("MongoDB Atlas pause docs", "https://www.mongodb.com/docs/atlas/pause-terminate-cluster/"),
    (
        "MongoDB Atlas free limitations",
        "https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/",
    ),
    (
        "Azure SQL free offer",
        "https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql",
    ),
    (
        "Azure SQL free offer FAQ",
        "https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer-faq?view=azuresql",
    ),
]


def make_table(rows, col_widths, header_color):
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_color)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


story = [
    para("Database Migration Summary", "TitleCustom"),
    para("For Ecliptix AI Engine - prepared July 27, 2026", "Subtitle"),
    para("Executive Recommendation", "H1Custom"),
    para(
        "The current issue is not a code bug. The app depends on Supabase Free, and free "
        "Supabase projects can pause after inactivity. Because this app uses Supabase Auth "
        "and Supabase table APIs across many screens, changing the database is a migration "
        "project, not a simple environment-variable swap."
    ),
    para(
        "Recommended path: use Turso Free for the database and replace Supabase Auth with "
        "Better Auth or another auth layer. If you need the absolute least code change, "
        "create a fresh Supabase project as a short-term rescue, but it does not solve the "
        "pause problem permanently.",
        "Callout",
    ),
    para("Current App Dependency Snapshot", "H1Custom"),
]

for item in [
    "Frontend and server code import Supabase client from src/integrations/supabase/client.ts and auth middleware from src/integrations/supabase/auth-middleware.ts.",
    "Routes use supabase.auth for login, signup, OAuth, session checks, and sign out.",
    "Business features use supabase.from(...) for leads, activities, follow_ups, meetings, proposals, messages, profiles, and settings.",
    "Database migrations define Postgres tables, enums, foreign keys, RLS policies, and auth.users references.",
]:
    story.append(bullet(item))

story.extend(
    [
        para("Problem Statement", "H1Custom"),
        para(
            "The business requirement is: the database should not be paused or stopped "
            "unexpectedly. Supabase Free does not fully satisfy this because its free projects "
            "can be paused after inactivity. Other free cloud databases also have limits, and "
            "some have their own pause, sleep, quota, or cold-start behavior."
        ),
        para(
            "Important distinction: a database that auto-suspends compute may still keep data "
            "safe, but the app can feel unavailable or slow when it wakes. For a production-like "
            "CRM/lead system, reliability matters more than simply having a no-cost label."
        ),
        para("Option Comparison", "H1Custom"),
    ]
)

rows = [
    [
        para("Option", "HeaderSmall"),
        para("Pause / Stop Risk", "HeaderSmall"),
        para("Fit For This App", "HeaderSmall"),
        para("Verdict", "HeaderSmall"),
    ]
]
for row in [
    (
        "Stay on Supabase Free",
        "High. Free projects can pause after inactivity.",
        "Best technical fit because the app already uses Supabase Auth and APIs.",
        "Fast rescue only. Not ideal for the no-pause requirement.",
    ),
    (
        "New Supabase Free project",
        "High. Same free-plan pause behavior.",
        "Very easy migration if schema is reapplied and env keys are changed.",
        "Useful temporary fix, not a durable solution.",
    ),
    (
        "Turso Free",
        "Low based on current public positioning: free databases stay responsive and avoid cold starts.",
        "Good for app data, but requires replacing Supabase Auth and rewriting data access.",
        "Best free cloud direction if no-pause is the priority.",
    ),
    (
        "Neon Postgres Free",
        "Medium. Compute scales to zero after inactivity on Free.",
        "Excellent schema fit because both are Postgres.",
        "Good if cold start is acceptable. Not ideal for strict always-awake.",
    ),
    (
        "MongoDB Atlas Free",
        "Medium. Free clusters can pause after inactivity.",
        "Poorer fit because current data is relational and SQL/Postgres-shaped.",
        "Not recommended for this project.",
    ),
    (
        "SQL Server Express self-hosted",
        "Low if your VPS/server stays running.",
        "Relational fit, but requires schema conversion and server operations.",
        "Good no-pause option if you can manage hosting.",
    ),
    (
        "Azure SQL Free",
        "Medium. Free offer is limited by monthly compute/storage quotas.",
        "Relational fit, but SQL dialect and driver changes are needed.",
        "Okay for prototypes, risky for always-on expectations.",
    ),
]:
    rows.append([para(cell, "Small") for cell in row])

story.append(make_table(rows, [1.2 * inch, 1.55 * inch, 2.0 * inch, 1.55 * inch], "#111827"))
story.append(PageBreak())

story.extend(
    [
        para("Recommended Architecture", "H1Custom"),
        para("At this stage, the cleanest long-term architecture is:"),
    ]
)
for item in [
    "<b>Database:</b> Turso/libSQL for lead-management app data.",
    "<b>Authentication:</b> Better Auth or Clerk/Auth.js, depending on whether you want self-owned auth or managed auth.",
    "<b>Server data layer:</b> add a typed database layer so UI screens stop calling Supabase directly.",
    "<b>Migration:</b> convert Supabase schema and table operations into app-owned queries.",
]:
    story.append(bullet(item))

story.append(para("Why Turso Is The Best Free Cloud Choice Here", "H2Custom"))
for item in [
    "It is a hosted SQL database with a generous current free tier, including 5 GB storage and large read/write allowances.",
    "It is designed for lightweight app workloads like dashboards, CRM-style tables, lead tracking, and user-owned records.",
    "It avoids the exact issue you are trying to solve better than Supabase Free, Neon Free, or MongoDB Atlas Free: inactivity pausing.",
]:
    story.append(bullet(item))

story.extend(
    [
        para("Tradeoff", "H2Custom"),
        para(
            "The tradeoff is code migration. Supabase provides database, auth, RLS, generated "
            "REST API, and client SDK in one package. Turso is mainly the database, so the app "
            "must own auth and server-side authorization rules."
        ),
        para("Why MongoDB Is Not Ideal Here", "H1Custom"),
    ]
)
for item in [
    "The current schema is relational: users own leads, leads connect to meetings, proposals, activities, messages, and follow-ups.",
    "MongoDB would require redesigning tables into document collections and changing most query patterns.",
    "MongoDB Atlas Free can still pause inactive free clusters, so it does not fully satisfy the no-pause requirement.",
]:
    story.append(bullet(item))

story.append(para("Why SQL Server Can Work But Is Heavier", "H1Custom"))
for item in [
    "SQL Server Express is free and will not pause by itself when self-hosted, as long as the host machine/VPS remains online.",
    "It requires managing server security, backups, firewall rules, updates, monitoring, and connection strings.",
    "Azure SQL Free is convenient, but it has monthly free compute/storage limits. It is not the same as unlimited always-on production hosting.",
    "The app would still need a new auth layer and a rewritten data access layer.",
]:
    story.append(bullet(item))

story.append(PageBreak())
story.append(para("Migration Plan", "H1Custom"))
for title, body in [
    (
        "Phase 1 - Stabilize",
        "Export current Supabase schema and data. Keep a backup before changing providers. Create a short-term working Supabase project only if immediate app access is needed.",
    ),
    (
        "Phase 2 - Choose Target",
        "Pick Turso if the priority is free cloud and no inactivity pause. Pick SQL Server Express only if you are ready to self-host and maintain the server.",
    ),
    (
        "Phase 3 - Add Auth",
        "Replace Supabase Auth with Better Auth/Auth.js or a managed provider. Store users and sessions outside Supabase.",
    ),
    (
        "Phase 4 - Add Data Layer",
        "Create server functions for leads, meetings, proposals, follow-ups, activities, messages, profiles, and settings. The UI should call app functions instead of supabase.from(...).",
    ),
    (
        "Phase 5 - Migrate Data",
        "Map Supabase UUIDs, enums, JSON columns, timestamps, and user ownership into the new database. Verify counts table by table.",
    ),
    (
        "Phase 6 - Verify",
        "Run login, signup, lead creation, pipeline updates, proposal creation, reminders, analytics, and settings flows end to end.",
    ),
]:
    story.append(KeepTogether([para(title, "H2Custom"), para(body)]))

story.append(para("Decision Matrix", "H1Custom"))
rows = [[para("Priority", "HeaderSmall"), para("Best Choice", "HeaderSmall"), para("Reason", "HeaderSmall")]]
for row in [
    ("Minimum code change today", "New Supabase Free project", "Same SDK and schema, fastest recovery, but pause risk remains."),
    ("Free cloud and should not pause", "Turso Free", "Best match to the reliability requirement among the free options reviewed."),
    ("Closest to current database design", "Neon Postgres", "Postgres-compatible, but free compute can auto-suspend."),
    ("No pause at all under your control", "SQL Server Express on VPS", "Always on if your server is always on, but operationally heavier."),
    ("Fastest NoSQL experiment", "MongoDB Atlas", "Possible, but not suitable for this app and still has free-tier pause behavior."),
]:
    rows.append([para(cell, "Small") for cell in row])
story.append(make_table(rows, [1.65 * inch, 1.6 * inch, 3.05 * inch], "#0F766E"))

story.append(PageBreak())
story.extend(
    [
        para("Final Recommendation", "H1Custom"),
        para(
            "For this project, the best decision is to avoid MongoDB and avoid relying on "
            "Supabase Free for production-like use. Move toward Turso Free plus a proper "
            "app-owned auth and data layer. This gives the best balance of zero-cost cloud "
            "hosting, low pause risk, and a manageable migration path.",
            "Callout",
        ),
        para(
            "Use SQL Server Express only if you are comfortable running your own VPS or "
            "Windows/Linux server. That path can be very stable, but the responsibility shifts "
            "from the database provider to you."
        ),
        para("Suggested Next Action", "H1Custom"),
    ]
)
for item in [
    "Approve Turso + Better Auth as the migration target.",
    "Start by replacing auth and data access in one narrow feature, such as leads, before converting the whole app.",
    "Keep Supabase running as the source of truth until data export and verification are complete.",
    "Do not delete the existing Supabase project until backups and migrated record counts are confirmed.",
]:
    story.append(bullet(item))

story.append(para("Sources Checked", "H1Custom"))
for label, url in sources:
    story.append(para(f"{source_link(label, url)} - {url}", "Small"))

story.append(Spacer(1, 0.2 * inch))
story.append(para("Note: Free-plan limits can change. Re-check provider pricing pages before final deployment.", "Small"))


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.line(MARGIN, 0.48 * inch, PAGE_W - MARGIN, 0.48 * inch)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.drawCentredString(PAGE_W / 2, 0.31 * inch, f"Ecliptix AI Engine database decision summary - Page {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    str(PDF_PATH),
    pagesize=A4,
    rightMargin=MARGIN,
    leftMargin=MARGIN,
    topMargin=0.62 * inch,
    bottomMargin=0.68 * inch,
    title="Database Migration Summary and Recommendation",
    author="Codex",
)
doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
print(PDF_PATH.resolve())
