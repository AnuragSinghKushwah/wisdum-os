# Governance

This document describes how decisions are made in the Wisdum project. It is intentionally lightweight for the project's current early stage and will evolve as the community grows — changes to governance itself follow the same process as any other significant decision.

## Roles

### Users

Anyone who uses Wisdum. Users participate by filing issues, joining discussions, and providing feedback.

### Contributors

Anyone who submits code, documentation, reviews, or design input. Contributors follow [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). No formal status is required — your first merged PR makes you a contributor.

### Maintainers

Maintainers have merge rights and are accountable for the project's architectural integrity, release quality, and community health. Maintainers:

- review and merge pull requests
- steward the ADR process
- triage issues and set milestone priorities
- enforce the Code of Conduct

The current maintainer team is listed in the repository's contributor metadata. While the project is in its founding phase, the original author acts as lead maintainer with final say on contested decisions (a role intended to dissolve into team consensus as the maintainer group grows).

## How decisions are made

### Day-to-day changes

Lazy consensus: pull requests that follow the contribution guidelines and receive maintainer approval are merged. Silence is consent.

### Architectural decisions

Any change to architecture — new domains, technology choices, cross-cutting patterns, public API contracts, event schemas — **must** be proposed as an [Architecture Decision Record](docs/adr/README.md) before implementation. Discussion happens on the ADR pull request; the decision is accepted when maintainers reach consensus.

### Contested decisions

If consensus cannot be reached after good-faith discussion, the lead maintainer decides and records the rationale (in the relevant ADR where applicable).

## Becoming a maintainer

Contributors who demonstrate sustained, high-quality contributions and sound architectural judgment may be nominated by an existing maintainer. Nominations are accepted by consensus of the existing maintainer team.

## Values that constrain all decisions

1. **Platform over product** — Wisdum is infrastructure; decisions must make sense at platform scale.
2. **Open source first** — no feature may depend on a proprietary service without a plugin abstraction.
3. **Long-term maintainability over short-term convenience.**
4. **Documentation is part of the product.**
