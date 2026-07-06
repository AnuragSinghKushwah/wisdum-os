# Security Policy

Wisdum is designed to be self-hosted infrastructure for organizational knowledge, so we take security reports seriously — even at this early stage of development.

## Supported versions

Wisdum is pre-alpha and has no released versions yet. Security fixes land on `main`. Once versioned releases exist, this section will list which versions receive security updates.

## Reporting a vulnerability

**Do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, report them privately via one of:

- **GitHub private vulnerability reporting** (preferred, once the repository is on GitHub): use the *Report a vulnerability* button under the repository's Security tab.
- **Email:** anurag786kushwah@gmail.com with the subject line `[SECURITY] Wisdum: <short description>`.

Please include as much of the following as you can:

- A description of the vulnerability and its impact
- Steps to reproduce, or a proof of concept
- Affected components (domain service, app, plugin, infrastructure)
- Any suggested remediation

## What to expect

- **Acknowledgement** of your report within 72 hours.
- **An assessment and severity classification** within 7 days.
- Coordination with you on a disclosure timeline. We ask that you give us reasonable time to remediate before public disclosure.
- Credit in the release notes / advisory, if you would like it.

## Scope notes

- Vulnerabilities in third-party providers integrated through `plugins/` should be reported to the upstream vendor; report to us if the issue lies in how Wisdum integrates them.
- Self-hosting misconfigurations (weak credentials, exposed databases) are deployment issues, not platform vulnerabilities — but reports that suggest safer defaults are very welcome.
