---
name: compare_sources
track: bonus
kind: local_formatter
provider: deterministic_lexical_analysis
requires_env: []
inputs: [items, max_terms]
outputs: [source_count, shared_keywords, source_profiles, pairwise_similarity, warnings, trust_boundary]
side_effect: false
---
# compare_sources

Compares two or more already-collected source items using deterministic lexical
term overlap. It reports shared keywords, terms distinctive to each source, and
pairwise Jaccard similarity.

Each item may contain `title`, `summary`, `content` or `text`, plus optional
`source` and `url` metadata. The comparison does not retrieve new sources.

This tool measures surface-level word overlap only. It does not detect semantic
contradictions, establish source independence, or determine factual truth.
