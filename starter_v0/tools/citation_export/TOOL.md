---
name: citation_export
track: bonus
kind: local_formatter
requires_env: []
inputs: [items, style, deduplicate]
outputs: [citations, citation_count, duplicates, skipped, invalid_urls, issues, trust_boundary]
side_effect: false
---
# citation_export

Exports already-collected source items as deterministic Markdown, APA-like, or
BibTeX citation text. It normalizes and deduplicates sources in memory and never
writes files.

Supported styles are `markdown`, `apa`, and `bibtex`. This formatter does not
fetch metadata, validate source credibility, or verify factual claims.
