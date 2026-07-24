-- Records which plugin capability published this content, and where it
-- ended up (Product Bible §10). Additive with a default so existing rows
-- (published under the earlier internal-only path) stay valid without a
-- backfill.
ALTER TABLE published_content
    ADD COLUMN provider_capability text NOT NULL DEFAULT 'publishing.website',
    ADD COLUMN external_url text NOT NULL DEFAULT '';
