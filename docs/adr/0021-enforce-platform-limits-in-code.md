# 0021 — Enforce platform limits in code, not by asking the model

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Founding maintainer
- **Builds on:** [ADR 0017](0017-source-grounded-content-generation.md), [ADR 0020](0020-nvidia-nim-as-an-ai-provider.md)

## Context

Until 2026-10-10 every draft in this project had been written by a stub, so the prompts had never met a real model. The first real runs (NVIDIA NIM, `nvidia/nemotron-3-super-120b-a12b`; the sources were a 4,386-character ADR and this repository's README) wrote four to six formats in 26 to 41 seconds, and the output showed what a stub cannot:

- **An X thread with posts far over 280 characters**, one about 1,200 (from the ADR), although the prompt said "every post must be 280 characters or fewer". Asking the model once more to shorten the long posts left two of them over the limit, and the request took 165 seconds instead of 26, because the model reasons before answering. Models are unreliable at counting characters, so a rule they can break needs a check outside the model.
- **Look-alike characters.** In the four drafts written from the README, 46 non-breaking hyphens (U+2011) and 3 narrow no-break spaces (U+202F), including inside a URL (`localhost:3000/sign‑up`), which does not work once pasted.
- **Invented or leftover content from the format itself.** The newsletter format asked for a "feedback poll", so the draft invited readers to a poll that does not exist, and for `read_time`, which it filled with a placeholder. A blog post had no format of its own, so it fell back on the generic one: a table of contents, a references section, and "this blog post summarizes ADR 0019". Its front matter was put in a code block, which would print literally. The title the model saw was the uploaded file's name, and it used it as the headline.

## Decision

**A platform's hard limit is enforced in code.** `fitThread` splits any X post over 280 characters between sentences (between words for a sentence longer than a post, and mid-word only for a word that is) and rewrites the numbers so they run in order. Nothing is reworded or added. A thread that already fits is saved exactly as the model wrote it, and the offline demo model's sample text is not touched. There is no second request, so this costs no time and cannot fail.

**Draft text is normalised to plain characters.** The non-breaking hyphens (U+2010, U+2011) become `-` and the narrow no-break space (U+202F) becomes a space. Ordinary dashes, quotes and other punctuation are left alone.

**Formats ask only for what the source can support.** The newsletter no longer asks for a poll, a read time, or a second list of subject lines; the closing is an invitation to reply or forward, with no polls or links the source does not contain. Blog posts get a format of their own, written to the author's readers and not about the source file. Front matter goes between `---` lines, never in a code block. The title is described to the model as a working label that may be a file name. X threads are asked for six to ten posts.

## Consequences

- An X thread can no longer be saved with a post that X would reject. A source with a long paragraph yields more, shorter posts than the model wrote, in its own words.
- Prompt wording changed from what is in ADR 0017; the grounding rules did not. Placeholders such as `[add detail]` are still used where the source is silent (for example, a podcast outline's guests), and are visible in the draft.
- **The checks are narrow on purpose.** Only the X limit is enforced; LinkedIn's 1,300-character target, a newsletter's length and similar are still requests to the model. Other limits that turn out to matter should be handled the same way, not by asking again.
- Quality on one model and two sources (an ADR and the README) is what has been looked at. Sources that are very long, in another language, or messy notes have not been tried.
