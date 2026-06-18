-- FORCE ROW LEVEL SECURITY en tablas CRM sensibles (ni table owner salta RLS).

alter table public.leads force row level security;
alter table public.lead_client_notes force row level security;
alter table public.properties force row level security;
alter table public.developments force row level security;
alter table public.development_units force row level security;
alter table public.tokko_users force row level security;
alter table public.user_groups force row level security;
alter table public.user_group_members force row level security;
alter table public.sales_pipeline_configs force row level security;
alter table public.kpi_targets force row level security;
alter table public.kpi_monthly_snapshots force row level security;
alter table public.direct_messages force row level security;
alter table public.catalog_activities force row level security;
alter table public.site_content_sections force row level security;
alter table public.rate_limit_buckets force row level security;
