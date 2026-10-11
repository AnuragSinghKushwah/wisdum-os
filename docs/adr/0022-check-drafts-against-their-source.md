# 0022 — Check drafts against their source

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** Founding maintainer
- **Builds on:** [ADR 0017](0017-source-grounded-content-generation.md), [ADR 0021](0021-enforce-platform-limits-in-code.md)

## Context

The author's first blog draft from their own source, written with `nvidia/nemotron-3-super-120b-a12b`, had its numbers right (all nine appear in the source) and its story wrong:

- The headline said a fix reduces a problem to a stated percentage. In the source, that percentage is the level measured **before** a migration that the author had decided to put **on hold**: a baseline, presented as the result of the change.
- The draft called the resolution complete. The source says one fix is live and the migration is built, audited and held.
- A "Benefits" section claimed lower query latency, lower compute cost and less manual effort, and said a check would "reliably return zero rows". The source states none of that, and says queries already return nearly the right result.

The cause was found in the stored data. Automatic discovery asks the model for content ideas from a one-line template ("*X* has been captured but not yet connected to anything else") **without showing it the source**, so the model invented a title ("…Improves Data Quality…") and a rationale about helping engineers reduce manual effort. The drafting prompt then passed that rationale on as "why this content is valuable", and the draft's benefits followed it.

Reproduced and measured with the same stored prompt inputs: with the old wording, one of two runs headlined a saving that was really the baseline measurement, added latency and savings claims, and never mentioned the hold. Prompt rules alone reduced the problem but did not remove it: the three runs with the new wording all reported the hold, but two still added benefits the source does not state.

## Decision

**Discovery's title and rationale are hints, not facts.** When a draft is written from a source, the prompt says the angle was proposed before the source was read, to be used only where the source supports it, and that no claim may be taken from it. The title is already described as a working label.

**Drafting rules cover status, baselines and benefits.** Status is reported as the source gives it (planned, on hold, blocked, waiting for a decision is never described as done); a measurement taken before a change is a baseline, not a result of it; benefits, savings and effects are claimed only where the source states them for this work; advice for the reader is given only where the source gives it.

**A second request checks the draft against the source.** After a draft is written from a source, the model is asked, with only that job, to remove or rewrite anything the source does not support (claims, results, causes, status, advice, and headlines that overclaim) and to keep everything it does, including the front matter. The result is used only if it is not empty, was not cut off at the output limit, kept the front matter the draft had, and kept at least half the draft's length. Otherwise the first draft is saved and the reason is logged. The check is skipped when there is no source, for the offline demo model, and when `WISDUM_DRAFT_REVIEW=false`. For an X thread it runs before the 280-character limit is enforced.

## Consequences

- Drafts stay much closer to what the source says. On the author's source, after this change, a blog draft reported the held item as "blocked/on hold" and had no benefit claims, and an X thread kept to the limit.
- **It costs time and money.** Measured with the hosted model above: about 20 to 45 seconds more per draft, three platforms in 117 seconds against 25 to 50 seconds without the check, and roughly twice the input tokens, since the source is sent again. `WISDUM_DRAFT_REVIEW=false` skips it.
- **It is not a guarantee.** The checking model is the same kind of model. In the three trial runs it removed most invented claims, kept the front matter and did not damage supported text, but it did not always add a missing status (one run still never mentioned the hold) and once left a headline that echoed the discovery title. Authors still need to read a draft against their source before posting.
- **A draft whose check failed is saved unchecked, and only the log says so.** A flag on the draft would need a schema change and a place to show it.
- **Source fit is a separate matter.** A source that is a status log produces an accurate but dull "progress report" blog; the check makes drafts faithful, not interesting.
- **Still open:** discovery itself still invents titles and rationales without reading the source. Giving it an excerpt of each source would remove the cause rather than limiting its effect.
