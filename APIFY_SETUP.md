# Apify Lead Sources

The Discover Leads page supports LinkedIn and Google Maps through configured Apify Actors.

## Setup

1. In Apify Console, choose a LinkedIn Actor that accepts search keywords and a result limit.
2. Use `compass~crawler-google-places` for the maintained Google Maps Scraper, or replace it with a compatible Actor.
3. Create an Apify API token from the Apify Integrations page.
4. Open the app Settings page and paste the Actor IDs and token into **Apify Lead Sources**.

The token is hidden and saved in the server-only `.ecliptix-secrets.json` file. You can replace an
expired token from Settings without editing `.env` or restarting the app. `.env` remains a supported
fallback for the first connection.

## Actor Input

By default the LinkedIn connector sends:

```json
{
  "searchQuery": "Dermatologist Mumbai, India",
  "locations": ["Mumbai, India"],
  "maxItems": 50,
  "profileScraperMode": "Full + email search",
  "autoQuerySegmentation": false,
  "takePages": 2
}
```

If your Actor uses different field names, set `APIFY_LINKEDIN_INPUT_JSON`. Available placeholders are
`{query}`, `{category}`, `{location}`, and `{limit}`.

Example:

```env
APIFY_LINKEDIN_INPUT_JSON="{\"query\":\"{query}\",\"limit\":{limit}}"
```

The API token is never returned to the browser. Custom result counts support up to 10,000. The
**All** option requests as many records as the selected Actor can return in its run. Actual totals
still depend on the Actor, available source results, Apify credits, and platform limits.

The Google Maps connector requests business listings by category and location and enables company
contact enrichment for public emails. Google Maps commonly provides phone, website, address,
category, and ratings, but no scraper can guarantee that every listing contains every contact field.
