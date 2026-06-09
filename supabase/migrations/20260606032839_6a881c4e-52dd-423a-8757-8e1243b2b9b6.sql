
CREATE TABLE public.startups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text NOT NULL,
  status text NOT NULL CHECK (status IN ('Success','Failure')),
  funding_raised text NOT NULL,
  funding_raised_usd bigint NOT NULL DEFAULT 0,
  year_founded int NOT NULL,
  year_closed int,
  reason text NOT NULL,
  description text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX startups_industry_idx ON public.startups(industry);
CREATE INDEX startups_status_idx ON public.startups(status);
CREATE INDEX startups_tags_idx ON public.startups USING gin(tags);

GRANT SELECT ON public.startups TO anon, authenticated;
GRANT ALL ON public.startups TO service_role;

ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Startups are publicly readable"
  ON public.startups FOR SELECT
  USING (true);
