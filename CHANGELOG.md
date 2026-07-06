# Changelog

All notable changes to Wisdum are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Production monorepo workspace: npm workspaces + TypeScript project references building from the root (`build`, `typecheck`, `lint`, `format`, `test`).
- Shared packages: `types`, `errors`, `logger`, `config`, `contracts`, `events`, `domain`, `database` — public APIs via `src/index.ts` only.
- Platform capability scaffolds under `platform/`: `auth`, `ai`, `plugins`, `search`, `storage`, `jobs`.
- App composition roots: `apps/web`, `apps/api` (bootstrap placeholders).
- CI workflow validating install, typecheck, build, and lint on every push/PR.
- ADR 0004: TypeScript workspace topology and package boundaries.
- Repository skeleton: `product/`, `docs/`, `apps/`, `packages/`, `services/`, `plugins/`, `tools/`, `examples/`.
- Foundational documentation: README, architecture overview, domain and API documentation structure.
- Architecture Decision Record (ADR) process with founding decisions (ADR 0001–0003).
- Contribution files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, GOVERNANCE, issue and PR templates.
- Apache License 2.0.
