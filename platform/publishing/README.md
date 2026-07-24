# @wisdum/platform-publishing

Vendor-neutral `PublishingProvider` port (Product Bible §10) plus first-party
adapters. Concrete external targets (Dev.to, LinkedIn, Medium, ...) integrate
as additional adapters behind the same port — the core platform never depends
on a vendor SDK directly, matching the pattern established by `platform/ai`'s
`LlmProvider`.
