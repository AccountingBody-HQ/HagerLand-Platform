-- 0025 · Fix: "My quotes" in the account reads quote_document_path to show "Download quote", but signed-in users
-- were never granted that column, so the whole list failed to load. The path is not secret on its own: the file
-- stays in private storage and is only served after the ownership check in /api/quote-document. Additive only.

grant select (quote_document_path) on public.quote_requests to authenticated;

insert into public.schema_migrations (version, name) values ('0025', 'quote_document_grant') on conflict (version) do nothing;
