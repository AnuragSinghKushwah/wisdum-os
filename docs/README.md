# Wisdum Documentation

Technical documentation for the Wisdum platform. Documentation is part of the product: it versions with the code and is updated in the same pull request as the change it describes.

## Structure

| Directory | Contents |
| --- | --- |
| [`architecture/`](architecture/) | System architecture — start with [overview.md](architecture/overview.md) |
| [`adr/`](adr/) | Architecture Decision Records — the project's decision log |
| [`domains/`](domains/) | Domain models: one document per domain describing entities, events, and boundaries |
| [`api/`](api/) | API design standards and OpenAPI specifications |

## Where things go

- **Why a decision was made** → an ADR in `adr/`
- **How the system fits together** → `architecture/`
- **What a domain owns and emits** → `domains/`
- **What an API accepts and returns** → `api/`
- **Product direction and planning** → [`../product/`](../product/) (not here)
- **How to contribute** → [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
