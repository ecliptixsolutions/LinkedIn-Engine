CREATE TABLE public.apify_connectors (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT,
  linkedin_actor_id TEXT,
  google_maps_actor_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON public.apify_connectors FROM anon, authenticated;
GRANT ALL ON public.apify_connectors TO service_role;
ALTER TABLE public.apify_connectors ENABLE ROW LEVEL SECURITY;
