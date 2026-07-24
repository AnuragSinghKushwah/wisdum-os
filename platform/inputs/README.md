# @wisdum/platform-inputs

Vendor-neutral `InputConnector` port (Product Bible §6) plus first-party
adapters. Concrete sources (GitHub, Slack, Notion, ...) integrate as
additional adapters behind the same port — the core platform never depends
on a vendor SDK directly, matching the pattern established by
`platform/ai`'s `LlmProvider` and `platform/publishing`'s `PublishingProvider`.
